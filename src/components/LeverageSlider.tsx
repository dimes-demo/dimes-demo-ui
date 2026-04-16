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
  const steps: number[] = []
  for (let v = min; v <= max; v += step) {
    steps.push(v)
  }

  const pct = ((value - min) / (max - min)) * 100
  const displayValue = (value / 10000).toFixed(2)

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
          const dotPct = ((s - min) / (max - min)) * 100
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
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
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
          {(max / 10000).toFixed(2)}x
        </span>
      </div>
    </div>
  )
}
