import { useState, useEffect } from 'react'
import type { Offer } from '../api/types'
import { StatRow } from './StatRow'

export function QuoteDetails({ offer }: { offer: Offer }) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((new Date(offer.expiresAt).getTime() - Date.now()) / 1000))
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((new Date(offer.expiresAt).getTime() - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [offer.expiresAt])

  return (
    <div style={{ padding: '12px 0' }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: 12,
        }}
      >
        Quote Details
      </div>

      <StatRow label="Side" value={offer.effectiveSide.toUpperCase()} />
      <StatRow label="Leverage" value={`${(offer.leverageBps / 10000).toFixed(2)}x`} />
      <StatRow label="Entry Price" value={`$${offer.entryPriceUsd}`} />
      <StatRow label="Position Value" value={`$${offer.notionalAmountUsd}`} />
      <StatRow
        label="Liquidation Price"
        value={`$${offer.currentLiquidationPriceUsd}`}
        valueColor="#F5A623"
      />

      <div
        style={{
          height: 1,
          background: 'var(--border)',
          margin: '8px 0',
        }}
      />

      <StatRow
        label="Collateral"
        value={`$${(Number(offer.collateralUsdcUnits) / 1e6).toFixed(2)}`}
      />
      <StatRow
        label="Origination Fee"
        value={`${(offer.originationFeeBps / 100).toFixed(2)}% ($${offer.originationFeeUsd})`}
      />
      {offer.partnerOriginationFeeBps > 0 && (
        <>
          <StatRow
            label="  · Protocol"
            value={`${(offer.protocolOriginationFeeBps / 100).toFixed(2)}% ($${offer.protocolOriginationFeeUsd})`}
          />
          <StatRow
            label="  · Partner"
            value={`${(offer.partnerOriginationFeeBps / 100).toFixed(2)}% ($${offer.partnerOriginationFeeUsd})`}
          />
        </>
      )}
      <StatRow
        label="Trading Fee"
        value={
          offer.polymarketTradingFeeBps > 0
            ? `${(offer.polymarketTradingFeeBps / 100).toFixed(2)}% ($${offer.expectedOpenTradingFeeUsd})`
            : `$${offer.expectedOpenTradingFeeUsd}`
        }
      />
      <StatRow
        label="Lifetime Fee APR"
        value={`${(offer.lifetimeFeeAprBps / 100).toFixed(1)}%`}
      />

      <div
        style={{
          height: 1,
          background: 'var(--border)',
          margin: '8px 0',
        }}
      />

      <StatRow
        label="Total Cost (incl. fees)"
        value={`$${offer.totalUserAmountUsd}`}
        valueColor="#EEFF00"
      />

      {/* Expiry countdown */}
      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          color: secondsLeft < 30 ? 'var(--red)' : 'var(--text-dim)',
          textAlign: 'center',
        }}
      >
        Quote expires in {secondsLeft}s
      </div>
    </div>
  )
}
