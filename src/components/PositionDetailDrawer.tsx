import { useEffect, useState } from 'react'
import type {
  Position,
  OpenPosition,
  ClosedPosition,
  PositionUnwindList,
} from '../api/types'
import { isOpenPosition } from '../api/types'
import { useQueryClient } from '@tanstack/react-query'
import { isDemoMode } from '../api/auth'
import { useRequestClose } from '../contract/hooks'
import { useCancelPosition } from '../hooks/useCancelPosition'
import { useContractInfo } from '../hooks/useContractInfo'
import { formatSlippageBps } from '../utils/format'
import { ErrorBanner } from './ErrorBanner'
import { StatRow } from './StatRow'
import { StatGroup, PnlHero } from './CardViewParts'
import { LeverageChart } from './LeverageChart'
import { PositionIdRow } from './PositionCard'

export function PositionDetailDrawer({
  position,
  unwinds,
  isUnwindsLoading,
  open,
  onClose,
}: {
  position: Position | null
  unwinds?: PositionUnwindList
  isUnwindsLoading?: boolean
  open: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div
        className={`trade-drawer-backdrop${open ? ' trade-drawer-backdrop--open' : ''}`}
        onClick={onClose}
      />
      <div className={`trade-drawer${open ? ' trade-drawer--open' : ''}`}>
        <div className="trade-drawer__inner dimes-scroll">
          {position && isOpenPosition(position) && (
            <OpenPositionDetail
              position={position}
              unwinds={unwinds}
              isUnwindsLoading={isUnwindsLoading}
              onClose={onClose}
            />
          )}
          {position && !isOpenPosition(position) && (
            <ClosedPositionDetail
              position={position as ClosedPosition}
              unwinds={unwinds}
              isUnwindsLoading={isUnwindsLoading}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </>
  )
}

function DrawerHeader({
  title,
  marketTicker,
  positionId,
  onClose,
  badges,
}: {
  title: string
  marketTicker: string
  positionId?: string
  onClose: () => void
  badges: React.ReactNode
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500)
  }
  return (
    <div style={{ padding: '20px 24px 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div
            onClick={() => copy(marketTicker, 'ticker')}
            title={
              copiedKey === 'ticker'
                ? 'Ticker copied'
                : `${title} — click to copy ticker`
            }
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: copiedKey === 'ticker' ? 'var(--green)' : '#ffffff',
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              textOverflow: 'ellipsis',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
          >
            {copiedKey === 'ticker' ? '✓ Ticker copied' : title}
          </div>
          {positionId && (
            <PositionIdRow
              positionId={positionId}
              copied={copiedKey === 'positionId'}
              onCopy={(e) => {
                e.stopPropagation()
                copy(positionId, 'positionId')
              }}
            />
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {badges}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            fontSize: 18,
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function Badge({
  label,
  color,
  bg,
  borderColor,
}: {
  label: string
  color: string
  bg: string
  borderColor: string
}) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 0,
        padding: '2px 8px',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  )
}

function OpenPositionDetail({
  position,
  unwinds,
  isUnwindsLoading = false,
  onClose,
}: {
  position: OpenPosition
  unwinds?: PositionUnwindList
  isUnwindsLoading?: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const cancelMutation = useCancelPosition()
  const { data: contractInfo } = useContractInfo()
  const {
    requestClose,
    isPending: isCloseSigning,
    isConfirming: isCloseConfirming,
    isSuccess: isCloseConfirmed,
    error: closeChainError,
    receiptError: closeReceiptError,
    simulateError: closeSimError,
    reset: resetClose,
  } = useRequestClose()

  const displayTitle = position.marketTitle || position.marketTicker
  const isYes = position.side === 'yes'

  useEffect(() => {
    if (isCloseConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
    }
  }, [isCloseConfirmed, queryClient])

  const isPendingPosition = position.status === 'pending'
  const isOpenPos = position.status === 'open'
  const isUnwindingPos = position.status === 'unwinding'
  const isVoided = position.timing.isVoided && position.timing.isSettlementPending
  const canAct = (isPendingPosition || isOpenPos) && !isUnwindingPos && !isVoided && !isDemoMode

  const isBusy = cancelMutation.isPending || cancelMutation.isSuccess || isCloseSigning || isCloseConfirming
  const actionError: unknown = isPendingPosition
    ? cancelMutation.error
    : closeSimError ?? closeChainError ?? closeReceiptError

  const handleAction = () => {
    if (isBusy) return
    if (isPendingPosition) {
      cancelMutation.mutate(position.id)
      return
    }
    if (isOpenPos) {
      if (!contractInfo?.polygonVaultContractAddress) return
      requestClose(contractInfo.polygonVaultContractAddress, position.onChainPositionKey)
    }
  }

  const dismissError = () => {
    if (isPendingPosition) cancelMutation.reset()
    else resetClose()
  }

  const buttonLabel = (() => {
    if (cancelMutation.isPending) return 'Cancelling...'
    if (cancelMutation.isSuccess) return 'Cancel requested'
    if (isCloseSigning) return 'Confirm in wallet...'
    if (isCloseConfirming) return 'Closing...'
    if (isCloseConfirmed) return 'Close requested'
    return isPendingPosition ? 'Cancel Position' : 'Close Position'
  })()

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
  const filledPrice = position.entry.effectiveEntryPriceUsd
  const slippageBps = position.entry.effectiveSlippageBps
  const slippageText = formatSlippageBps(slippageBps)
  const slippageColor =
    slippageBps == null
      ? 'var(--text-muted)'
      : slippageBps > 0
      ? 'var(--red)'
      : slippageBps < 0
      ? 'var(--green)'
      : 'var(--text)'
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

  const isFullyDeleveraged = position.current.bookLeverageBps <= 10000

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

  const isInFlight = position.status === 'pending' || position.status === 'closing' || position.status === 'settling' || isUnwindingPos
  const statusLabel = isVoided ? 'voided' : position.status === 'pending' ? 'created' : position.status

  return (
    <div>
      <DrawerHeader
        title={displayTitle}
        marketTicker={position.marketTicker}
        positionId={position.id}
        onClose={onClose}
        badges={
          <>
            <Badge
              label={isYes ? 'YES' : 'NO'}
              color={isYes ? 'var(--green)' : 'var(--red)'}
              bg={isYes ? 'var(--green-soft)' : 'var(--red-soft)'}
              borderColor={isYes ? 'rgba(68,255,151,0.2)' : 'rgba(224,82,82,0.2)'}
            />
            <Badge
              label={statusLabel}
              color={
                isVoided ? '#A78BFA'
                  : position.status === 'open' ? 'var(--green)'
                  : isUnwindingPos ? '#5B9CF5'
                  : isInFlight ? '#F5A623'
                  : 'var(--text-muted)'
              }
              bg={
                isVoided ? 'rgba(167,139,250,0.08)'
                  : position.status === 'open' ? 'var(--green-soft)'
                  : isUnwindingPos ? 'rgba(91,156,245,0.08)'
                  : isInFlight ? 'rgba(245,166,35,0.08)'
                  : 'rgba(136,136,136,0.08)'
              }
              borderColor={
                isVoided ? 'rgba(167,139,250,0.2)'
                  : position.status === 'open' ? 'rgba(68,255,151,0.2)'
                  : isUnwindingPos ? 'rgba(91,156,245,0.2)'
                  : isInFlight ? 'rgba(245,166,35,0.2)'
                  : 'rgba(136,136,136,0.2)'
              }
            />
          </>
        }
      />

      <div style={{ padding: '0 24px 24px' }}>
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
              marginBottom: 14,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <span style={{ fontSize: 12, color: '#A78BFA', lineHeight: 1.4 }}>
              Market voided — all tokens settling at $0.50
            </span>
          </div>
        )}

        {isUnwindingPos && !isVoided && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(91,156,245,0.06)',
              border: '1px solid rgba(91,156,245,0.18)',
              borderRadius: 0,
              padding: '10px 12px',
              marginBottom: 14,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B9CF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ fontSize: 12, color: '#5B9CF5', lineHeight: 1.4 }}>
              Deleveraging in progress.
            </span>
          </div>
        )}

        {isFullyDeleveraged && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(68,255,151,0.06)',
              border: '1px solid rgba(68,255,151,0.15)',
              borderRadius: 0,
              padding: '10px 12px',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--green)', lineHeight: 1.4 }}>
              This position has no liquidation risk. Your remaining funds are fully yours.
            </span>
          </div>
        )}

        <StatGroup label="Pricing">
          <StatRow label="Quote Price" value={`$${position.entry.priceUsd}`} />
          <StatRow
            label="Filled Price"
            value={filledPrice ? `$${filledPrice}` : 'Pending fill'}
            valueColor={filledPrice ? undefined : 'var(--text-muted)'}
          />
          <StatRow
            label={isVoided ? 'Settlement Price' : 'Current Price'}
            value={`$${position.current.markPriceUsd}`}
            valueColor={isVoided ? '#A78BFA' : undefined}
          />
          {!isVoided && (
            <StatRow label="Exit Price" value={`$${position.current.markPriceUsd}`} />
          )}
          {!isFullyDeleveraged && !isVoided && (
            <>
              <StatRow
                label="Liquidation Price"
                value={`$${position.risk.currentLiquidationPriceUsd}`}
                valueColor="#F5A623"
              />
              <StatRow label="Distance to liquidation" value={distancePctDisplay} />
            </>
          )}
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
          {!isFullyDeleveraged && (
            <StatRow
              label="Margin Buffer"
              value={`$${parseFloat(position.risk.marginBufferUsd).toFixed(2)}`}
            />
          )}
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
            label="Origination Fee"
            value={`$${parseFloat(position.entry.originationFeeUsd).toFixed(2)} (${(position.entry.originationFeeBps / 100).toFixed(2)}%)`}
          />
          <StatRow
            label="Time-based fees accrued"
            value={`$${accruedFees.toFixed(2)}`}
            valueColor="var(--text-muted)"
          />
          <StatRow label="Time-based fee rate" value="0.01% APR" />
          <StatRow
            label="Total fees paid"
            value={`$${(parseFloat(position.entry.originationFeeUsd) + accruedFees).toFixed(2)}`}
            valueColor="var(--text)"
          />
          <StatRow
            label="Execution Slippage"
            value={slippageText ?? 'Pending fill'}
            valueColor={slippageColor}
          />
        </StatGroup>

        <StatGroup label="Leverage">
          <StatRow
            label="Starting"
            value={`${(position.entry.leverageBps / 10000).toFixed(1)}x`}
          />
          <StatRow
            label="Current"
            value={`${(position.current.bookLeverageBps / 10000).toFixed(1)}x`}
          />
          <StatRow
            label="Weighted"
            value={`${(position.effectiveLeverageBps / 10000).toFixed(1)}x`}
          />
          <div style={{ marginTop: 10 }}>
            <LeverageChart unwinds={unwinds} isLoading={isUnwindsLoading} />
          </div>
        </StatGroup>

        <StatGroup label="Timing" last>
          {!isVoided && (
            <StatRow label="Time to Resolution" value={timeDisplay} />
          )}
          <StatRow label="Market Status" value={isVoided ? 'Voided' : position.timing.marketStatus} />
          {position.timing.isSettlementPending && (
            <StatRow
              label="Settlement"
              value="Pending"
              valueColor={isVoided ? '#A78BFA' : '#F5A623'}
            />
          )}
        </StatGroup>

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

        <ErrorBanner error={actionError} onDismiss={dismissError} />
      </div>
    </div>
  )
}

