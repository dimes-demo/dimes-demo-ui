import { useState } from 'react'
import { Layout } from './components/Layout'
import { CardShell } from './components/CardShell'
import { HealthRing } from './components/HealthRing'
import { LeverageSlider } from './components/LeverageSlider'
import { MarketCard } from './components/MarketCard'
import { PositionCard } from './components/PositionCard'
import { SettledCard } from './components/SettledCard'
import { QuoteDetails } from './components/QuoteDetails'
import type { Market, Offer, OpenPosition, ClosedPosition } from './api/types'

const mockMarket: Market = {
  id: 'dm_mkt_1',
  ticker: 'BTC-100K-JUN',
  title: 'Will Bitcoin reach $100k by June 2026?',
  yesSubTitle: null,
  category: 'crypto',
  status: 'open',
  provider: 'polymarket',
  acceptingNewPositions: true,
  rejectionReasonCode: null,
  closeTime: '2026-06-30T00:00:00Z',
  latestEnterAt: '2026-06-29T00:00:00Z',
  tags: ['crypto'],
  minNotionalUsd: '5.00',
  minNotionalUsdPips: '50000',
  leverage: { minBps: 10000, maxYesBps: 50000, maxNoBps: 50000, stepBps: 5000 },
  fees: {
    lifetimeAprBps: 500,
    liquidationBps: 200,
    originationTiers: [{ feeBps: 100, maxLeverageBps: 50000 }],
  },
}

const mockMarket2: Market = {
  ...mockMarket,
  id: 'dm_mkt_2',
  ticker: 'ETH-MERGE-V2',
  title: 'Will Ethereum implement sharding by Q4?',
  category: 'crypto',
  status: 'open',
  leverage: { minBps: 10000, maxYesBps: 80000, maxNoBps: 60000, stepBps: 10000 },
}

const mockMarket3: Market = {
  ...mockMarket,
  id: 'dm_mkt_3',
  ticker: 'US-ELECTION-2028',
  title: 'Will the Democratic candidate win the 2028 US Presidential Election?',
  category: 'politics',
  status: 'open',
  leverage: { minBps: 10000, maxYesBps: 100000, maxNoBps: 100000, stepBps: 10000 },
}

const mockOffer: Offer = {
  id: 'dm_off_1',
  authorityPublicKey: '0x1234',
  collateralUsdcUnits: '10000000',
  contractSignature: '0xabc',
  currentLiquidationPriceUsd: '0.18',
  currentLiquidationPriceUsdPips: '1800',
  effectiveSide: 'yes',
  entryPriceUsd: '0.33',
  entryPriceUsdPips: '3300',
  evmChainId: '137',
  expectedOpenTradingFeeUsd: '0.02',
  expectedOpenTradingFeeUsdPips: '200',
  expiresAt: new Date(Date.now() + 300000).toISOString(),
  leverageBps: 50000,
  lifetimeFeeAprBps: 500,
  liquidationFeeBps: 200,
  marketTicker: 'BTC-100K-JUN',
  minExpectedPositionTokenUnits: '9900000',
  notionalAmountUsd: '50.00',
  notionalAmountUsdPips: '500000',
  notionalUsdcUnits: '50000000',
  originationFeeBps: 125,
  originationFeeUsd: '0.63',
  originationFeeUsdPips: '6250',
  originationFeeUsdcUnits: '625000',
  partnerOriginationFeeBps: 25,
  partnerOriginationFeeUsd: '0.13',
  partnerOriginationFeeUsdPips: '1250',
  partnerOriginationFeeUsdcUnits: '125000',
  polygonVaultContractAddress: '0xvault',
  polymarketMarketId: '0xmarket',
  polymarketTokenId: '123456',
  polymarketTradingFeeBps: 100,
  positionSeed: 'seed1',
  positionSeedHex: '0xseed1',
  onChainPositionKey: '0xkey1',
  protocolOriginationFeeBps: 100,
  protocolOriginationFeeUsd: '0.50',
  protocolOriginationFeeUsdPips: '5000',
  protocolOriginationFeeUsdcUnits: '500000',
  provider: 'polymarket',
  signatureExpiry: '9999999999',
  slippageBps: 200,
  totalUserAmountUsd: '10.50',
  totalUserAmountUsdPips: '105000',
  totalUserAmountUsdcUnits: '10500000',
}

const mockOpenPosition: OpenPosition = {
  id: 'dm_pos_1',
  marketTicker: 'BTC-100K-JUN',
  side: 'yes',
  status: 'open',
  walletAddress: '0xuser',
  onChainPositionKey: '0xkey1',
  provider: 'polymarket',
  effectiveLeverageBps: 42000,
  entry: {
    collateralUsd: '10.00',
    collateralUsdPips: '100000',
    leverageBps: 50000,
    notionalUsd: '50.00',
    notionalUsdPips: '500000',
    openedAt: '2026-03-20T10:00:00Z',
    originationFeeBps: 100,
    originationFeeUsd: '0.50',
    originationFeeUsdPips: '5000',
    priceUsd: '0.33',
    priceUsdPips: '3300',
    effectiveEntryPriceUsd: '0.3317',
    effectiveEntryPriceUsdPips: '3317',
    effectiveSlippageBps: 51,
  },
  current: {
    collateralUsd: '10.00',
    collateralUsdPips: '100000',
    effectiveCollateralUsd: '9.50',
    effectiveCollateralUsdPips: '95000',
    leverageBps: 42000,
    markPriceUsd: '0.38',
    markPriceUsdPips: '3800',
    notionalUsd: '57.58',
    notionalUsdPips: '575800',
    positionTokenUnits: '151515151',
    positionValueUsd: '17.58',
    positionValueUsdPips: '175800',
    unrealizedPnlBps: 1720,
    unrealizedPnlUsd: '7.58',
    unrealizedPnlUsdPips: '75800',
  },
  risk: {
    currentLiquidationPriceUsd: '0.22',
    currentLiquidationPriceUsdPips: '2200',
    healthBps: 7400,
    liquidationBufferBps: 4200,
    liquidationFeeBps: 200,
    marginBufferUsd: '8.50',
    marginBufferUsdPips: '85000',
  },
  fees: {
    accruedLifetimeFeeUsd: '0.12',
    accruedLifetimeFeeUsdPips: '1200',
    lifetimeAprBps: 500,
    pendingLifetimeFeeUsd: '0.01',
    pendingLifetimeFeeUsdPips: '100',
  },
  timing: {
    marketCloseTime: '2026-06-30T00:00:00Z',
    marketStatus: 'active',
    timeToCloseMinutes: 138240,
  },
}

