import type { Market } from '../api/types'
import { leverageMaxBps } from '../api/types'

const FORCED_LEVERAGE_STEP_BPS = 5000

export interface CapacityBounds {
  minNotionalPips: number
  maxNotionalPips: number | null
  minCollateralUsd: number
  maxCollateralUsd: number | null
  isViable: boolean
  utilizationPct: number | null
}

export function computeCapacityBounds(
  market: Market,
  side: 'yes' | 'no',
  leverageBps: number,
  collateralUsd?: number,
): CapacityBounds {
  const minNotionalPips = Math.max(
    Number(market.minNotionalUsdPips) || 0,
    leverageBps,
  )

  const rawMax = side === 'yes'
    ? market.maxNotionalYesUsdPips
    : market.maxNotionalNoUsdPips
  const maxNotionalPips = rawMax != null ? Number(rawMax) : null

  const minCollateralUsd = Math.ceil((minNotionalPips / leverageBps) * 100) / 100
  const maxCollateralUsd = maxNotionalPips != null
    ? Math.floor((maxNotionalPips / leverageBps) * 100) / 100
    : null

  const isViable = maxNotionalPips != null && minNotionalPips <= maxNotionalPips

  let utilizationPct: number | null = null
  if (maxCollateralUsd != null && maxCollateralUsd > 0 && collateralUsd != null) {
    utilizationPct = Math.min(100, (collateralUsd / maxCollateralUsd) * 100)
  }

  return {
    minNotionalPips,
    maxNotionalPips,
    minCollateralUsd,
    maxCollateralUsd,
    isViable,
    utilizationPct,
  }
}

export function maxViableLeverageBps(
  market: Market,
  side: 'yes' | 'no',
): number | null {
  const rawMax = side === 'yes'
    ? market.maxNotionalYesUsdPips
    : market.maxNotionalNoUsdPips
  if (rawMax == null) return null

  const maxNotionalPips = Number(rawMax)
  if (!Number.isFinite(maxNotionalPips) || maxNotionalPips <= 0) return null

  const step = Math.max(market.leverage.stepBps, FORCED_LEVERAGE_STEP_BPS)
  const sideMax = leverageMaxBps(market.leverage, side)
  const minBps = market.leverage.minBps
  const maxSteps = Math.floor((sideMax - minBps) / step)

  for (let i = maxSteps; i >= 0; i--) {
    const lev = minBps + i * step
    const minNotional = Math.max(Number(market.minNotionalUsdPips) || 0, lev)
    if (minNotional <= maxNotionalPips) return lev
  }

  return null
}
