/**
 * Resolves API error responses from the quote endpoint into discriminated UI
 * hints. The set of error codes that carry hints will grow over time — keep
 * this dispatch table generic and treat the camelized `params` object as the
 * contract.
 *
 * Pip values arrive as decimal strings (snake_case `available_capacity_usd_pips`
 * → camelCase `availableCapacityUsdPips`). Bps values arrive as numbers.
 */

import { bpsToMultiplier, formatUsd } from '../utils/format';

const PIPS_PER_USD = 10_000;
const BPS_PER_UNIT = 10_000;

export const MARKET_MOVED_CODES = new Set([
  'quote_slippage_too_high',
  'quote_insufficient_liquidity',
  'quote_entry_price_out_of_range',
  'quote_entry_bid_depth_too_low',
  'quote_entry_depth_too_low',
  'quote_entry_spread_too_wide',
  'quote_side_capacity_exceeded',
]);

export type QuoteHint =
  | { kind: 'use-max-collateral'; maxCollateralUsd: number; minCollateralUsd: number }
  | { kind: 'clamp-leverage'; maxLeverageBps?: number }
  | { kind: 'raise-leverage'; minLeverageBps: number }
  | { kind: 'raise-slippage'; currentSlippageBps: number; maxSlippageBps: number }
  | { kind: 'market-full' }
  | null;

type Params = Record<string, unknown> | null | undefined;

function num(params: Params, key: string): number | null {
  if (!params) return null;
  const raw = params[key];
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  return Number.isFinite(n) ? n : null;
}

function pipsToUsd(pips: number): number {
  return pips / PIPS_PER_USD;
}

function notionalPipsToCollateralUsd(notionalPips: number, leverageBps: number): number | null {
  if (!Number.isFinite(leverageBps) || leverageBps <= 0) return null;
  return (notionalPips * BPS_PER_UNIT) / leverageBps / PIPS_PER_USD;
}

function resolveMaxCollateralHint(
  params: Params,
  context: { leverageBps: number },
  capacityKey: string,
): QuoteHint {
  const serverMaxCollateralPips = num(params, 'maxSupportedCollateralUsdPips');
  const capacityPips = num(params, capacityKey);
  const minNotionalPips = num(params, 'minNotionalUsdPips');

  const maxCollateralUsd =
    serverMaxCollateralPips !== null
      ? pipsToUsd(serverMaxCollateralPips)
      : capacityPips !== null
        ? notionalPipsToCollateralUsd(capacityPips, context.leverageBps)
        : null;

  const minCollateralUsd =
    minNotionalPips !== null
      ? notionalPipsToCollateralUsd(minNotionalPips, context.leverageBps)
      : null;

  if (maxCollateralUsd === null || minCollateralUsd === null) return null;
  if (maxCollateralUsd < minCollateralUsd) return { kind: 'market-full' };
  return { kind: 'use-max-collateral', maxCollateralUsd, minCollateralUsd };
}

export function quoteErrorHint(
  code: string | null,
  params: Params,
  context: { leverageBps: number },
): QuoteHint {
  if (!code) return null;

  switch (code) {
    case 'quote_side_capacity_exceeded':
    case 'quote_user_position_limit_exceeded':
    case 'quote_market_position_limit_exceeded':
    case 'quote_side_position_limit_exceeded':
    case 'quote_global_position_limit_exceeded':
    case 'quote_partner_position_limit_exceeded':
      return resolveMaxCollateralHint(params, context, 'availableCapacityUsdPips');

    case 'quote_insufficient_liquidity':
    case 'notional_selector_insufficient_liquidity':
      return resolveMaxCollateralHint(params, context, 'slippageMaxUsdPips');

    case 'quote_leverage_exceeds_maximum':
    case 'quote_leverage_exceeds_model_max': {
      const maxLeverageBps = num(params, 'maxLeverageBps');
      if (maxLeverageBps === null) return null;
      return { kind: 'clamp-leverage', maxLeverageBps };
    }

    case 'quote_leverage_too_high_for_price': {
      const maxLeverageBps = num(params, 'maxAcceptableLeverageBps');
      if (maxLeverageBps === null) return null;
      return { kind: 'clamp-leverage', maxLeverageBps };
    }

    case 'quote_leverage_below_minimum': {
      const minLeverageBps = num(params, 'minLeverageBps');
      if (minLeverageBps === null) return null;
      return { kind: 'raise-leverage', minLeverageBps };
    }

    case 'quote_slippage_too_high': {
      const currentSlippageBps = num(params, 'currentSlippageBps');
      const maxSlippageBps = num(params, 'maxSlippageBps');
      if (currentSlippageBps === null || maxSlippageBps === null) return null;
      return { kind: 'raise-slippage', currentSlippageBps, maxSlippageBps };
    }

    default:
      return null;
  }
}

export type CorrectedField = 'collateral' | 'leverage' | 'slippage';

export type HintAdjustment =
  | {
      field: 'collateral';
      fromValue: number; // USD
      toValue: number; // USD
      toLabel: string;
      reason: 'max-collateral';
    }
  | {
      field: 'leverage';
      fromValue: number; // bps
      toValue: number; // bps
      toLabel: string;
      reason: 'clamp-max' | 'raise-min';
    }
  | {
      field: 'slippage';
      fromValue: number; // bps
      toValue: number; // bps
      toLabel: string;
      reason: 'raise-slippage';
    }
  | null;

/**
 * Translates a `QuoteHint` plus current input state into a concrete adjustment
 * the UI should apply: which field, what to set it to, and a human-readable
 * label for the after-the-fact caption. Returns `null` when the hint isn't
 * actionable (e.g. `market-full`, leverage hints with no max).
 */
export function hintAdjustment(
  hint: QuoteHint,
  current: { collateralUsd: number; leverageBps: number; slippageBps: number },
): HintAdjustment {
  if (!hint) return null;
  switch (hint.kind) {
    case 'use-max-collateral': {
      const to = Math.max(0, Math.floor(hint.maxCollateralUsd * 100) / 100);
      if (to <= 0) return null;
      return {
        field: 'collateral',
        fromValue: current.collateralUsd,
        toValue: to,
        toLabel: formatUsd(to),
        reason: 'max-collateral',
      };
    }
    case 'clamp-leverage': {
      if (hint.maxLeverageBps === undefined) return null;
      return {
        field: 'leverage',
        fromValue: current.leverageBps,
        toValue: hint.maxLeverageBps,
        toLabel: bpsToMultiplier(hint.maxLeverageBps),
        reason: 'clamp-max',
      };
    }
    case 'raise-leverage':
      return {
        field: 'leverage',
        fromValue: current.leverageBps,
        toValue: hint.minLeverageBps,
        toLabel: bpsToMultiplier(hint.minLeverageBps),
        reason: 'raise-min',
      };
    case 'raise-slippage':
      return {
        field: 'slippage',
        fromValue: hint.currentSlippageBps,
        toValue: hint.maxSlippageBps,
        toLabel: `${(hint.maxSlippageBps / 100).toFixed(2).replace(/\.?0+$/, '')}%`,
        reason: 'raise-slippage',
      };
    case 'market-full':
      return null;
  }
}
