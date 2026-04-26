import { useState } from 'react'
import type { ClosedPosition, PositionUnwindList } from '../api/types'
import { useMarketTitle } from '../hooks/useMarketTitle'
import { CardShell } from './CardShell'
import { StatRow } from './StatRow'
import { LeverageChart } from './LeverageChart'
import {
  MicroStat,
  PnlHero,
  StatGroup,
  ViewToggle,
  fadeInKeyframes,
  useViewMode,
} from './CardViewParts'

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

export function SettledCard({
  position,
  unwinds,
  isUnwindsLoading = false,
}: {
  position: ClosedPosition
  unwinds?: PositionUnwindList
  isUnwindsLoading?: boolean
}) {
  const unwindData = unwinds
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [viewMode, setViewMode] = useViewMode('settledCard.viewMode')
  const marketTitle = useMarketTitle(position.marketTicker)
  const displayTitle = marketTitle || position.marketTicker

  const copyToClipboard = (value: string, key: string) => {
    navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500)
  }

  const realizedPnl = parseFloat(position.result.realizedPnlUsd)
  const pnlColor = realizedPnl >= 0 ? 'var(--green)' : 'var(--red)'
  const pnlPrefix = realizedPnl >= 0 ? '+' : ''
  const entryCollateral = parseFloat(position.entry.collateralUsd)
  const roePct = entryCollateral > 0 ? (realizedPnl / entryCollateral) * 100 : 0

  const reason = reasonLabels[position.closeReason] || position.closeReason
  const isLiquidated = position.closeReason === 'liquidated'
  const isReverted = position.closeReason === 'reverted'
  const isCancelled = position.closeReason === 'cancelled'
  const rawFailureCode = position.failure?.reason ?? null
  const showFailureExplanation =
    (isReverted || (isCancelled && !!rawFailureCode))
  const failureExplanation = showFailureExplanation
    ? describeFailureReason(rawFailureCode)
    : null
  const isUnknownFailure =
    showFailureExplanation &&
    !!rawFailureCode &&
    !FAILURE_COPY[rawFailureCode] &&
    !rawFailureCode.startsWith(BULL_RETRY_PREFIX)

  return (
    <CardShell variant="settled">
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
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isLiquidated || isReverted ? 'var(--red)' : 'var(--text-muted)',
                background: isLiquidated || isReverted
                  ? 'var(--red-soft)'
                  : 'var(--surface-subtle)',
                border: `1px solid ${
                  isLiquidated || isReverted
                    ? 'rgba(224,82,82,0.2)'
                    : 'var(--border)'
                }`,
                borderRadius: 0,
                padding: '2px 8px',
                textTransform: 'uppercase',
              }}
            >
              {reason}
            </span>
          </div>
        </div>

        {failureExplanation && (
          <div
            title={isUnknownFailure && rawFailureCode ? rawFailureCode : undefined}
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

        <ViewToggle
          mode={viewMode}
          onChange={setViewMode}
          accent="var(--text-dim)"
          accentInk="var(--bg)"
        />

        {viewMode === 'simple' ? (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <PnlHero
              label="Realized PnL"
              value={`${pnlPrefix}$${Math.abs(realizedPnl).toFixed(2)}`}
              pctValue={`${pnlPrefix}${roePct.toFixed(1)}%`}
              color={pnlColor}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px 18px',
              }}
            >
              <MicroStat label="Entry price" value={`$${position.entry.priceUsd}`} />
              <MicroStat
                label="Proceeds"
                value={`$${position.result.proceedsUsd}`}
                valueColor={pnlColor}
              />
              <MicroStat label="Total fees" value={`$${position.fees.totalFeesUsd}`} />
              <MicroStat
                label="Effective leverage"
                value={`${(position.effectiveLeverageBps / 10000).toFixed(1)}x`}
              />
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <StatGroup
              label="Pricing"
              accent="rgba(255,255,255,0.08)"
              accentText="var(--text-dim)"
            >
              <StatRow label="Entry Price" value={`$${position.entry.priceUsd}`} />
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
              <StatRow
                label="Origination Fee"
                value={`$${position.fees.originationFeeUsd}`}
              />
              <StatRow
                label="Lifetime Fee"
                value={`$${position.fees.totalLifetimeFeeUsd}`}
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
                  unwinds={unwindData}
                  isLoading={isUnwindsLoading}
                  endAt={position.result.closedAt ? new Date(position.result.closedAt) : undefined}
                />
              </div>
            </StatGroup>
          </div>
        )}

        <style>{fadeInKeyframes}</style>
      </div>
    </CardShell>
  )
}
