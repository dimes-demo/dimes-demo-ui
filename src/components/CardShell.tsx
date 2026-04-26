import { type ReactNode, type CSSProperties, useState } from 'react'

type CardVariant = 'yellow' | 'settled'

const variantStyles: Record<
  CardVariant,
  { glowColor: string; accentColor: string; borderColor: string; borderHoverColor: string }
> = {
  yellow: {
    glowColor: 'rgba(238,255,0,0.06)',
    accentColor: 'var(--yellow)',
    borderColor: 'var(--border)',
    borderHoverColor: 'var(--border-strong)',
  },
  settled: {
    glowColor: 'rgba(255,255,255,0.03)',
    accentColor: 'var(--text-dim)',
    borderColor: 'var(--border)',
    borderHoverColor: 'rgba(255,255,255,0.1)',
  },
}

export function CardShell({
  variant = 'yellow',
  children,
  onClick,
  style,
  className,
}: {
  variant?: CardVariant
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
  className?: string
}) {
  const v = variantStyles[variant]
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
      style={{
        background: `linear-gradient(180deg, var(--card) 0%, var(--card) 85%, ${v.glowColor} 100%)`,
        border: `1px solid ${hovered ? v.borderHoverColor : v.borderColor}`,
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s ease',
        ...style,
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '10%',
          right: '10%',
          height: 1,
          background: `linear-gradient(90deg, transparent, ${v.accentColor}, transparent)`,
          opacity: 0.4,
        }}
      />
    </div>
  )
}
