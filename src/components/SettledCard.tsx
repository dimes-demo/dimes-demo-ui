import type { ClosedPosition } from '../api/types'
import { CardShell } from './CardShell'
import { StatRow } from './StatRow'

const reasonLabels: Record<string, string> = {
  closed: 'Closed',
  settled: 'Settled',
  liquidated: 'Liquidated',
}

export function SettledCard({ position }: { position: ClosedPosition }) {
  const realizedPnl = parseFloat(position.result.realizedPnlUsd)
  const pnlColor = realizedPnl >= 0 ? 'var(--green)' : 'var(--red)'
  const pnlPrefix = realizedPnl >= 0 ? '+' : ''

  const reason = reasonLabels[position.closeReason] || position.closeReason
  const isLiquidated = position.closeReason === 'liquidated'

  return (
    <CardShell variant="settled">
      <div style={{ position: 'relative', zIndex: 1, padding: '22px 24px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {position.marketTicker}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isLiquidated ? 'var(--red)' : 'var(--text-muted)',
                background: isLiquidated
                  ? 'var(--red-soft)'
                  : 'var(--surface-subtle)',
                border: `1px solid ${
                  isLiquidated
                    ? 'rgba(224,82,82,0.2)'
                    : 'var(--border)'
                }`,
                borderRadius: 4,
                padding: '2px 8px',
                textTransform: 'uppercase',
              }}
            >
              {reason}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Position {reason.toLowerCase()}
          </div>
        </div>

        {/* Stats */}
        <StatRow label="Side" value={position.side.toUpperCase()} />
        <StatRow label="Entry Price" value={`$${position.entry.priceUsd}`} />
        <StatRow
          label="PnL"
          value={`${pnlPrefix}$${Math.abs(realizedPnl).toFixed(2)}`}
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
          label="Fees"
          value={`$${position.fees.totalFeesUsd}`}
        />
        <StatRow
          label="Proceeds"
          value={`$${position.result.proceedsUsd}`}
          valueColor={pnlColor}
        />

        {/* Settlement link */}
        <button
          onClick={() => { /* no-op for now */ }}
          style={{
            width: '100%',
            padding: '10px 0',
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            marginTop: 12,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)' }}
        >
          View full settlement details →
        </button>
      </div>
    </CardShell>
  )
}
