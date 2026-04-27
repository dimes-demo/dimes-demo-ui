import { useMemo } from 'react'
import type { Market } from '../api/types'
import { computeCapacityBounds } from '../utils/capacity'
import { formatUsd } from '../utils/format'

interface Props {
  market: Market
  side: 'yes' | 'no'
  leverageBps: number
  collateralUsd: number
}

export function CapacityGuide({ market, side, leverageBps, collateralUsd }: Props) {
  const bounds = useMemo(
    () => computeCapacityBounds(market, side, leverageBps, collateralUsd),
    [market, side, leverageBps, collateralUsd],
  )

  if (bounds.maxCollateralUsd == null) return null

  if (!bounds.isViable) {
    return (
      <div
        style={{
          marginTop: 10,
          padding: '8px 12px',
          background: 'var(--red-soft)',
          border: '1px solid var(--red-border)',
          fontSize: 12,
          color: 'var(--red)',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>!</span>
        Reduce leverage to trade {side.toUpperCase()}
      </div>
    )
  }

  const overCapacity = collateralUsd > bounds.maxCollateralUsd
  const underMinimum = collateralUsd > 0 && collateralUsd < bounds.minCollateralUsd
  const fillPct = bounds.utilizationPct ?? 0

  const barColor = overCapacity
    ? 'var(--red)'
    : fillPct > 80
      ? 'rgba(245, 196, 81, 0.9)'
      : 'var(--yellow)'

  return (
    <div
      style={{
        marginTop: 10,
        padding: '8px 12px',
        background: 'var(--surface-subtle)',
        border: `1px solid ${overCapacity || underMinimum ? 'var(--red-border)' : 'var(--border)'}`,
        transition: 'border-color 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Est. max collateral
        </span>
        <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {formatUsd(bounds.maxCollateralUsd)}
        </span>
      </div>

      {/* Capacity bar */}
      <div
        style={{
          height: 2,
          background: 'rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${Math.min(100, fillPct)}%`,
            background: barColor,
            transition: 'width 0.2s ease, background 0.2s ease',
          }}
        />
      </div>

      {overCapacity && (
        <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, fontWeight: 500 }}>
          Exceeds capacity &mdash; max {formatUsd(bounds.maxCollateralUsd)}
        </div>
      )}
      {underMinimum && !overCapacity && (
        <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, fontWeight: 500 }}>
          Below minimum &mdash; min {formatUsd(bounds.minCollateralUsd)}
        </div>
      )}
    </div>
  )
}
