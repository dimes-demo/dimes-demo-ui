import type { QuoteHint, HintAdjustment } from '../api/quote-error-hints'

interface Props {
  hint: QuoteHint
  adjustment: HintAdjustment
}

/**
 * Renders a calm one-line caption describing what the system did (or why it
 * couldn't). When `adjustment` is non-null, the affected input has already
 * been auto-adjusted and animated — this is the verbal confirmation. When the
 * hint is non-actionable (`market-full`, etc.), we surface the explanation.
 */
export function QuoteErrorHint({ hint, adjustment }: Props) {
  if (!hint) return null

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
            : `Capped leverage at ${adjustment.toLabel} — try again.`
        break
      case 'slippage':
        text = `Raised slippage tolerance to ${adjustment.toLabel} — try again.`
        break
    }
  } else {
    tone = 'red'
    switch (hint.kind) {
      case 'market-full':
        text = 'This market is currently full — try again in a moment.'
        break
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
        borderRadius: 10,
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
