import { useState, useEffect, useMemo } from 'react'
import type { Offer } from '../api/types'
import { StatRow } from './StatRow'

export function QuoteDetails({ offer, hideExpiry = false }: { offer: Offer; hideExpiry?: boolean }) {
  const expiresAtMs = useMemo(() => new Date(offer.expiresAt).getTime(), [offer.expiresAt])

  // Captured once per offer so the progress-bar denominator stays stable as
  // secondsLeft ticks down. Date.now() would be impure inside useMemo.
  const [totalSeconds] = useState(() =>
    Math.max(1, Math.round((expiresAtMs - Date.now()) / 1000)),
  )
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000)),
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAtMs])

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
        label={offer.provider === 'kalshi' ? 'Kalshi Fee' : 'Polymarket Fee'}
        value={`$${offer.expectedOpenTradingFeeUsd}`}
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

      {!hideExpiry && <QuoteExpiryBar secondsLeft={secondsLeft} totalSeconds={totalSeconds} />}
    </div>
  )
}

function QuoteExpiryBar({
  secondsLeft,
  totalSeconds,
}: {
  secondsLeft: number
  totalSeconds: number
}) {
  const pct = Math.max(0, Math.min(1, secondsLeft / totalSeconds))
  const expired = secondsLeft <= 0
  const urgent = secondsLeft > 0 && secondsLeft <= Math.max(3, Math.floor(totalSeconds / 3))

  const barColor = expired
    ? 'rgba(255,255,255,0.15)'
    : urgent
      ? '#F5A623'
      : 'var(--yellow)'
  const labelColor = expired
    ? 'var(--text-dim)'
    : urgent
      ? '#F5A623'
      : 'var(--text-muted)'

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: labelColor,
          }}
        >
          {expired ? 'Quote expired' : 'Quote valid'}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: labelColor,
          }}
        >
          {expired ? '0s' : `${secondsLeft}s`}
        </span>
      </div>
      <div
        style={{
          height: 3,
          width: '100%',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct * 100}%`,
            background: barColor,
            borderRadius: 2,
            transition: 'width 1s linear, background 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}
