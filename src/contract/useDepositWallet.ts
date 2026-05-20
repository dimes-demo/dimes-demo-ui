import { useMemo } from 'react';
import { concat, encodeAbiParameters, getCreate2Address, keccak256, pad, toHex } from 'viem';
import { useAccount, useChainId, useReadContract } from 'wagmi';

/** Polygon mainnet — the only chain the Polymarket deposit-wallet flow runs on. */
const POLYGON_MAINNET_CHAIN_ID = 137;

/**
 * Polymarket deposit-wallet factory + implementation on Polygon mainnet (chain 137).
 * The factory has no `getWallet` view — a deposit wallet's address is computed
 * deterministically via CREATE2 from the owner address.
 */
const DEPOSIT_WALLET_FACTORY = '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07' as const;
const DEPOSIT_WALLET_IMPLEMENTATION = '0x58CA52ebe0DadfdF531Cde7062e76746de4Db1eB' as const;

// Byte constants from Solady v0.1.26 `LibClone.initCodeHashERC1967` — the minimal
// ERC-1967 proxy bytecode the factory clones for each deposit wallet.
const ERC1967_CONST1 = '0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3';
const ERC1967_CONST2 = '0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076';
const ERC1967_PREFIX = 0x61003d3d8160233d3973n;
const ERC1967_ARG_LEN_SHIFT = 56n;

const ownerAbi = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

/** Replicates Solady `LibClone.initCodeHashERC1967(implementation, args)`. */
function initCodeHashErc1967(implementation: `0x${string}`, args: `0x${string}`): `0x${string}` {
  const argByteLength = BigInt((args.length - 2) / 2);
  const combined = ERC1967_PREFIX + (argByteLength << ERC1967_ARG_LEN_SHIFT);
  return keccak256(
    concat([toHex(combined, { size: 10 }), implementation, '0x6009', ERC1967_CONST2, ERC1967_CONST1, args]),
  );
}

/**
 * Compute the deterministic Polymarket deposit-wallet address for an owner.
 * `walletId` is `bytes32(owner)` — the 20-byte address left-padded to 32 bytes.
 */
function deriveDepositWalletAddress(owner: `0x${string}`): `0x${string}` {
  const walletId = pad(owner, { dir: 'left', size: 32 });
  const args = encodeAbiParameters(
    [{ type: 'address' }, { type: 'bytes32' }],
    [DEPOSIT_WALLET_FACTORY, walletId],
  );
  const salt = keccak256(args);
  const bytecodeHash = initCodeHashErc1967(DEPOSIT_WALLET_IMPLEMENTATION, args);
  return getCreate2Address({ from: DEPOSIT_WALLET_FACTORY, salt, bytecodeHash });
}

interface DepositWalletInfo {
  /** True when a deposit wallet is deployed and owned by the connected wallet. */
  available: boolean;
  /** The deterministic deposit wallet address (set whenever a wallet is connected). */
  address: `0x${string}` | undefined;
  isLoading: boolean;
  /** True only on Polygon mainnet — the deposit-wallet flow runs nowhere else. */
  chainSupported: boolean;
}

/**
 * Resolve the Polymarket deposit wallet for the connected (owner) wallet.
 *
 * The address is derived deterministically (CREATE2), then `owner()` is read on
 * it: a successful read returning the connected wallet confirms the deposit
 * wallet is both deployed and owned by this wallet.
 */
export function useDepositWallet(): DepositWalletInfo {
  const { address } = useAccount();
  const chainId = useChainId();
  const chainSupported = chainId === POLYGON_MAINNET_CHAIN_ID;

  const derivedAddress = useMemo(
    () => (address ? deriveDepositWalletAddress(address) : undefined),
    [address],
  );

  const { data: onChainOwner, isLoading } = useReadContract({
    address: derivedAddress,
    abi: ownerAbi,
    functionName: 'owner',
    query: { enabled: !!derivedAddress && chainSupported },
  });

  const available =
    chainSupported &&
    !!onChainOwner &&
    !!address &&
    onChainOwner.toLowerCase() === address.toLowerCase();

  return {
    available,
    address: derivedAddress,
    isLoading,
    chainSupported,
  };
}
