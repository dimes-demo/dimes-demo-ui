export function LeverageSlider({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  const maxSteps = Math.max(0, Math.floor((max - min) / step))
  const effectiveMax = min + maxSteps * step
  const steps: number[] = []
  for (let i = 0; i <= maxSteps; i++) {
    steps.push(min + i * step)
  }

  const snap = (v: number) => {
    const clamped = Math.min(Math.max(v, min), effectiveMax)
    const k = Math.round((clamped - min) / step)
    return min + Math.min(Math.max(k, 0), maxSteps) * step
  }

  const range = effectiveMax - min
  const pct = range > 0 ? ((value - min) / range) * 100 : 0
  const displayValue = (value / 10000).toFixed(2)

  if (maxSteps === 0) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: 'var(--radius)',
            background: 'var(--card-elevated)',
            border: '1px solid rgba(238,255,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Leverage</span>
            <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
              Fixed for this market
            </span>
          </div>
          <span
            style={{
              color: 'var(--yellow)',
              fontSize: 20,
              fontWeight: 700,
              fontFamily: 'var(--font)',
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(238,255,0,0.08)',
              border: '1px solid rgba(238,255,0,0.25)',
            }}
          >
            {displayValue}x
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Value label */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Leverage</span>
        <span
          style={{
            color: 'var(--yellow)',
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'var(--font)',
          }}
        >
          {displayValue}x
        </span>
      </div>

      {/* Track container */}
      <div style={{ position: 'relative', height: 32 }}>
        {/* Track background */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 4,
            transform: 'translateY(-50%)',
            background: 'var(--card-elevated)',
            borderRadius: 2,
          }}
        />

        {/* Filled track */}
        <div
          className="leverage-fill"
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: `${pct}%`,
            height: 4,
            transform: 'translateY(-50%)',
            background: 'linear-gradient(90deg, #484D00, #EEFF00)',
            borderRadius: 2,
            transition: 'width 0.1s ease',
          }}
        />

        {/* Dots */}
        {steps.map((s) => {
          const dotPct = range > 0 ? ((s - min) / range) * 100 : 50
          const isActive = s <= value
          return (
            <div
              key={s}
              style={{
                position: 'absolute',
                top: '50%',
                left: `${dotPct}%`,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isActive ? 'var(--yellow)' : '#333',
                transform: 'translate(-50%, -50%)',
                transition: 'background 0.15s ease',
                zIndex: 1,
              }}
            />
          )
        })}

        {/* Thumb */}
        <div
          className="leverage-thumb"
          style={{
            position: 'absolute',
            top: '50%',
            left: `${pct}%`,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--yellow)',
            border: '2px solid #0C0C0C',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 12px rgba(238,255,0,0.4)',
            zIndex: 2,
            transition: 'left 0.1s ease',
          }}
        />

        {/* Hidden range input */}
        <input
          type="range"
          min={min}
          max={effectiveMax}
          step={step}
          value={value}
          onChange={(e) => onChange(snap(Number(e.target.value)))}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            zIndex: 3,
            margin: 0,
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
        }}
      >
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
          {(min / 10000).toFixed(2)}x
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
          {(effectiveMax / 10000).toFixed(2)}x
        </span>
      </div>
    </div>
  )
}
