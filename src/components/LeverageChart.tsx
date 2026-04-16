import { useRef, useState, useCallback } from 'react'
import type { PositionUnwindList } from '../api/types'

interface ChartPoint {
  date: Date
  leverageBps: number
  isUnwindEvent: boolean
}

function buildChartPoints(unwindList: PositionUnwindList): {
  points: ChartPoint[]
  hasTimeline: boolean
} {
  const points: ChartPoint[] = []
  const now = new Date()
  const hasTimeline = !!unwindList.originatedAt

  if (unwindList.originatedAt) {
    points.push({
      date: new Date(unwindList.originatedAt),
      leverageBps: unwindList.originationLeverageBps,
      isUnwindEvent: false,
    })
  } else {
    // Not yet opened — synthesize a flat line at origination leverage
    points.push({
      date: new Date(now.getTime() - 60 * 60 * 1000),
      leverageBps: unwindList.originationLeverageBps,
      isUnwindEvent: false,
    })
  }

  for (const unwind of unwindList.data) {
    points.push({
      date: new Date(unwind.executedAt),
      leverageBps: unwind.afterLeverageBps,
      isUnwindEvent: true,
    })
  }

  const lastPoint = points[points.length - 1]
  if (!lastPoint || lastPoint.date < now) {
    points.push({
      date: now,
      leverageBps: unwindList.currentLeverageBps,
      isUnwindEvent: false,
    })
  }

  return { points, hasTimeline }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatLeverage(bps: number): string {
  return `${(bps / 10000).toFixed(1)}x`
}

interface TooltipState {
  clientX: number
  clientY: number
  point: ChartPoint
}

const PAD_LEFT = 36
const PAD_RIGHT = 12
const PAD_TOP = 10
const PAD_BOTTOM = 24
const HEIGHT = 130

export function LeverageChart({
  unwinds,
  isLoading,
}: {
  unwinds: PositionUnwindList | undefined
  isLoading: boolean
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [svgWidth, setSvgWidth] = useState(300)

  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setSvgWidth(w)
    })
    ro.observe(node)
    setSvgWidth(node.getBoundingClientRect().width || 300)
  }, [])

  if (isLoading || !unwinds) {
    return (
      <div
        style={{
          background: 'rgba(238,255,0,0.04)',
          border: '1px solid rgba(238,255,0,0.1)',
          borderRadius: 8,
          padding: '12px 14px',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--yellow)',
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Leverage History
        </div>
        <div
          style={{
            height: HEIGHT,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 4,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }`}</style>
      </div>
    )
  }

  const { points, hasTimeline } = buildChartPoints(unwinds)
  if (points.length < 2) return null

  const chartW = svgWidth - PAD_LEFT - PAD_RIGHT
  const chartH = HEIGHT - PAD_TOP - PAD_BOTTOM

  const minTime = points[0].date.getTime()
  const maxTime = points[points.length - 1].date.getTime()
  const timeRange = maxTime - minTime || 1

  const maxLev = Math.max(...points.map((p) => p.leverageBps))
  const minLev = Math.min(...points.map((p) => p.leverageBps))
  const levRange = maxLev - minLev || maxLev * 0.5
  const yMax = maxLev + levRange * 0.2
  const yMin = 10000
  const yRange = yMax - yMin || 1

  const toX = (d: Date) => PAD_LEFT + ((d.getTime() - minTime) / timeRange) * chartW
  const toY = (bps: number) => PAD_TOP + (1 - (bps - yMin) / yRange) * chartH

  // Build step path (post-step: horizontal first, then vertical drop at event)
  let linePath = `M ${toX(points[0].date).toFixed(1)} ${toY(points[0].leverageBps).toFixed(1)}`
  for (let i = 1; i < points.length; i++) {
    const x = toX(points[i].date).toFixed(1)
    const y = toY(points[i].leverageBps).toFixed(1)
    const prevY = toY(points[i - 1].leverageBps).toFixed(1)
    linePath += ` L ${x} ${prevY} L ${x} ${y}`
  }

  const lastX = toX(points[points.length - 1].date).toFixed(1)
  const bottomY = (PAD_TOP + chartH).toFixed(1)
  const firstX = toX(points[0].date).toFixed(1)
  const areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`

  // Pick 2–4 nice Y gridlines
  const rawStep = levRange / 3
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)))
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude
  const gridLevels: number[] = []
  const gridStart = Math.ceil(yMin / niceStep) * niceStep
  for (let v = gridStart; v <= yMax; v += niceStep) {
    gridLevels.push(v)
  }
  // Always include origination + current; prefer those over nearby auto-ticks
  const pinned = [points[0].leverageBps, points[points.length - 1].leverageBps, yMin]
  const MIN_LABEL_PX = 14
  const candidates = [...pinned, ...gridLevels].filter((v) => v >= yMin && v <= yMax)
  const uniqueGridLevels: number[] = []
  for (const v of candidates) {
    const vy = PAD_TOP + (1 - (v - yMin) / yRange) * chartH
    if (uniqueGridLevels.every((u) => Math.abs((PAD_TOP + (1 - (u - yMin) / yRange) * chartH) - vy) >= MIN_LABEL_PX)) {
      uniqueGridLevels.push(v)
    }
  }

  // X-axis ticks
  const xTickIndices = new Set<number>([0, points.length - 1])
  if (points.length > 3) xTickIndices.add(Math.floor(points.length / 2))
  const xTicks = [...xTickIndices].map((i) => points[i].date)

  const hasUnwinds = unwinds.data.length > 0

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    let closest = points[0]
    let minDist = Infinity
    for (const pt of points) {
      const d = Math.abs(toX(pt.date) - mouseX)
      if (d < minDist) {
        minDist = d
        closest = pt
      }
    }
    setTooltip({ clientX: e.clientX, clientY: e.clientY, point: closest })
  }

  return (
    <>
      <div
        style={{
          background: 'rgba(238,255,0,0.04)',
          border: '1px solid rgba(238,255,0,0.1)',
          borderRadius: 8,
          padding: '12px 14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--yellow)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Leverage History
          </div>
          {!hasUnwinds && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>No unwind events yet</div>
          )}
        </div>

        <div ref={measureRef} style={{ width: '100%' }}>
          <svg
            ref={svgRef}
            width={svgWidth}
            height={HEIGHT}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="leverageAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EEFF00" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#EEFF00" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Gridlines + Y labels */}
            {uniqueGridLevels.map((lev) => {
              const gy = toY(lev)
              return (
                <g key={lev}>
                  <line
                    x1={PAD_LEFT}
                    y1={gy}
                    x2={PAD_LEFT + chartW}
                    y2={gy}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD_LEFT - 4}
                    y={gy + 4}
                    textAnchor="end"
                    fontSize={10}
                    fontFamily="var(--font)"
                    fill="var(--text-dim)"
                  >
                    {formatLeverage(lev)}
                  </text>
                </g>
              )
            })}

            {/* Area fill */}
            <path d={areaPath} fill="url(#leverageAreaGrad)" />

            {/* Step line */}
            <path
              d={linePath}
              fill="none"
              stroke="#EEFF00"
              strokeWidth={1.5}
              strokeLinejoin="miter"
            />

            {/* Unwind event dots */}
            {points
              .filter((p) => p.isUnwindEvent)
              .map((p, i) => (
                <circle
                  key={i}
                  cx={toX(p.date)}
                  cy={toY(p.leverageBps)}
                  r={3}
                  fill="#EEFF00"
                  stroke="rgba(12,12,12,0.8)"
                  strokeWidth={1}
                />
              ))}

            {/* Origin dot */}
            <circle
              cx={toX(points[0].date)}
              cy={toY(points[0].leverageBps)}
              r={2.5}
              fill="rgba(238,255,0,0.45)"
            />

            {/* X-axis labels */}
            {hasTimeline && xTicks.map((d, i) => {
              const tx = toX(d)
              const anchor =
                i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'
              return (
                <text
                  key={i}
                  x={tx}
                  y={PAD_TOP + chartH + 16}
                  textAnchor={anchor}
                  fontSize={10}
                  fontFamily="var(--font)"
                  fill="var(--text-dim)"
                >
                  {formatDate(d)}
                </text>
              )
            })}

            {/* Hover crosshair */}
            {tooltip && (() => {
              const hx = toX(tooltip.point.date)
              const hy = toY(tooltip.point.leverageBps)
              return (
                <>
                  <line
                    x1={hx}
                    y1={PAD_TOP}
                    x2={hx}
                    y2={PAD_TOP + chartH}
                    stroke="rgba(238,255,0,0.2)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    pointerEvents="none"
                  />
                  <circle
                    cx={hx}
                    cy={hy}
                    r={4}
                    fill="#EEFF00"
                    stroke="rgba(12,12,12,0.9)"
                    strokeWidth={1.5}
                    pointerEvents="none"
                  />
                </>
              )
            })()}

            {/* Invisible interaction layer */}
            <rect
              x={PAD_LEFT}
              y={PAD_TOP}
              width={chartW}
              height={chartH}
              fill="transparent"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'crosshair' }}
            />
          </svg>
        </div>
      </div>

      {/* Tooltip — fixed position follows mouse */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.clientX + 12,
            top: tooltip.clientY - 40,
            background: 'rgba(20,20,20,0.96)',
            border: '1px solid rgba(238,255,0,0.2)',
            borderRadius: 6,
            padding: '5px 9px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#EEFF00',
              fontFamily: 'var(--font)',
            }}
          >
            {formatLeverage(tooltip.point.leverageBps)}
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              marginTop: 1,
              fontFamily: 'var(--font)',
            }}
          >
            {formatDate(tooltip.point.date)}
            {tooltip.point.isUnwindEvent && (
              <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>· unwind</span>
            )}
          </div>
        </div>
      )}
    </>
  )
}
