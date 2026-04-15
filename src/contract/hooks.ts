import { useState } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  usePublicClient,
  useAccount,
} from 'wagmi';
import { parseGwei, getAddress } from 'viem';
import { vaultAbi, erc20Abi } from './abi';
import {
  recoverCreatePositionSigner,
  resolveExpectedSigner,
} from './verifySignature';
import { useContractInfo } from '../hooks/useContractInfo';
import type { Offer } from '../api/types';

// Wallet gas estimation on Polygon Amoy is unreliable — it frequently
// underestimates and causes replaced/dropped transactions. We override with
// generous explicit values to keep the demo flow reliable; production apps
// should let the wallet estimate.
const POLYGON_GAS_OVERRIDES = {
  gas: 500_000n,
  maxPriorityFeePerGas: parseGwei('30'),
  maxFeePerGas: parseGwei('50'),
} as const;

const isTestnet = Number(import.meta.env.VITE_CHAIN_ID) === 80002;
const USDC_ADDRESS = (
  isTestnet
    ? '0x5fb7b0527851267c1ab138cac8dbcd224b411135' // Mock USDC on Polygon Amoy
    : '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' // USDC on Polygon mainnet
) as `0x${string}`;

export function useApproveUsdc() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const publicClient = usePublicClient();
  const { address: account } = useAccount();
  const [simulateError, setSimulateError] = useState<string | null>(null);

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
      setSimulateError(
        e instanceof Error ? e.message : 'USDC approval simulation failed.',
      );
      return;
    }

    writeContract({ ...params, ...POLYGON_GAS_OVERRIDES });
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error, simulateError };
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
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const publicClient = usePublicClient();
  const { address: account } = useAccount();
  const { data: contractInfo } = useContractInfo();
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const reset = () => {
    setVerifyError(null);
    resetWrite();
  };

  const create = async (offer: Offer) => {
    setVerifyError(null);

    if (!account) {
      setVerifyError('Wallet not connected.');
      return;
    }

    const expectedSigner = resolveExpectedSigner(contractInfo?.polygonSignerAddress);
    if (!expectedSigner) {
      setVerifyError('Unable to verify offer: no signer address from /contract-info.');
      return;
    }

    let recoveredSigner: `0x${string}`;
    try {
      recoveredSigner = await recoverCreatePositionSigner(offer, account);
    } catch {
      setVerifyError('Failed to recover signer from offer signature.');
      return;
    }

    if (getAddress(recoveredSigner) !== expectedSigner) {
      setVerifyError(
        `Offer signature mismatch. Expected ${expectedSigner}, recovered ${getAddress(recoveredSigner)}.`,
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
      setVerifyError(
        e instanceof Error ? e.message : 'createPosition simulation failed.',
      );
      return;
    }

    writeContract({ ...params, ...POLYGON_GAS_OVERRIDES });
  };

  return { create, hash, isPending, isConfirming, isSuccess, error, verifyError, reset };
}

export function useRequestClose() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const requestClose = (vaultAddress: string, positionKey: string) => {
    writeContract({
      address: vaultAddress as `0x${string}`,
      abi: vaultAbi,
      functionName: 'requestClose',
      args: [positionKey as `0x${string}`],
      ...POLYGON_GAS_OVERRIDES,
    });
  };

  return { requestClose, hash, isPending, isConfirming, isSuccess, error };
}
