import { recoverTypedDataAddress, getAddress } from 'viem';
import type { Offer } from '../api/types';

const CREATE_POSITION_TYPES = {
  CreatePosition: [
    { name: 'positionSeed', type: 'bytes16' },
    { name: 'user', type: 'address' },
    { name: 'marketId', type: 'bytes32' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'collateralUsdcUnits', type: 'uint256' },
    { name: 'leverageBps', type: 'uint32' },
    { name: 'notionalUsdcUnits', type: 'uint256' },
    { name: 'originationFeeBps', type: 'uint16' },
    { name: 'lifetimeFeeAprBps', type: 'uint16' },
    { name: 'liquidationFeeBps', type: 'uint16' },
    { name: 'signatureExpiry', type: 'uint256' },
  ],
} as const;

export async function recoverCreatePositionSigner(
  offer: Offer,
  userAddress: `0x${string}`,
): Promise<`0x${string}`> {
  return recoverTypedDataAddress({
    domain: {
      name: 'LeveragedPredictionVaultV1',
      version: '1',
      chainId: Number(offer.evmChainId),
      verifyingContract: offer.polygonVaultContractAddress as `0x${string}`,
    },
    types: CREATE_POSITION_TYPES,
    primaryType: 'CreatePosition',
    message: {
      positionSeed: offer.positionSeedHex as `0x${string}`,
      user: userAddress,
      marketId: offer.polymarketMarketId as `0x${string}`,
      tokenId: BigInt(offer.polymarketTokenId),
      collateralUsdcUnits: BigInt(offer.collateralUsdcUnits),
      leverageBps: offer.leverageBps,
      notionalUsdcUnits: BigInt(offer.notionalUsdcUnits),
      originationFeeBps: offer.originationFeeBps,
      lifetimeFeeAprBps: offer.lifetimeFeeAprBps,
      liquidationFeeBps: offer.liquidationFeeBps,
      signatureExpiry: BigInt(offer.signatureExpiry),
    },
    signature: offer.contractSignature as `0x${string}`,
  });
}

/**
 * The signer address we expect to have produced the offer signature. This
 * comes from `GET /contract-info` and is checksummed here.
 */
export function resolveExpectedSigner(
  apiSigner: string | undefined,
): `0x${string}` | undefined {
  return apiSigner ? getAddress(apiSigner) : undefined;
}
