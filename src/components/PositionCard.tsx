import { useState } from 'react'
import { MicroStat } from './CardViewParts'
import type { OpenPosition } from '../api/types'
import { useMarket } from '../hooks/useMarketTitle'
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
  const market = useMarket(position.marketTicker)
  const displayTitle = market?.title || position.marketTicker

  const copyToClipboard = (value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500)
  }

  const isClosingPosition = position.status === 'closing'
  const isSettlingPosition = position.status === 'settling'
  const isPendingPosition = position.status === 'pending'
  const isUnwindingPosition = position.status === 'unwinding'
  const isVoided = position.timing.isVoided && position.timing.isSettlementPending
  const isInFlight = isPendingPosition || isClosingPosition || isSettlingPosition || isUnwindingPosition

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

  return (
    <CardShell
      variant="yellow"
      onClick={onClick}
      style={isSelected ? { border: '1px solid var(--yellow-border)' } : undefined}
    >
      <div style={{ position: 'relative', zIndex: 1, padding: '22px 24px 20px' }}>
        {isVoided && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(167,139,250,0.06)',
              border: '1px solid rgba(167,139,250,0.18)',
              borderRadius: 0,
              padding: '10px 12px',
              marginBottom: 16,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <span style={{ fontSize: 12, color: '#A78BFA', lineHeight: 1.4 }}>
              Market voided — settling at $0.50
            </span>
          </div>
        )}

        {isInFlight && !isVoided && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: isUnwindingPosition ? 'rgba(91,156,245,0.08)' : 'rgba(245,166,35,0.08)',
              border: `1px solid ${isUnwindingPosition ? 'rgba(91,156,245,0.22)' : 'rgba(245,166,35,0.22)'}`,
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
                background: isUnwindingPosition ? '#5B9CF5' : '#F5A623',
                animation: 'pendingPulse 1.1s ease-in-out infinite',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: isUnwindingPosition ? '#5B9CF5' : '#F5A623', fontWeight: 600 }}>
                {isUnwindingPosition
                  ? 'Reducing leverage'
                  : isClosingPosition
                  ? 'Closing position'
                  : isSettlingPosition
                  ? 'Settling position'
                  : 'Opening position'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {isUnwindingPosition
                  ? 'Deleveraging in progress…'
                  : isClosingPosition
                  ? 'Awaiting on-chain confirmation on Polygon…'
                  : isSettlingPosition
                  ? 'Market resolved — awaiting on-chain settlement…'
                  : 'Awaiting on-chain confirmation on Polygon…'}
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                background: isUnwindingPosition ? 'rgba(91,156,245,0.15)' : 'rgba(245,166,35,0.15)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '40%',
                  background: isUnwindingPosition ? '#5B9CF5' : '#F5A623',
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
              onClick={(e) => {
                e.stopPropagation()
                if (market?.id) copyToClipboard(market.id, 'marketId')
              }}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: copiedKey === 'marketId' ? 'var(--green)' : '#ffffff',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis',
                cursor: market?.id ? 'pointer' : 'default',
                transition: 'color 0.2s',
                lineHeight: 1.3,
              }}
              title={
                copiedKey === 'marketId'
                  ? 'Market ID copied'
                  : market?.id
                    ? `${displayTitle} — click to copy market ID`
                    : displayTitle
              }
            >
              {copiedKey === 'marketId' ? '✓ Market ID copied' : displayTitle}
            </div>
            <PositionIdRow
              positionId={position.id}
              copied={copiedKey === 'positionId'}
              onCopy={(e) => {
                e.stopPropagation()
                copyToClipboard(position.id, 'positionId')
              }}
            />
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
                color: isVoided ? '#A78BFA'
                  : position.status === 'open' ? 'var(--green)'
                  : isUnwindingPosition ? '#5B9CF5'
                  : isInFlight ? '#F5A623'
                  : 'var(--text-muted)',
                background: isVoided ? 'rgba(167,139,250,0.08)'
                  : position.status === 'open' ? 'var(--green-soft)'
                  : isUnwindingPosition ? 'rgba(91,156,245,0.08)'
                  : isInFlight ? 'rgba(245,166,35,0.08)'
                  : 'rgba(136,136,136,0.08)',
                border: `1px solid ${
                  isVoided ? 'rgba(167,139,250,0.2)'
                  : position.status === 'open' ? 'rgba(68,255,151,0.2)'
                  : isUnwindingPosition ? 'rgba(91,156,245,0.2)'
                  : isInFlight ? 'rgba(245,166,35,0.2)'
                  : 'rgba(136,136,136,0.2)'
                }`,
                borderRadius: 0,
                padding: '2px 8px',
                textTransform: 'uppercase',
              }}
            >
              {isVoided ? 'voided' : position.status === 'pending' ? 'created' : position.status}
            </span>
          </div>
        </div>

        {/* Simple stats — 5 rows × 2 cols */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px 18px',
          }}
        >
          <MicroStat
            label="Entry price"
            value={`$${position.entry.priceUsd}`}
          />
          <MicroStat
            label={isVoided ? 'Settlement price' : 'Current price'}
            value={`$${position.current.markPriceUsd}`}
            valueColor={isVoided ? '#A78BFA' : undefined}
          />
          <MicroStat
            label="Current notional"
            value={`$${parseFloat(position.current.notionalUsd).toFixed(2)}`}
          />
          <MicroStat
            label="Position value"
            value={`$${positionValueUsd.toFixed(2)}`}
          />
          <MicroStat
            label="Net PnL"
            value={`${netPnlPrefix}$${Math.abs(netPnlValue).toFixed(2)} (${netPnlPrefix}${netRoePct.toFixed(1)}%)`}
            valueColor={netPnlColor}
          />
          {isVoided ? (
            <MicroStat label="Settlement" value="Pending" valueColor="#A78BFA" />
          ) : (
            <MicroStat label="Time to resolution" value={timeDisplay} />
          )}
          <MicroStat
            label="Entry leverage"
            value={`${(position.entry.leverageBps / 10000).toFixed(1)}x`}
          />
          <MicroStat
            label="Current leverage"
            value={`${(position.current.leverageBps / 10000).toFixed(1)}x`}
          />
          {!isVoided && (
            <>
              <MicroStat
                label="Liquidation price"
                value={isFullyDeleveraged ? '—' : `$${position.risk.currentLiquidationPriceUsd}`}
                valueColor={isFullyDeleveraged ? 'var(--text-muted)' : '#F5A623'}
              />
              <MicroStat
                label="Distance to liquidation"
                value={distancePctDisplay}
              />
            </>
          )}
        </div>
      </div>
    </CardShell>
  )
}

function truncateId(value: string, head = 10, tail = 6) {
  return value.length <= head + tail + 1
    ? value
    : `${value.slice(0, head)}…${value.slice(-tail)}`
}

export function PositionIdRow({
  positionId,
  copied,
  onCopy,
}: {
  positionId: string
  copied: boolean
  onCopy: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onCopy}
      title={copied ? 'Position ID copied' : `Click to copy: ${positionId}`}
      style={{
        marginTop: 4,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontFamily: 'monospace',
        color: copied ? 'var(--green)' : 'var(--text-dim)',
        cursor: 'pointer',
        transition: 'color 0.2s',
        userSelect: 'none',
      }}
    >
      <span style={{ letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font)', fontSize: 10 }}>
        {copied ? '✓ Copied' : 'ID'}
      </span>
      <span>{truncateId(positionId)}</span>
      {!copied && (
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.6 }}
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </div>
  )
}
