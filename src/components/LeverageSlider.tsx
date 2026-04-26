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
  const displayValue = (value / 10000).toFixed(value % 10000 === 0 ? 0 : 1)

  if (maxSteps === 0) {
    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Leverage
          </span>
          <span
            style={{
              color: 'var(--yellow)',
              fontSize: 18,
              fontWeight: 700,
              fontFamily: 'var(--font)',
              textShadow:
                '0 0 20px rgba(238,255,0,0.55), 0 0 50px rgba(238,255,0,0.35), 0 0 80px rgba(238,255,0,0.18)',
            }}
          >
            {displayValue}x
          </span>
        </div>
        <div
          style={{
            color: 'var(--text-dim)',
            fontSize: 10,
            marginTop: 6,
          }}
        >
          Fixed for this market
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
        }}
      >
        <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
          Leverage
        </span>
        <span
          style={{
            color: 'var(--yellow)',
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'var(--font)',
            textShadow:
              '0 0 20px rgba(238,255,0,0.55), 0 0 50px rgba(238,255,0,0.35), 0 0 80px rgba(238,255,0,0.18)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayValue}x
        </span>
      </div>

      {/* Track container */}
      <div style={{ position: 'relative', height: 24 }}>
        {/* Track background */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 2,
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 0,
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
            height: 2,
            transform: 'translateY(-50%)',
            background: 'linear-gradient(90deg, transparent, #EEFF00)',
            borderRadius: 0,
            transition: 'width 0.1s ease',
          }}
        />

        {/* Step dots */}
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
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: isActive ? 'rgba(238,255,0,0.6)' : 'rgba(255,255,255,0.15)',
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
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--yellow)',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 8px rgba(238,255,0,0.7)',
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
          marginTop: 6,
        }}
      >
        <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>
          {(min / 10000).toFixed(min % 10000 === 0 ? 0 : 1)}x
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>
          {(effectiveMax / 10000).toFixed(effectiveMax % 10000 === 0 ? 0 : 1)}x
        </span>
      </div>
    </div>
  )
}
