import type { PositionCurrent, PositionTiming } from '../api/types'

const resolvedStatuses = new Set(['closed', 'determined', 'finalized'])

export function isResolved(timing: PositionTiming): boolean {
  return resolvedStatuses.has(timing.marketStatus)
    || timing.isSettlementPending
    || timing.timeToCloseMinutes === 0
}

export function marketLeverageX(current: PositionCurrent): number {
  const equity = parseFloat(current.effectiveCollateralUsd)
  const value = parseFloat(current.positionValueUsd)
  return equity > 0 ? value / equity : 0
}