const reasonLabels: Record<string, string> = {
  closed: 'Closed',
  settled: 'Settled',
  liquidated: 'Liquidated',
  reverted: 'Reverted',
  cancelled: 'Cancelled',
}

const FAILURE_COPY: Record<string, string> = {
  price_exceeded_tolerance:
    'Polymarket price moved or the order book thinned beyond your slippage tolerance before the order could fill. Your collateral was returned and no position was opened.',
  expired:
    'The Polymarket order expired before it could fill. Your collateral was returned and no position was opened.',
  failed:
    'The Polymarket order could not be executed. Your collateral was returned and no position was opened.',
  kalshi_order_max_retries_exhausted:
    'The Kalshi order failed after multiple retries. Your collateral was returned and no position was opened.',
}

const GENERIC_FAILURE_COPY =
  'Your position could not be opened and your collateral was returned.'

const BULL_RETRY_PREFIX = 'Bull job max retries: '

function describeFailureReason(code: string | null | undefined): string {
  if (!code) return GENERIC_FAILURE_COPY
  if (FAILURE_COPY[code]) return FAILURE_COPY[code]
  if (code.startsWith(BULL_RETRY_PREFIX)) {
    const cause = code.slice(BULL_RETRY_PREFIX.length).trim()
    if (cause) return `Execution failed after multiple retries: ${cause}.`
  }
  return GENERIC_FAILURE_COPY
}

