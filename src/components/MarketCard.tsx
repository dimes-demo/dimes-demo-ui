import type { Market } from '../api/types'
import { CardShell } from './CardShell'

export function MarketCard({
  market,
  onSelect,
}: {
  market: Market
  onSelect: (market: Market) => void
}) {
  const maxLeverageYes = (market.leverage.maxYesBps / 10000).toFixed(0)
  const maxLeverageNo = (market.leverage.maxNoBps / 10000).toFixed(0)

  return (
    <CardShell variant="yellow" onClick={() => onSelect(market)}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text)',
            }}
          >
            {market.ticker}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: market.status === 'active' ? 'var(--green)' : 'var(--text-muted)',
              background:
                market.status === 'active'
                  ? 'var(--green-soft)'
                  : 'var(--border)',
              border: `1px solid ${
                market.status === 'active'
                  ? 'rgba(68,255,151,0.2)'
                  : 'var(--border)'
              }`,
              borderRadius: 0,
              padding: '2px 8px',
              textTransform: 'uppercase',
            }}
          >
            {market.status}
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {market.title}
        </p>
      </div>

      {/* Category tag */}
      {market.category && (
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'var(--surface-subtle)',
            borderRadius: 0,
            padding: '2px 8px',
            marginBottom: 12,
          }}
        >
          {market.category}
        </span>
      )}

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>
            Max Leverage
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--yellow)' }}>
            {maxLeverageYes}x YES / {maxLeverageNo}x NO
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>
            Min Notional
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            ${market.minNotionalUsd}
          </div>
        </div>
      </div>
    </CardShell>
  )
}
