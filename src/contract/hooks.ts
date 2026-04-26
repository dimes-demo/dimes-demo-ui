import { useState } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  usePublicClient,
  useAccount,
  useChainId,
} from 'wagmi';
import { parseGwei, getAddress } from 'viem';
import { vaultAbi, erc20Abi } from './abi';
import {
  recoverCreatePositionSigner,
  resolveExpectedSigner,
} from './verifySignature';
import { useContractInfo } from '../hooks/useContractInfo';
import type { Offer } from '../api/types';

const POLYGON_AMOY_CHAIN_ID = 80002;

// Wallet gas estimation on Polygon Amoy is unreliable — it frequently
// underestimates and causes replaced/dropped transactions. We override with
// generous explicit values on testnet only; on mainnet we let the wallet estimate.
const AMOY_GAS_OVERRIDES = {
  gas: 500_000n,
  maxPriorityFeePerGas: parseGwei('30'),
  maxFeePerGas: parseGwei('50'),
} as const;

function useGasOverrides() {
  const chainId = useChainId();
  return chainId === POLYGON_AMOY_CHAIN_ID ? AMOY_GAS_OVERRIDES : {};
}

export const USDC_ADDRESS = ((import.meta.env.VITE_USDC_ADDRESS as string | undefined) ??
  '0xD477EDbe627E94639d7E92119Ca62a461c6ce555') as `0x${string}`;

export function useApproveUsdc() {
  const { writeContract, data: hash, isPending, error, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  });
  const publicClient = usePublicClient();
  const { address: account } = useAccount();
  const gasOverrides = useGasOverrides();
  const [simulateError, setSimulateError] = useState<unknown>(null);

  const reset = () => {
    setSimulateError(null);
    resetWrite();
  };

  const approve = async (vaultAddress: string, amount: bigint) => {
    setSimulateError(null);
    const params = {
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve' as const,
      args: [vaultAddress as `0x${string}`, amount] as const,
    };

    try {
      await publicClient!.simulateContract({ ...params, account });
    } catch (e) {
      setSimulateError(e);
      return;
    }

    writeContract({ ...params, ...gasOverrides });
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error, receiptError, simulateError, reset };
}

export function useCheckAllowance(
  owner: `0x${string}` | undefined,
  vaultAddress: `0x${string}` | undefined,
) {
  const { data: allowance, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner && vaultAddress ? [owner, vaultAddress] : undefined,
    query: { enabled: !!owner && !!vaultAddress },
  });

  return { allowance: allowance as bigint | undefined, refetch };
}

export function useCreatePosition() {
  const { writeContract, data: hash, isPending, error, reset: resetWrite } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();
  const { address: account } = useAccount();
  const { data: contractInfo } = useContractInfo();
  const gasOverrides = useGasOverrides();
  const [verifyError, setVerifyError] = useState<unknown>(null);

  const reset = () => {
    setVerifyError(null);
    resetWrite();
  };

  const create = async (offer: Offer) => {
    setVerifyError(null);

    if (!account) {
      setVerifyError(new Error('Wallet not connected.'));
      return;
    }

    const expectedSigner = resolveExpectedSigner(contractInfo?.polygonSignerAddress);
    if (!expectedSigner) {
      setVerifyError(new Error('Unable to verify offer: no signer address from /contract-info.'));
      return;
    }

    let recoveredSigner: `0x${string}`;
    try {
      recoveredSigner = await recoverCreatePositionSigner(offer, account);
    } catch {
      setVerifyError(new Error('Failed to recover signer from offer signature.'));
      return;
    }

    if (getAddress(recoveredSigner) !== expectedSigner) {
      setVerifyError(
        new Error(
          `Offer signature mismatch. Expected ${expectedSigner}, recovered ${getAddress(recoveredSigner)}.`,
        ),
      );
      return;
    }

    const params = {
      address: offer.polygonVaultContractAddress as `0x${string}`,
      abi: vaultAbi,
      functionName: 'createPosition' as const,
      args: [
        offer.positionSeedHex as `0x${string}`,
        offer.polymarketMarketId as `0x${string}`,
        BigInt(offer.polymarketTokenId),
        BigInt(offer.collateralUsdcUnits),
        offer.leverageBps,
        BigInt(offer.notionalUsdcUnits),
        offer.originationFeeBps,
        offer.lifetimeFeeAprBps,
        offer.liquidationFeeBps,
        offer.contractSignature as `0x${string}`,
        BigInt(offer.signatureExpiry),
      ] as const,
    };

    try {
      await publicClient!.simulateContract({ ...params, account });
    } catch (e) {
      setVerifyError(e);
      return;
    }

    writeContract({ ...params, ...gasOverrides });
  };

  return {
    create,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    isReceiptError,
    receiptError,
    error,
    verifyError,
    reset,
  };
}

export function useRequestClose() {
  const { writeContract, data: hash, isPending, error, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  });
  const publicClient = usePublicClient();
  const { address: account } = useAccount();
  const gasOverrides = useGasOverrides();
  const [simulateError, setSimulateError] = useState<unknown>(null);

  const reset = () => {
    setSimulateError(null);
    resetWrite();
  };

  const requestClose = async (vaultAddress: string, positionKey: string) => {
    setSimulateError(null);
    const params = {
      address: vaultAddress as `0x${string}`,
      abi: vaultAbi,
      functionName: 'requestClose' as const,
      args: [positionKey as `0x${string}`] as const,
    };

    try {
      await publicClient!.simulateContract({ ...params, account });
    } catch (e) {
      setSimulateError(e);
      return;
    }

    writeContract({ ...params, ...gasOverrides });
  };

  return { requestClose, hash, isPending, isConfirming, isSuccess, error, receiptError, simulateError, reset };
}
