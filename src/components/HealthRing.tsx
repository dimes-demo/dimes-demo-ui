export function HealthRing({
  healthBps,
  size = 48,
}: {
  healthBps: number
  size?: number
}) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(healthBps / 10000, 0), 1)
  const dashOffset = circumference * (1 - progress)

  let color = 'var(--green)' // green
  if (healthBps < 2500) {
    color = 'var(--red)' // red
  } else if (healthBps < 5000) {
    color = '#F5A623' // amber
  }

  const pct = Math.round(progress * 100)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={3}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.24,
          fontWeight: 600,
          color,
        }}
      >
        {pct}%
      </div>
    </div>
  )
}
