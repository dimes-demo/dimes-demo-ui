import { useEffect, useState } from 'react'
import {
  MicroStat,
  PnlHero,
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
import { CardShell } from './CardShell'
import { ErrorBanner } from './ErrorBanner'
import { StatRow } from './StatRow'
import { HealthRing } from './HealthRing'
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
              borderRadius: 8,
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
                fontSize: 16,
                fontWeight: 700,
                color: copiedKey === 'ticker' ? 'var(--green)' : 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              title={copiedKey === 'ticker' ? 'Copied!' : position.marketTicker}
            >
              {copiedKey === 'ticker' ? '✓ Copied to clipboard' : position.marketTicker}
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
                borderRadius: 4,
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
                borderRadius: 4,
                padding: '2px 8px',
                textTransform: 'uppercase',
              }}
            >
              {position.status === 'pending' ? 'created' : position.status}
            </span>
            <HealthRing healthBps={position.risk.healthBps} />
          </div>
        </div>

        {/* Margin buffer info */}
        <div
          style={{
            background: 'rgba(238,255,0,0.04)',
            border: '1px solid rgba(238,255,0,0.1)',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--yellow)', fontWeight: 500 }}>
            You have a ${position.risk.marginBufferUsd} margin buffer
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            (price needs to drop {(position.risk.liquidationBufferBps / 100).toFixed(1)}% to trigger
            liquidation)
          </div>
        </div>

        {/* View toggle */}
        <ViewToggle mode={viewMode} onChange={setViewMode} />

        {viewMode === 'simple' ? (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <PnlHero
              label="PnL"
              value={`${pnlPrefix}$${Math.abs(pnlValue).toFixed(2)}`}
              pctValue={`${pnlPrefix}${roePct}%`}
              color={pnlColor}
            />

            {/* Glance grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px 18px',
              }}
            >
              <MicroStat label="Current price" value={`$${position.current.markPriceUsd}`} />
              <MicroStat
                label="Liquidation"
                value={`$${position.risk.currentLiquidationPriceUsd}`}
                valueColor="#F5A623"
              />
              <MicroStat label="Time to resolution" value={timeDisplay} />
              <MicroStat
                label="Effective leverage"
                value={`${(position.effectiveLeverageBps / 10000).toFixed(1)}x`}
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
              <StatRow
                label="Lifetime Fee APR"
                value={`${(position.fees.lifetimeAprBps / 100).toFixed(1)}%`}
              />
            </StatGroup>

            <StatGroup label="Leverage">
              <StatRow
                label="Starting"
                value={`${(position.entry.leverageBps / 10000).toFixed(1)}x`}
              />
              <StatRow
                label="Effective"
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
              borderRadius: 8,
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

