// ── Market types ──

export interface MarketLeverage {
  minBps: number;
  maxBps?: number;
  maxYesBps: number;
  maxNoBps: number;
  stepBps: number;
}

export function leverageMaxBps(lev: MarketLeverage, side: 'yes' | 'no'): number {
  const perSide = side === 'yes' ? lev.maxYesBps : lev.maxNoBps
  return perSide ?? lev.maxBps ?? lev.minBps
}

export interface OriginationTier {
  feeBps: number;
  maxLeverageBps: number;
}

export interface MarketFees {
  lifetimeAprBps: number;
  liquidationBps: number;
  originationTiers: OriginationTier[];
}

export interface Market {
  id: string;
  ticker: string;
  title: string | null;
  yesSubTitle: string | null;
  category: string;
  status: string;
  provider: string;
  acceptingNewPositions: boolean;
  rejectionReasonCode: string | null;
  closeTime: string | null;
  latestEnterAt: string | null;
  tags: string[];
  minNotionalUsd: string;
  minNotionalUsdPips: string;
  maxNotionalYesUsdPips: string | null;
  maxNotionalYesUsd: string | null;
  maxNotionalNoUsdPips: string | null;
  maxNotionalNoUsd: string | null;
  leverage: MarketLeverage;
  fees: MarketFees;
}

// ── Offer types ──

export interface Offer {
  id: string;
  authorityPublicKey: string;
  collateralUsdcUnits: string;
  contractSignature: string;
  currentLiquidationPriceUsd: string;
  currentLiquidationPriceUsdPips: string;
  effectiveSide: string;
  entryPriceUsd: string;
  entryPriceUsdPips: string;
  evmChainId: string;
  expectedOpenTradingFeeUsd: string;
  expectedOpenTradingFeeUsdPips: string;
  expiresAt: string;
  leverageBps: number;
  lifetimeFeeAprBps: number;
  liquidationFeeBps: number;
  marketTicker: string;
  minExpectedPositionTokenUnits: string;
  notionalAmountUsd: string;
  notionalAmountUsdPips: string;
  notionalUsdcUnits: string;
  originationFeeBps: number;
  originationFeeUsd: string;
  originationFeeUsdPips: string;
  originationFeeUsdcUnits: string;
  partnerOriginationFeeBps: number;
  partnerOriginationFeeUsd: string;
  partnerOriginationFeeUsdPips: string;
  partnerOriginationFeeUsdcUnits: string;
  polygonVaultContractAddress: string;
  polymarketMarketId: string;
  polymarketTokenId: string;
  polymarketTradingFeeBps: number;
  positionSeed: string;
  positionSeedHex: string;
  onChainPositionKey: string;
  protocolOriginationFeeBps: number;
  protocolOriginationFeeUsd: string;
  protocolOriginationFeeUsdPips: string;
  protocolOriginationFeeUsdcUnits: string;
  provider: string;
  signatureExpiry: string;
  slippageBps: number;
  totalUserAmountUsd: string;
  totalUserAmountUsdPips: string;
  totalUserAmountUsdcUnits: string;
}

export interface CreateOfferParams {
  marketTicker: string;
  effectiveSide: string;
  leverageBps: number;
  notionalAmountUsdPips: string;
  slippageBps: number;
}

// ── Position types (matches actual API DTOs) ──

export interface PositionEntry {
  collateralUsd: string;
  collateralUsdPips: string;
  leverageBps: number;
  notionalUsd: string;
  notionalUsdPips: string;
  openedAt: string | null;
  originationFeeBps: number;
  originationFeeUsd: string;
  originationFeeUsdPips: string;
  priceUsd: string;
  priceUsdPips: string;
  effectiveEntryPriceUsd: string | null;
  effectiveEntryPriceUsdPips: string | null;
  effectiveSlippageBps: number | null;
}

export interface PositionCurrent {
  collateralUsd: string;
  collateralUsdPips: string;
  effectiveCollateralUsd: string;
  effectiveCollateralUsdPips: string;
  leverageBps: number;
  markPriceUsd: string;
  markPriceUsdPips: string;
  notionalUsd: string;
  notionalUsdPips: string;
  positionTokenUnits: string;
  positionValueUsd: string;
  positionValueUsdPips: string;
  unrealizedPnlBps: number;
  unrealizedPnlUsd: string;
  unrealizedPnlUsdPips: string;
}

export interface PositionRisk {
  currentLiquidationPriceUsd: string;
  currentLiquidationPriceUsdPips: string;
  healthBps: number;
  liquidationBufferBps: number;
  liquidationFeeBps: number;
  marginBufferUsd: string;
  marginBufferUsdPips: string;
}

export interface PositionOpenFees {
  accruedLifetimeFeeUsd: string;
  accruedLifetimeFeeUsdPips: string;
  lifetimeAprBps: number;
  pendingLifetimeFeeUsd: string;
  pendingLifetimeFeeUsdPips: string;
}

export interface PositionTiming {
  marketCloseTime: string | null;
  marketStatus: string;
  timeToCloseMinutes: number | null;
  isVoided: boolean;
  isSettlementPending: boolean;
}

export interface PositionResult {
  closedAt: string;
  collectedLifetimeFeeUsd: string;
  collectedLifetimeFeeUsdPips: string;
  collectedLiquidationFeeUsd: string;
  collectedLiquidationFeeUsdPips: string;
  proceedsUsd: string;
  proceedsUsdPips: string;
  realizedPnlUsd: string;
  realizedPnlUsdPips: string;
}

export interface PositionClosedFees {
  lifetimeAprBps: number;
  originationFeeBps: number;
  originationFeeUsd: string;
  originationFeeUsdPips: string;
  totalFeesUsd: string;
  totalFeesUsdPips: string;
  totalLifetimeFeeUsd: string;
  totalLifetimeFeeUsdPips: string;
}

export interface PositionBase {
  id: string;
  marketTicker: string;
  side: string;
  status: string;
  walletAddress: string;
  onChainPositionKey: string;
  provider: string;
  effectiveLeverageBps: number;
  entry: PositionEntry;
  unwinds?: PositionUnwindList;
}

export interface OpenPosition extends PositionBase {
  current: PositionCurrent;
  risk: PositionRisk;
  fees: PositionOpenFees;
  timing: PositionTiming;
}

export interface PositionFailure {
  reason: string;
}

export interface ClosedPosition extends PositionBase {
  closeReason: string;
  failure?: PositionFailure | null;
  fees: PositionClosedFees;
  result: PositionResult;
}

export type Position = OpenPosition | ClosedPosition;

export function isOpenPosition(p: Position): p is OpenPosition {
  return 'current' in p;
}

export function isClosedPosition(p: Position): p is ClosedPosition {
  return 'result' in p;
}

// ── Unwind types ──

export interface PositionUnwind {
  beforeLeverageBps: number;
  afterLeverageBps: number;
  executedAt: string;
}

export interface PositionUnwindList {
  data: PositionUnwind[];
  hasMore: boolean;
  originationLeverageBps: number;
  currentLeverageBps: number;
  originatedAt: string | null;
}

// ── Contract info ──

export interface ContractInfo {
  evmChainId: string;
  polygonSignerAddress: string;
  polygonVaultContractAddress: string;
}
