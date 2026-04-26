import { useEffect, useState } from 'react'
import {
  MicroStat,
  StatGroup,
  ViewToggle,
  fadeInKeyframes,
  useViewMode,
} from './CardViewParts'
import { useQueryClient } from '@tanstack/react-query'
import type { OpenPosition, PositionUnwindList } from '../api/types'
import { isDemoMode } from '../api/auth'
import { useRequestClose } from '../contract/hooks'
import { useCancelPosition } from '../hooks/useCancelPosition'
import { useContractInfo } from '../hooks/useContractInfo'
import { useMarketTitle } from '../hooks/useMarketTitle'
import { CardShell } from './CardShell'
import { ErrorBanner } from './ErrorBanner'
import { StatRow } from './StatRow'
import { LeverageChart } from './LeverageChart'

export function PositionCard({
  position,
  unwinds,
  isUnwindsLoading = false,
}: {
  position: OpenPosition
  unwinds?: PositionUnwindList
  isUnwindsLoading?: boolean
}) {
  const queryClient = useQueryClient()
  const cancelMutation = useCancelPosition()
  const { data: contractInfo } = useContractInfo()
  const unwindData = unwinds
  const { requestClose, isPending: isCloseSigning, isConfirming: isCloseConfirming, isSuccess: isCloseConfirmed, error: closeChainError } = useRequestClose()

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [viewMode, setViewMode] = useViewMode('positionCard.viewMode')
  const marketTitle = useMarketTitle(position.marketTicker)
  const displayTitle = marketTitle || position.marketTicker

  useEffect(() => {
    if (isCloseConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
    }
  }, [isCloseConfirmed, queryClient])

  const copyToClipboard = (value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500)
  }

  const truncateMiddle = (value: string, head = 8, tail = 6) =>
    value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`

  const isPendingPosition = position.status === 'pending'
  const isOpenPosition = position.status === 'open'
  const isClosingPosition = position.status === 'closing'
  const isSettlingPosition = position.status === 'settling'
  const isInFlight = isPendingPosition || isClosingPosition || isSettlingPosition
  const canAct = (isPendingPosition || isOpenPosition) && !isDemoMode

  const isBusy =
    cancelMutation.isPending || isCloseSigning || isCloseConfirming

  const actionError: unknown = isPendingPosition ? cancelMutation.error : closeChainError

  const handleAction = () => {
    if (isBusy) return
    if (isPendingPosition) {
      cancelMutation.mutate(position.id)
      return
    }
    if (isOpenPosition) {
      if (!contractInfo?.polygonVaultContractAddress) return
      requestClose(contractInfo.polygonVaultContractAddress, position.onChainPositionKey)
    }
  }

  const dismissError = () => {
    if (isPendingPosition) cancelMutation.reset()
  }

  const buttonLabel = (() => {
    if (cancelMutation.isPending) return 'Cancelling...'
    if (isCloseSigning) return 'Confirm in wallet...'
    if (isCloseConfirming) return 'Closing...'
    if (isCloseConfirmed) return 'Close requested'
    return isPendingPosition ? 'Cancel Position' : 'Close Position'
  })()

  const isYes = position.side === 'yes'
  const pnlValue = parseFloat(position.current.unrealizedPnlUsd)
  const pnlColor = pnlValue >= 0 ? 'var(--green)' : 'var(--red)'
  const pnlPrefix = pnlValue >= 0 ? '+' : ''
  const roePct = (position.current.unrealizedPnlBps / 100).toFixed(1)

  const accruedFees =
    parseFloat(position.fees.accruedLifetimeFeeUsd) +
    parseFloat(position.fees.pendingLifetimeFeeUsd)
  const netPnlValue = pnlValue - accruedFees
  const netPnlColor = netPnlValue >= 0 ? 'var(--green)' : 'var(--red)'
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

  // Distance to liquidation: a directional gap between current price and the
  // price at which the position would be liquidated. For YES the position is
  // liquidated when price falls TO or BELOW the liquidation price; for NO the
  // direction flips. Past that point the position is over.
  const currentPrice = parseFloat(position.current.markPriceUsd)
  const liquidationPrice = parseFloat(position.risk.currentLiquidationPriceUsd)
  let distancePctDisplay = '—'
  if (currentPrice > 0 && liquidationPrice > 0) {
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
    <CardShell variant="yellow">
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
              onClick={() => copyToClipboard(position.marketTicker, 'ticker')}
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
            <span
              onClick={() => copyToClipboard(position.id, 'id')}
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 500,
                color: copiedKey === 'id' ? 'var(--green)' : 'var(--text-dim)',
                fontFamily: 'monospace',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
              }}
              title={copiedKey === 'id' ? 'Copied!' : position.id}
            >
              {copiedKey === 'id' ? '✓ Copied to clipboard' : truncateMiddle(position.id)}
            </span>
            <span
              onClick={() => copyToClipboard(position.onChainPositionKey, 'key')}
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 500,
                color: copiedKey === 'key' ? 'var(--green)' : 'var(--text-dim)',
                fontFamily: 'monospace',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginTop: 2,
                transition: 'color 0.2s',
              }}
              title={copiedKey === 'key' ? 'Copied!' : position.onChainPositionKey}
            >
              {copiedKey === 'key' ? '✓ Copied to clipboard' : truncateMiddle(position.onChainPositionKey)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isYes ? 'var(--green)' : 'var(--red)',
                background: isYes
                  ? 'var(--green-soft)'
                  : 'var(--red-soft)',
                border: `1px solid ${
                  isYes ? 'rgba(68,255,151,0.2)' : 'rgba(224,82,82,0.2)'
                }`,
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

        {/* View toggle muted to keep the card calm */}
        <ViewToggle
          mode={viewMode}
          onChange={setViewMode}
          accent="rgba(255,255,255,0.08)"
          accentInk="var(--text)"
        />

        {viewMode === 'simple' ? (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
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
              <MicroStat
                label="Distance to liquidation"
                value={distancePctDisplay}
              />
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <StatGroup label="Pricing">
              <StatRow label="Entry Price" value={`$${position.entry.priceUsd}`} />
              <StatRow label="Current Price" value={`$${position.current.markPriceUsd}`} />
              <StatRow
                label="Liquidation Price"
                value={`$${position.risk.currentLiquidationPriceUsd}`}
                valueColor="#F5A623"
              />
              <StatRow
                label="Distance to liquidation"
                value={distancePctDisplay}
              />
            </StatGroup>

            <StatGroup label="Position Size">
              <StatRow
                label="Current Collateral"
                value={`$${parseFloat(position.current.collateralUsd).toFixed(2)}`}
              />
              <StatRow
                label="Current Notional"
                value={`$${parseFloat(position.current.notionalUsd).toFixed(2)}`}
              />
            </StatGroup>

            <StatGroup label="PnL & Fees">
              <StatRow
                label="PnL gross / ROE"
                value={`${pnlPrefix}$${Math.abs(pnlValue).toFixed(2)} (${pnlPrefix}${roePct}%)`}
                valueColor={pnlColor}
              />
              <StatRow
                label="PnL net / ROE"
                value={`${netPnlPrefix}$${Math.abs(netPnlValue).toFixed(2)} (${netPnlPrefix}${netRoePct.toFixed(1)}%)`}
                valueColor={netPnlColor}
              />
              <StatRow
                label="Accrued Fees"
                value={`$${accruedFees.toFixed(2)}`}
                valueColor="var(--text-muted)"
              />
              <StatRow label="Time-based fee" value="0.01%" />
            </StatGroup>

            <StatGroup label="Leverage">
              <StatRow
                label="Starting"
                value={`${(position.entry.leverageBps / 10000).toFixed(1)}x`}
              />
              <StatRow
                label="Current"
                value={`${(position.current.leverageBps / 10000).toFixed(1)}x`}
              />
              <StatRow
                label="Weighted"
                value={`${(position.effectiveLeverageBps / 10000).toFixed(1)}x`}
              />
              <div style={{ marginTop: 10 }}>
                <LeverageChart unwinds={unwindData} isLoading={isUnwindsLoading} />
              </div>
            </StatGroup>

            <StatGroup label="Timing" last>
              <StatRow label="Time to Resolution" value={timeDisplay} />
              <StatRow label="Market Status" value={position.timing.marketStatus} />
            </StatGroup>
          </div>
        )}

        <style>{fadeInKeyframes}</style>

        {/* Action button */}
        {canAct && (
          <button
            onClick={handleAction}
            disabled={isBusy}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 0,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: isBusy ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
              fontSize: 14,
              fontWeight: 500,
              cursor: isBusy ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font)',
              marginTop: 16,
              transition: 'border-color 0.2s',
            }}
          >
            {buttonLabel}
          </button>
        )}

        <ErrorBanner error={actionError} onDismiss={isPendingPosition ? dismissError : undefined} />
      </div>
    </CardShell>
  )
}

