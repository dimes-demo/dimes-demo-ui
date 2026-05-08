import type { Market } from '../api/types'
import type { QuoteHint, HintAdjustment } from '../api/quote-error-hints'
import { computeCapacityBounds } from '../utils/capacity'
import { formatUsd } from '../utils/format'

interface Props {
  hint: QuoteHint
  adjustment: HintAdjustment
  market?: Market
  side?: 'yes' | 'no'
  leverageBps?: number
}

export function QuoteErrorHint({ hint, adjustment, market, side, leverageBps }: Props) {
  if (!hint) return null

  const isCapacityHint =
    hint.kind === 'use-max-collateral' || hint.kind === 'market-full'

  if (isCapacityHint && market && side && leverageBps) {
    return (
      <CapacityErrorDetail
        hint={hint}
        adjustment={adjustment}
        market={market}
        side={side}
        leverageBps={leverageBps}
      />
    )
  }

  let text: string
  let tone: 'amber' | 'red' = 'amber'

  if (adjustment) {
    switch (adjustment.field) {
      case 'collateral':
        text = `Adjusted collateral to ${adjustment.toLabel} — try again.`
        break
      case 'leverage':
        text =
          adjustment.reason === 'raise-min'
            ? `Raised leverage to ${adjustment.toLabel} — try again.`
            : `Max leverage updated to ${adjustment.toLabel} — get a new quote.`
        break
      case 'slippage':
        text = `Raised slippage tolerance to ${adjustment.toLabel} — try again.`
        break
    }
  } else {
    tone = 'red'
    switch (hint.kind) {
      case 'clamp-leverage':
        text = 'Leverage is too high for the current price — try a lower value.'
        break
      default:
        return null
    }
  }

  const color = tone === 'amber' ? 'rgba(245, 196, 81, 0.92)' : '#F5A1A1'
  const border = tone === 'amber' ? 'rgba(245, 196, 81, 0.22)' : 'rgba(224, 82, 82, 0.25)'
  const bg = tone === 'amber' ? 'rgba(245, 196, 81, 0.05)' : 'rgba(224, 82, 82, 0.04)'

  return (
    <div
      role="status"
      style={{
        marginTop: 8,
        padding: '10px 14px',
        borderRadius: 0,
        border: `1px solid ${border}`,
        background: bg,
        fontFamily: 'var(--font)',
        fontSize: 13,
        lineHeight: 1.35,
        color,
      }}
    >
      {text}
    </div>
  )
}

function CapacityErrorDetail({
  hint,
  adjustment,
  market,
  side,
  leverageBps,
}: {
  hint: QuoteHint
  adjustment: HintAdjustment
  market: Market
  side: 'yes' | 'no'
  leverageBps: number
}) {
  const bounds = computeCapacityBounds(market, side, leverageBps)
  const otherSide = side === 'yes' ? 'no' : 'yes'
  const otherBounds = computeCapacityBounds(market, otherSide, leverageBps)
  const otherHasMore = otherBounds.isViable && (
    otherBounds.maxCollateralUsd != null &&
    (bounds.maxCollateralUsd == null || otherBounds.maxCollateralUsd > bounds.maxCollateralUsd)
  )

  const isMarketFull = hint?.kind === 'market-full'
  const tone = isMarketFull ? 'red' as const : 'amber' as const
  const color = tone === 'amber' ? 'rgba(245, 196, 81, 0.92)' : '#F5A1A1'
  const dimColor = tone === 'amber' ? 'rgba(245, 196, 81, 0.55)' : 'rgba(245, 161, 161, 0.55)'
  const border = tone === 'amber' ? 'rgba(245, 196, 81, 0.22)' : 'rgba(224, 82, 82, 0.25)'
  const bg = tone === 'amber' ? 'rgba(245, 196, 81, 0.05)' : 'rgba(224, 82, 82, 0.04)'

  return (
    <div
      role="status"
      style={{
        marginTop: 8,
        padding: '10px 14px',
        borderRadius: 0,
        border: `1px solid ${border}`,
        background: bg,
        fontFamily: 'var(--font)',
        fontSize: 13,
        lineHeight: 1.5,
        color,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span style={{ fontWeight: 600 }}>
        {isMarketFull
          ? `${side.toUpperCase()} side is at capacity`
          : `Position exceeds ${side.toUpperCase()} capacity`}
      </span>

      {bounds.isViable && bounds.maxCollateralUsd != null && (
        <span style={{ color: dimColor, fontSize: 12 }}>
          Valid range: {formatUsd(bounds.minCollateralUsd)} &ndash; {formatUsd(bounds.maxCollateralUsd)}
        </span>
      )}

      {adjustment && adjustment.field === 'collateral' && (
        <span style={{ fontSize: 12 }}>
          Collateral adjusted to {adjustment.toLabel} — try again.
        </span>
      )}

      {otherHasMore && (
        <span style={{ color: dimColor, fontSize: 12 }}>
          The {otherSide.toUpperCase()} side has more capacity
          {otherBounds.maxCollateralUsd != null ? ` (up to ${formatUsd(otherBounds.maxCollateralUsd)})` : ''}
        </span>
      )}

      {isMarketFull && !otherHasMore && (
        <span style={{ color: dimColor, fontSize: 12 }}>
          Try again later when positions close
        </span>
      )}

      {!isMarketFull && !bounds.isViable && (
        <span style={{ color: dimColor, fontSize: 12 }}>
          Lower leverage allows larger positions
        </span>
      )}
    </div>
  )
}
