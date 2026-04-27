import { useState } from 'react'
import { MicroStat } from './CardViewParts'
import type { OpenPosition } from '../api/types'
import { useMarketTitle } from '../hooks/useMarketTitle'
import { CardShell } from './CardShell'

export function PositionCard({
  position,
  onClick,
  isSelected,
}: {
  position: OpenPosition
  onClick?: () => void
  isSelected?: boolean
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const marketTitle = useMarketTitle(position.marketTicker)
  const displayTitle = marketTitle || position.marketTicker

  const copyToClipboard = (value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500)
  }

  const isClosingPosition = position.status === 'closing'
  const isSettlingPosition = position.status === 'settling'
  const isPendingPosition = position.status === 'pending'
  const isInFlight = isPendingPosition || isClosingPosition || isSettlingPosition

  const isYes = position.side === 'yes'
  const pnlValue = parseFloat(position.current.unrealizedPnlUsd)
  const netPnlColor = (() => {
    const accruedFees =
      parseFloat(position.fees.accruedLifetimeFeeUsd) +
      parseFloat(position.fees.pendingLifetimeFeeUsd)
    return pnlValue - accruedFees >= 0 ? 'var(--green)' : 'var(--red)'
  })()
  const accruedFees =
    parseFloat(position.fees.accruedLifetimeFeeUsd) +
    parseFloat(position.fees.pendingLifetimeFeeUsd)
  const netPnlValue = pnlValue - accruedFees
  const netPnlPrefix = netPnlValue >= 0 ? '+' : ''
  const entryCollateral = parseFloat(position.entry.collateralUsd)
  const netRoePct = entryCollateral > 0 ? (netPnlValue / entryCollateral) * 100 : 0

  const timeToClose = position.timing.timeToCloseMinutes
  let timeDisplay = '—'
  if (timeToClose != null) {
    const days = Math.floor(timeToClose / 1440)
    const hours = Math.floor((timeToClose % 1440) / 60)
    const mins = timeToClose % 60
    timeDisplay = days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`
  }

  const isFullyDeleveraged = position.current.leverageBps <= 10000

  const currentPrice = parseFloat(position.current.markPriceUsd)
  const liquidationPrice = parseFloat(position.risk.currentLiquidationPriceUsd)
  let distancePctDisplay = '—'
  if (!isFullyDeleveraged && currentPrice > 0 && liquidationPrice > 0) {
    const inBuffer = isYes
      ? currentPrice > liquidationPrice
      : currentPrice < liquidationPrice
    if (inBuffer) {
      const pct = (Math.abs(currentPrice - liquidationPrice) / currentPrice) * 100
      distancePctDisplay = `${pct.toFixed(1)}%`
    }
  }

  const positionValueUsd = parseFloat(position.current.positionValueUsd)
  const investedUsd = entryCollateral

  return (
    <CardShell
      variant="yellow"
      onClick={onClick}
      style={isSelected ? { border: '1px solid var(--yellow-border)' } : undefined}
    >
      <div style={{ position: 'relative', zIndex: 1, padding: '22px 24px 20px' }}>
        {isInFlight && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(245,166,35,0.08)',
              border: '1px solid rgba(245,166,35,0.22)',
              borderRadius: 0,
              padding: '10px 12px',
              marginBottom: 16,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#F5A623',
                animation: 'pendingPulse 1.1s ease-in-out infinite',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: '#F5A623', fontWeight: 600 }}>
                {isClosingPosition ? 'Closing on-chain' : isSettlingPosition ? 'Settling on-chain' : 'Finalizing on-chain'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {isClosingPosition
                  ? 'Waiting for the vault to confirm your close…'
                  : isSettlingPosition
                  ? 'Market resolved — waiting for on-chain settlement…'
                  : 'Waiting for the vault to confirm your position…'}
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'rgba(245,166,35,0.15)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '40%',
                  background: '#F5A623',
                  animation: 'pendingSlide 1.6s ease-in-out infinite',
                }}
              />
            </div>
            <style>{`
              @keyframes pendingPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(0.85); }
              }
              @keyframes pendingSlide {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(250%); }
              }
            `}</style>
          </div>
        )}

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div
              onClick={(e) => { e.stopPropagation(); copyToClipboard(position.marketTicker, 'ticker') }}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: copiedKey === 'ticker' ? 'var(--green)' : '#ffffff',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
                transition: 'color 0.2s',
                lineHeight: 1.3,
              }}
              title={copiedKey === 'ticker' ? 'Copied!' : displayTitle}
            >
              {copiedKey === 'ticker' ? '✓ Copied' : displayTitle}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isYes ? 'var(--green)' : 'var(--red)',
                background: isYes ? 'var(--green-soft)' : 'var(--red-soft)',
                border: `1px solid ${isYes ? 'rgba(68,255,151,0.2)' : 'rgba(224,82,82,0.2)'}`,
                borderRadius: 0,
                padding: '2px 8px',
                textTransform: 'uppercase',
              }}
            >
              {position.side}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: position.status === 'open' ? 'var(--green)'
                  : isInFlight ? '#F5A623'
                  : 'var(--text-muted)',
                background: position.status === 'open' ? 'var(--green-soft)'
                  : isInFlight ? 'rgba(245,166,35,0.08)'
                  : 'rgba(136,136,136,0.08)',
                border: `1px solid ${
                  position.status === 'open' ? 'rgba(68,255,151,0.2)'
                  : isInFlight ? 'rgba(245,166,35,0.2)'
                  : 'rgba(136,136,136,0.2)'
                }`,
                borderRadius: 0,
                padding: '2px 8px',
                textTransform: 'uppercase',
              }}
            >
              {position.status === 'pending' ? 'created' : position.status}
            </span>
          </div>
        </div>

        {/* Simple stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px 18px',
          }}
        >
          <MicroStat
            label="Position value"
            value={`$${positionValueUsd.toFixed(2)}`}
          />
          <MicroStat
            label="Invested"
            value={`$${investedUsd.toFixed(2)}`}
          />
          <MicroStat
            label="Net PnL"
            value={`${netPnlPrefix}$${Math.abs(netPnlValue).toFixed(2)} (${netPnlPrefix}${netRoePct.toFixed(1)}%)`}
            valueColor={netPnlColor}
          />
          {isFullyDeleveraged ? (
            <div
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(68,255,151,0.06)',
                border: '1px solid rgba(68,255,151,0.15)',
                borderRadius: 0,
                padding: '8px 10px',
              }}
            >
              <span style={{ fontSize: 11, color: 'var(--green)', lineHeight: 1.35 }}>
                No liquidation risk — your remaining funds are fully yours.
              </span>
            </div>
          ) : (
            <>
              <MicroStat
                label="Distance to liquidation"
                value={distancePctDisplay}
              />
              <MicroStat
                label="Liquidation price"
                value={`$${position.risk.currentLiquidationPriceUsd}`}
                valueColor="#F5A623"
              />
            </>
          )}
          <MicroStat
            label="Current price"
            value={`$${position.current.markPriceUsd}`}
          />
          <MicroStat label="Time to resolution" value={timeDisplay} />
          <MicroStat
            label="Weighted leverage"
            value={`${(position.effectiveLeverageBps / 10000).toFixed(1)}x`}
          />
        </div>
      </div>
    </CardShell>
  )
}
