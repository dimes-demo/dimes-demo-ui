import { useState } from 'react';
import { useAccount, usePublicClient, useSignTypedData } from 'wagmi';
import {
  buildDepositWalletBatch,
  buildPushFundedCreateCalls,
  buildRequestCloseCalls,
  getDepositWalletBatchTypedData,
  type DepositWalletCall,
} from '@dimes-dot-fi/sdk/contract';
import { submitRelayerBatch } from '../api/relayer';
import { useContractInfo } from '../hooks/useContractInfo';
import { useAuthStore } from '../store/auth';
import type { Offer } from '../api/types';
import { USDC_ADDRESS } from './hooks';
import { recoverCreatePositionSigner, resolveExpectedSigner } from './verifySignature';

// The deposit-wallet batch must be submitted before this deadline (unix seconds).
const BATCH_DEADLINE_WINDOW_SECONDS = 600n;

const depositWalletNonceAbi = [
  {
    type: 'function',
    name: 'nonce',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

interface PushFundedState {
  /** Waiting on the wallet to sign the batch. */
  isPending: boolean;
  /** Batch signed and submitted — waiting for the relayer to mine it. */
  isConfirming: boolean;
  isSuccess: boolean;
  /** Pre-flight failure (no deposit wallet, signature mismatch). */
  verifyError: Error | null;
  /** Wallet rejected or failed to sign. */
  error: Error | null;
  /** Relayer submission or on-chain failure. */
  receiptError: Error | null;
  transactionHash: string | null;
}

const initialState: PushFundedState = {
  isPending: false,
  isConfirming: false,
  isSuccess: false,
  verifyError: null,
  error: null,
  receiptError: null,
  transactionHash: null,
};

function toRelayerCalls(calls: DepositWalletCall[]) {
  return calls.map((call) => ({
    target: call.target,
    value: call.value.toString(),
    data: call.data,
  }));
}

function toError(value: unknown, fallback: string): Error {
  return value instanceof Error ? value : new Error(fallback);
}

/**
 * Shared runner for the deposit-wallet push-funded flow: read the wallet nonce,
 * assemble + sign the EIP-712 batch with the connected owner wallet, then send
 * the signed batch to the backend relayer endpoint.
 */
function usePushFundedBatch() {
  const [state, setState] = useState<PushFundedState>(initialState);
  const { address: ownerAddress } = useAccount();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } = useSignTypedData();
  const depositWalletAddress = useAuthStore((s) => s.depositWalletAddress);

  const reset = () => setState(initialState);

  const run = async (buildCalls: () => DepositWalletCall[]): Promise<void> => {
    setState(initialState);

    if (!depositWalletAddress) {
      setState({ ...initialState, verifyError: new Error('Deposit-wallet mode is not enabled.') });
      return;
    }
    if (!ownerAddress) {
      setState({ ...initialState, verifyError: new Error('Wallet not connected.') });
      return;
    }
    if (!publicClient) {
      setState({ ...initialState, verifyError: new Error('No RPC client available.') });
      return;
    }

    const depositWallet = depositWalletAddress as `0x${string}`;

    let calls: DepositWalletCall[];
    let nonce: bigint;
    try {
      calls = buildCalls();
      nonce = await publicClient.readContract({
        address: depositWallet,
        abi: depositWalletNonceAbi,
        functionName: 'nonce',
      });
    } catch (e) {
      setState({ ...initialState, verifyError: toError(e, 'Failed to prepare the deposit-wallet batch.') });
      return;
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000)) + BATCH_DEADLINE_WINDOW_SECONDS;
    const batch = buildDepositWalletBatch({ depositWalletAddress: depositWallet, nonce, deadline, calls });

    setState({ ...initialState, isPending: true });

    let signature: `0x${string}`;
    try {
      const typedData = getDepositWalletBatchTypedData(batch);
      signature = await signTypedDataAsync({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });
    } catch (e) {
      setState({ ...initialState, error: toError(e, 'Failed to sign the batch.') });
      return;
    }

    setState({ ...initialState, isConfirming: true });

    try {
      const result = await submitRelayerBatch({
        depositWalletAddress: depositWallet,
        nonce: nonce.toString(),
        deadline: deadline.toString(),
        calls: toRelayerCalls(calls),
        signature,
      });
      setState({ ...initialState, isSuccess: true, transactionHash: result.transactionHash });
    } catch (e) {
      setState({ ...initialState, receiptError: toError(e, 'Relayer submission failed.') });
    }
  };

  return { state, reset, run };
}

/**
 * Open a position from a Polymarket deposit wallet via the push-funded 3-call
 * batch (reserveDeposit + USDC.transfer + createPositionPushFunded).
 */
export function useCreatePositionPushFunded() {
  const { state, reset, run } = usePushFundedBatch();
  const { address: ownerAddress } = useAccount();
  const { data: contractInfo } = useContractInfo();
  const depositWalletAddress = useAuthStore((s) => s.depositWalletAddress);
  const [verifyError, setVerifyError] = useState<Error | null>(null);

  const create = async (offer: Offer): Promise<void> => {
    setVerifyError(null);

    if (!ownerAddress || !depositWalletAddress) {
      setVerifyError(new Error('Connect a wallet and enable deposit-wallet mode first.'));
      return;
    }

    // The offer signature binds to the deposit wallet (the on-chain msg.sender).
    const expectedSigner = resolveExpectedSigner(contractInfo?.polygonSignerAddress);
    if (!expectedSigner) {
      setVerifyError(new Error('Unable to verify offer: no signer address from /contract-info.'));
      return;
    }
    try {
      const recovered = await recoverCreatePositionSigner(offer, depositWalletAddress as `0x${string}`);
      if (recovered.toLowerCase() !== expectedSigner.toLowerCase()) {
        setVerifyError(new Error(`Offer signature mismatch. Expected ${expectedSigner}.`));
        return;
      }
    } catch {
      setVerifyError(new Error('Failed to recover signer from offer signature.'));
      return;
    }

    await run(() => buildPushFundedCreateCalls(offer, USDC_ADDRESS));
  };

  return {
    create,
    isPending: state.isPending,
    isConfirming: state.isConfirming,
    isSuccess: state.isSuccess,
    transactionHash: state.transactionHash,
    verifyError: verifyError ?? state.verifyError,
    error: state.error,
    receiptError: state.receiptError,
    reset: () => {
      setVerifyError(null);
      reset();
    },
  };
}

/**
 * Close a position from a Polymarket deposit wallet — a single-call
 * `requestClose` wrapped in the same deposit-wallet batch.
 */
export function useRequestClosePushFunded() {
  const { state, reset, run } = usePushFundedBatch();

  const requestClose = async (vaultAddress: string, positionKey: string): Promise<void> => {
    await run(() => buildRequestCloseCalls(vaultAddress, positionKey));
  };

  return {
    requestClose,
    isPending: state.isPending,
    isConfirming: state.isConfirming,
    isSuccess: state.isSuccess,
    transactionHash: state.transactionHash,
    verifyError: state.verifyError,
    error: state.error,
    receiptError: state.receiptError,
    reset,
  };
}
