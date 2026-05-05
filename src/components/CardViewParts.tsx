import { type ReactNode, useRef, useState, useEffect } from 'react'
import type { ViewMode } from '../hooks/useViewMode'

export function ViewToggle({
  mode,
  onChange,
  accent = 'var(--yellow)',
  accentInk = 'var(--yellow-ink)',
}: {
  mode: ViewMode
  onChange: (m: ViewMode) => void
  accent?: string
  accentInk?: string
}) {
  const options: { key: ViewMode; label: string }[] = [
    { key: 'simple', label: 'Simple' },
    { key: 'advanced', label: 'Advanced' },
  ]
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        padding: 2,
        marginBottom: 4,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: 0,
      }}
    >
      {options.map((opt) => {
        const active = mode === opt.key
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            style={{
              appearance: 'none',
              border: 0,
              padding: '4px 14px',
              borderRadius: 0,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              color: active ? accentInk : 'var(--text-muted)',
              background: active ? accent : 'transparent',
              transition: 'background 0.18s ease, color 0.18s ease',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function MicroStat({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  const prevRef = useRef(value)
  const [flashKey, setFlashKey] = useState(0)

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value
      setFlashKey((k) => k + 1)
    }
  }, [value])

  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
      <div
        key={flashKey}
        className={flashKey > 0 ? 'micro-stat-flash' : undefined}
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: valueColor || 'var(--text)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          borderRadius: 2,
        }}
      >
        {value}
      </div>
    </div>
  )
}

export function StatGroup({
  label,
  children,
  last,
  accent = 'rgba(255,255,255,0.08)',
  accentText = 'var(--text-dim)',
}: {
  label: string
  children: ReactNode
  last?: boolean
  accent?: string
  accentText?: string
}) {
  return (
    <div
      style={{
        paddingTop: 12,
        paddingBottom: last ? 4 : 12,
        borderBottom: last ? 'none' : '1px dashed rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: accentText,
            opacity: 0.75,
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <div
          style={{
            flex: 1,
            height: 1,
            background: `linear-gradient(90deg, ${accent}, transparent)`,
          }}
        />
      </div>
      {children}
    </div>
  )
}

export function PnlHero({
  label,
  value,
  pctValue,
  color,
}: {
  label: string
  value: string
  pctValue?: string
  color: string
}) {
  return (
    <div
      style={{
        padding: '14px 0 18px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.2,
          }}
        >
          {value}
        </span>
        {pctValue && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color,
              opacity: 0.7,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pctValue}
          </span>
        )}
      </div>
    </div>
  )
}

export const fadeInKeyframes = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(2px); }
    to { opacity: 1; transform: translateY(0); }
  }
`
