import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { OpenPosition } from '../api/types'
import { useRequestClose } from '../contract/hooks'
import { useCancelPosition } from '../hooks/useCancelPosition'
import { useContractInfo } from '../hooks/useContractInfo'
import { CardShell } from './CardShell'
import { ErrorBanner } from './ErrorBanner'
import { StatRow } from './StatRow'
import { HealthRing } from './HealthRing'

export function PositionCard({ position }: { position: OpenPosition }) {
  const queryClient = useQueryClient()
  const cancelMutation = useCancelPosition()
  const { data: contractInfo } = useContractInfo()
  const { requestClose, isPending: isCloseSigning, isConfirming: isCloseConfirming, isSuccess: isCloseConfirmed, error: closeChainError } = useRequestClose()

  useEffect(() => {
    if (isCloseConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
    }
  }, [isCloseConfirmed, queryClient])

  const isPendingPosition = position.status === 'pending'
  const isOpenPosition = position.status === 'open'
  const canAct = isPendingPosition || isOpenPosition

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
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {position.marketTicker}
            </div>
            <span
              onClick={() => navigator.clipboard.writeText(position.id)}
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--text-dim)',
                fontFamily: 'monospace',
                cursor: 'pointer',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '16ch',
              }}
              title={position.id}
            >
              {position.id}
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
                  : position.status === 'pending' ? '#F5A623'
                  : 'var(--text-muted)',
                background: position.status === 'open' ? 'var(--green-soft)'
                  : position.status === 'pending' ? 'rgba(245,166,35,0.08)'
                  : 'rgba(136,136,136,0.08)',
                border: `1px solid ${
                  position.status === 'open' ? 'rgba(68,255,151,0.2)'
                  : position.status === 'pending' ? 'rgba(245,166,35,0.2)'
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

        {/* Stats */}
        <StatRow label="Side" value={position.side.toUpperCase()} />
        <StatRow label="Entry Price" value={`$${position.entry.priceUsd}`} />
        <StatRow label="Current Price" value={`$${position.current.markPriceUsd}`} />
        <StatRow
          label="Liquidation Price"
          value={`$${position.risk.currentLiquidationPriceUsd}`}
          valueColor="#F5A623"
        />
        <StatRow
          label="PnL / (ROE %)"
          value={`${pnlPrefix}$${Math.abs(pnlValue).toFixed(2)} (${pnlPrefix}${roePct}%)`}
          valueColor={pnlColor}
        />
        <StatRow
          label="Starting Leverage"
          value={`${(position.entry.leverageBps / 10000).toFixed(1)}x`}
        />
        <StatRow
          label="Effective Leverage"
          value={`${(position.effectiveLeverageBps / 10000).toFixed(1)}x`}
        />
        <StatRow
          label="Lifetime Fee APR"
          value={`${(position.fees.lifetimeAprBps / 100).toFixed(1)}%`}
        />
        <StatRow label="Time to Resolution" value={timeDisplay} />
        <StatRow label="Market Status" value={position.timing.marketStatus} />

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