function ClosedPositionDetail({
  position,
  unwinds,
  isUnwindsLoading = false,
  onClose,
}: {
  position: ClosedPosition
  unwinds?: PositionUnwindList
  isUnwindsLoading?: boolean
  onClose: () => void
}) {
  const displayTitle = position.marketTitle || position.marketTicker

  const realizedPnl = parseFloat(position.result.realizedPnlUsd)
  const pnlColor = realizedPnl >= 0 ? 'var(--green)' : 'var(--red)'
  const pnlPrefix = realizedPnl >= 0 ? '+' : ''
  const entryCollateral = parseFloat(position.entry.collateralUsd)
  const roePct = entryCollateral > 0 ? (realizedPnl / entryCollateral) * 100 : 0

  const filledPrice = position.entry.effectiveEntryPriceUsd
  const slippageBps = position.entry.effectiveSlippageBps
  const slippageText = formatSlippageBps(slippageBps)
  const slippageColor =
    slippageBps == null
      ? 'var(--text-muted)'
      : slippageBps > 0
      ? 'var(--red)'
      : slippageBps < 0
      ? 'var(--green)'
      : 'var(--text)'

  const reason = reasonLabels[position.closeReason] || position.closeReason
  const isLiquidated = position.closeReason === 'liquidated'
  const isReverted = position.closeReason === 'reverted'
  const isCancelled = position.closeReason === 'cancelled'
  const rawFailureCode = position.failure?.reason ?? null
  const showFailureExplanation = isReverted || (isCancelled && !!rawFailureCode)
  const failureExplanation = showFailureExplanation
    ? describeFailureReason(rawFailureCode)
    : null

  return (
    <div>
      <DrawerHeader
        title={displayTitle}
        marketTicker={position.marketTicker}
        positionId={position.id}
        onClose={onClose}
        badges={
          <Badge
            label={reason}
            color={isLiquidated || isReverted ? 'var(--red)' : 'var(--text-muted)'}
            bg={isLiquidated || isReverted ? 'var(--red-soft)' : 'var(--surface-subtle)'}
            borderColor={
              isLiquidated || isReverted ? 'rgba(224,82,82,0.2)' : 'var(--border)'
            }
          />
        }
      />

      <div style={{ padding: '0 24px 24px' }}>
        {failureExplanation && (
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.4,
              color: 'var(--text)',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 0,
              padding: '8px 10px',
              marginBottom: 14,
            }}
          >
            {failureExplanation}
          </div>
        )}

        <PnlHero
          label="Realized PnL"
          value={`${pnlPrefix}$${Math.abs(realizedPnl).toFixed(2)}`}
          pctValue={`${pnlPrefix}${roePct.toFixed(1)}%`}
          color={pnlColor}
        />

        <StatGroup
          label="Pricing"
          accent="rgba(255,255,255,0.08)"
          accentText="var(--text-dim)"
        >
          <StatRow label="Quote Price" value={`$${position.entry.priceUsd}`} />
          <StatRow
            label="Filled Price"
            value={filledPrice ? `$${filledPrice}` : 'Pending fill'}
            valueColor={filledPrice ? undefined : 'var(--text-muted)'}
          />
        </StatGroup>

        <StatGroup
          label="Result"
          accent="rgba(255,255,255,0.08)"
          accentText="var(--text-dim)"
        >
          <StatRow
            label="Realized PnL / ROE"
            value={`${pnlPrefix}$${Math.abs(realizedPnl).toFixed(2)} (${pnlPrefix}${roePct.toFixed(1)}%)`}
            valueColor={pnlColor}
          />
          <StatRow
            label="Proceeds"
            value={`$${position.result.proceedsUsd}`}
            valueColor={pnlColor}
          />
          <StatRow label="Total Fees" value={`$${position.fees.totalFeesUsd}`} />
          <StatRow label="Origination Fee" value={`$${position.fees.originationFeeUsd}`} />
          <StatRow label="Lifetime Fee" value={`$${position.fees.totalLifetimeFeeUsd}`} />
          <StatRow
            label="Execution Slippage"
            value={slippageText ?? 'Pending fill'}
            valueColor={slippageColor}
          />
        </StatGroup>

        <StatGroup
          label="Leverage"
          accent="rgba(255,255,255,0.08)"
          accentText="var(--text-dim)"
          last
        >
          <StatRow
            label="Starting"
            value={`${(position.entry.leverageBps / 10000).toFixed(1)}x`}
          />
          <StatRow
            label="Effective"
            value={`${(position.effectiveLeverageBps / 10000).toFixed(1)}x`}
          />
          <div style={{ marginTop: 10 }}>
            <LeverageChart
              unwinds={unwinds}
              isLoading={isUnwindsLoading}
              endAt={position.result.closedAt ? new Date(position.result.closedAt) : undefined}
            />
          </div>
        </StatGroup>
      </div>
    </div>
  )
}