const mockUnwindingPosition: OpenPosition = {
  ...mockOpenPosition,
  id: 'dm_pos_unwind',
  status: 'unwinding',
  current: {
    ...mockOpenPosition.current,
    leverageBps: 48000,
    unrealizedPnlUsd: '-2.10',
    unrealizedPnlBps: -420,
    positionValueUsd: '7.90',
    positionValueUsdPips: '79000',
  },
}

const mockClosedPosition: ClosedPosition = {
  id: 'dm_pos_2',
  marketTicker: 'ETH-MERGE-V2',
  side: 'no',
  status: 'settled',
  walletAddress: '0xuser',
  onChainPositionKey: '0xkey2',
  provider: 'polymarket',
  effectiveLeverageBps: 35000,
  entry: {
    collateralUsd: '25.00',
    collateralUsdPips: '250000',
    leverageBps: 40000,
    notionalUsd: '100.00',
    notionalUsdPips: '1000000',
    openedAt: '2026-03-10T10:00:00Z',
    originationFeeBps: 100,
    originationFeeUsd: '1.00',
    originationFeeUsdPips: '10000',
    priceUsd: '0.52',
    priceUsdPips: '5200',
    effectiveEntryPriceUsd: '0.5189',
    effectiveEntryPriceUsdPips: '5189',
    effectiveSlippageBps: -21,
  },
  closeReason: 'settled',
  fees: {
    lifetimeAprBps: 500,
    originationFeeBps: 100,
    originationFeeUsd: '1.00',
    originationFeeUsdPips: '10000',
    totalFeesUsd: '3.87',
    totalFeesUsdPips: '38700',
    totalLifetimeFeeUsd: '2.87',
    totalLifetimeFeeUsdPips: '28700',
  },
  result: {
    closedAt: '2026-03-24T14:00:00Z',
    collectedLifetimeFeeUsd: '2.87',
    collectedLifetimeFeeUsdPips: '28700',
    collectedLiquidationFeeUsd: '0.00',
    collectedLiquidationFeeUsdPips: '0',
    proceedsUsd: '89.72',
    proceedsUsdPips: '897200',
    realizedPnlUsd: '64.72',
    realizedPnlUsdPips: '647200',
  },
}

export default function Preview() {
  const [leverageBps, setLeverageBps] = useState(30000)

  return (
    <Layout>
      <div style={{ padding: '20px 0' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#EEFF00', marginBottom: 8 }}>
          DIMES UI Preview
        </h1>
        <p style={{ color: '#555', fontSize: 12, marginBottom: 32 }}>
          Component showcase with mock data
        </p>

        {/* Markets Grid */}
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8', marginBottom: 12 }}>Markets</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 40 }}>
          <MarketCard market={mockMarket} onSelect={() => {}} />
          <MarketCard market={mockMarket2} onSelect={() => {}} />
          <MarketCard market={mockMarket3} onSelect={() => {}} />
        </div>

        {/* Leverage Slider */}
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8', marginBottom: 12 }}>Leverage Slider</h2>
        <div style={{ maxWidth: 420, marginBottom: 40 }}>
          <CardShell>
            <LeverageSlider min={10000} max={100000} step={10000} value={leverageBps} onChange={setLeverageBps} />
          </CardShell>
        </div>

        {/* Quote Details */}
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8', marginBottom: 12 }}>Quote Details</h2>
        <div style={{ maxWidth: 420, marginBottom: 40 }}>
          <CardShell>
            <QuoteDetails offer={mockOffer} />
          </CardShell>
        </div>

        {/* Active Position */}
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8', marginBottom: 12 }}>Active Position</h2>
        <div style={{ maxWidth: 480, marginBottom: 40 }}>
          <PositionCard position={mockOpenPosition} />
        </div>

        {/* Unwinding Position */}
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8', marginBottom: 12 }}>Unwinding Position</h2>
        <div style={{ maxWidth: 480, marginBottom: 40 }}>
          <PositionCard position={mockUnwindingPosition} />
        </div>

        {/* Settled Position */}
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8', marginBottom: 12 }}>Settled Position</h2>
        <div style={{ maxWidth: 480, marginBottom: 40 }}>
          <SettledCard position={mockClosedPosition} />
        </div>

        {/* Health Rings */}
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8', marginBottom: 12 }}>Health Rings</h2>
        <div style={{ display: 'flex', gap: 24, marginBottom: 40 }}>
          <div style={{ textAlign: 'center' }}>
            <HealthRing healthBps={8500} />
            <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>Healthy (85%)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <HealthRing healthBps={3500} />
            <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>Caution (35%)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <HealthRing healthBps={1500} />
            <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>Danger (15%)</div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
