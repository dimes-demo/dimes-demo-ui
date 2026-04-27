import { ApiError } from './client';

/**
 * Friendly, user-facing copy for every API error code defined in the Dimes
 * backend (`src/common/api/error/error-codes.const.ts`). The API returns
 * errors as `{ error: { code, message, params } }`. The `code` is a stable
 * snake_case identifier — match on it here, never on the message string.
 *
 * When the backend includes structured `params` (see the API's
 * `08-errors-validation.md` → "Structured Hint Fields"), the formatter
 * receives them so wording can adapt (e.g. include the offending value).
 *
 * If you fork this UI, this is the one place to translate or rewrite copy
 * for your audience. Codes not listed below fall back to a humanised
 * version of the code itself.
 *
 * Convention: every code in `errorCodes` has an entry here. When the API
 * adds a new code, add the matching copy in the same PR. Many "internal"
 * codes (transaction-failure variants, infra errors) end up surfacing in
 * the UI on bad days, so they all get a sensible message rather than a
 * humanised raw code.
 */

type Params = Record<string, unknown>;
type FriendlyEntry = string | ((params: Params | null) => string);

// ─── Param formatters ───────────────────────────────────────────────────
// API hint values (`error.params`) are in protocol units: bps for rates,
// pips (1e6 USD) for amounts. These helpers turn them into display copy.

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asBigInt(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return BigInt(value.trim());
  if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
  return null;
}

function bpsToLeverage(value: unknown): string | null {
  const n = asNumber(value);
  if (n === null) return null;
  return `${(n / 10_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}×`;
}

function bpsToPct(value: unknown): string | null {
  const n = asNumber(value);
  if (n === null) return null;
  return `${(n / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function fractionToPct(value: unknown): string | null {
  const n = asNumber(value);
  if (n === null) return null;
  return `${(n * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function pipsToUsd(value: unknown): string | null {
  const big = asBigInt(value);
  if (big === null) return null;
  const negative = big < 0n;
  const absUnits = negative ? -big : big;
  const whole = absUnits / 1_000_000n;
  const frac = absUnits % 1_000_000n;
  const cents = (frac + 5_000n) / 10_000n; // round to 2dp
  const formatted = `$${whole.toLocaleString()}.${cents.toString().padStart(2, '0')}`;
  return negative ? `-${formatted}` : formatted;
}

function get(params: Params | null, key: string): unknown {
  return params ? params[key] : undefined;
}

const friendlyByCode: Record<string, FriendlyEntry> = {
  // ─── Address / wallet validation ──────────────────────────────────────
  invalid_evm_address: 'Invalid EVM address.',
  invalid_solana_address: 'Invalid Solana address.',
  invalid_string_for_chain_address: 'Invalid wallet address for the selected chain.',
  invalid_wallet_address: 'Invalid wallet address.',
  customer_auth_invalid_wallet_address: 'Invalid wallet address.',

  // ─── Auth ──────────────────────────────────────────────────────────────
  unauthorized: 'Session expired. Please reconnect your wallet.',
  forbidden: 'You do not have access to this resource.',

  // ─── Generic / infra ───────────────────────────────────────────────────
  array_out_of_bounds: 'Internal indexing error. Please try again.',
  batch_compute_not_available: 'Cached pricing is temporarily unavailable. Try again shortly.',
  internal_server_error: 'Something went wrong on our side. Please try again.',
  unexpected_error: 'Something went wrong. Please try again.',
  provider_not_available: 'Upstream provider is unavailable. Try again shortly.',
  request_already_in_progress: 'A previous request is still in flight. Wait for it to complete and try again.',
  math_error: 'A numeric calculation failed. Please try again.',
  invalid_number: 'Invalid numeric value in request.',
  invalid_message: 'Received an invalid upstream message.',
  invalid_filter_combination: 'That combination of filters is not supported.',
  test_error: 'Test error.',
  test_runtime_error: 'Test runtime error.',

  // ─── Cancel position ───────────────────────────────────────────────────
  cancel_position_delay_not_elapsed: 'Cancel delay has not elapsed yet. Try again shortly.',
  cancel_position_transaction_failed: 'Cancel transaction failed on-chain.',
  cancel_position_not_found: 'Position not found.',
  cancel_position_not_in_created_state: 'This position can only be cancelled before it has filled.',
  cancel_position_not_on_polygon: 'Cancel is only supported for Polygon positions.',
  customer_cancel_position_evm_only: 'Cancel is only supported for EVM positions.',
  customer_cancel_position_not_cancellable: 'This position can no longer be cancelled.',
  customer_cancel_position_not_owner: 'You do not own this position.',
  customer_cancel_position_not_found: 'Position not found.',

  // ─── Circuit breakers ──────────────────────────────────────────────────
  circuit_breaker_price_divergence_tripped: 'Trading is temporarily paused due to price divergence. Try again shortly.',

  // ─── Customer market / position lookups ────────────────────────────────
  customer_market_not_found: 'Market not found.',
  customer_position_not_found: 'Position not found.',

  // ─── Close-early ───────────────────────────────────────────────────────
  close_position_transaction_failed: 'Close transaction failed on-chain.',
  close_position_transaction_not_found: 'Close transaction not found.',
  finalize_close_transaction_failed: 'Finalising the close transaction failed.',
  close_no_open_position_transaction: 'No open transaction found for this position.',
  close_no_request_close_transaction: 'No close request found for this position.',
  close_polymarket_order_failed: 'Polymarket close order failed.',
  close_polymarket_order_retry_failed: 'Polymarket close order failed after retries.',
  close_position_already_closed: 'This position is already closed.',
  close_position_has_no_tokens: 'This position has no tokens to close.',
  close_position_not_found: 'Position not found.',
  close_position_not_originated: 'Position has not been originated yet — nothing to close.',

  // ─── Exchange / order submission ───────────────────────────────────────
  exchange_order_submission_locked: 'Order submission is temporarily locked. Try again shortly.',

  // ─── Faker / dev modes ─────────────────────────────────────────────────
  faker_not_available: 'Faker mode is not available in this environment.',

  // ─── Failed-finalize bookkeeping ───────────────────────────────────────
  failed_finalize_already_resolved: 'This failed transaction has already been resolved.',
  failed_finalize_no_fulfilled_exchange_transaction: 'No fulfilled exchange transaction found to finalise.',
  failed_finalize_not_found: 'Failed transaction not found.',

  // ─── Generic finalize ──────────────────────────────────────────────────
  finalize_invalid_exchange_transaction_amount: 'Exchange transaction amount is invalid.',
  finalize_invalid_provider_transaction: 'Provider transaction is invalid.',
  finalize_transaction_not_found: 'Transaction to finalise not found.',

  // ─── Isolated account ──────────────────────────────────────────────────
  isolated_account_master_secret_not_configured: 'Isolated account is not configured. Contact support.',

  // ─── Force-unwind ──────────────────────────────────────────────────────
  finalize_force_unwind_transaction_failed: 'Finalising the force-unwind transaction failed.',
  force_unwind_transaction_failed: 'Force-unwind transaction failed on-chain.',
  force_unwind_transaction_not_found: 'Force-unwind transaction not found.',
  force_unwind_polymarket_order_failed: 'Polymarket force-unwind order failed.',
  force_unwind_polymarket_order_retry_failed: 'Polymarket force-unwind order failed after retries.',
  force_unwind_position_already_force_unwound: 'Position has already been force-unwound.',

  // ─── Images / assets ───────────────────────────────────────────────────
  invalid_bucket: 'Invalid storage bucket.',
  invalid_file_type: 'Unsupported file type.',
  invalid_path: 'Invalid file path.',

  // ─── Liquidate ─────────────────────────────────────────────────────────
  finalize_liquidation_transaction_failed: 'Finalising the liquidation transaction failed.',
  liquidation_transaction_failed: 'Liquidation transaction failed on-chain.',
  liquidation_transaction_not_found: 'Liquidation transaction not found.',
  liquidate_polymarket_order_failed: 'Polymarket liquidation order failed.',
  liquidate_polymarket_order_retry_failed: 'Polymarket liquidation order failed after retries.',
  liquidate_position_already_liquidated: 'Position has already been liquidated.',

  // ─── Notional selector ─────────────────────────────────────────────────
  notional_selector_insufficient_liquidity: 'Not enough liquidity at the selected size.',

  // ─── Open position ─────────────────────────────────────────────────────
  finalize_open_transaction_failed: 'Finalising the open transaction failed.',
  open_position_retry_transaction_failed: 'Open-position retry failed.',
  open_position_transaction_failed: 'Open-position transaction failed on-chain.',
  open_position_transaction_not_found: 'Open-position transaction not found.',
  polymarket_finalize_open_failed: 'Finalising the Polymarket open order failed.',
  open_polymarket_order_failed: 'Polymarket open order failed.',
  open_polymarket_order_retry_failed: 'Polymarket open order failed after retries.',
  open_position_already_open: 'This position is already open.',
  open_position_position_not_found: 'Position not found.',
  open_position_reverted: 'Open was reverted on-chain. No funds were moved.',
  open_position_price_exceeded_tolerance: 'Price moved beyond your slippage tolerance before the order filled. Try again with a fresh quote.',
  revert_open_transaction_failed: 'Reverting the open transaction failed.',

  // ─── Open Kalshi orders ────────────────────────────────────────────────
  open_kalshi_orders_amount_mismatch: 'Kalshi order amounts do not match the requested position. Refresh and try again.',

  // ─── ONNX / risk model ─────────────────────────────────────────────────
  onnx_model_not_found: 'Risk model is unavailable right now. Try again shortly.',
  onnx_session_not_loaded: 'Risk model is still loading. Try again shortly.',

  // ─── Partner ───────────────────────────────────────────────────────────
  partner_api_key_limit_exceeded: 'Partner API key limit reached.',
  partner_api_key_not_found: 'Partner API key not found.',
  partner_not_found: 'Partner not found.',

  // ─── OpenAI ────────────────────────────────────────────────────────────
  open_ai_empty_response: 'AI service returned an empty response. Try again.',

  // ─── Quote / offer — limits & sizing ───────────────────────────────────
  // All of these come with `availableCapacityUsdPips`, `currentNotionalUsdPips`,
  // `limitUsdPips` (see api: offer.error.ts → buildPositionLimitDetails).
  quote_partner_position_limit_exceeded: (params) => {
    const available = pipsToUsd(get(params, 'availableCapacityUsdPips'));
    return available
      ? `Partner position limit reached. Remaining capacity: ${available}.`
      : 'Partner position limit reached. Try a smaller size.';
  },
  quote_user_position_limit_exceeded: (params) => {
    const available = pipsToUsd(get(params, 'availableCapacityUsdPips'));
    return available
      ? `You have reached your position limit on this market. Remaining capacity: ${available}.`
      : 'You have reached your position limit on this market.';
  },
  quote_market_position_limit_exceeded: (params) => {
    const available = pipsToUsd(get(params, 'availableCapacityUsdPips'));
    return available
      ? `This market has reached its open-interest cap. Remaining capacity: ${available}.`
      : 'This market has reached its open-interest cap. Try a smaller size or another market.';
  },
  quote_global_position_limit_exceeded: (params) => {
    const available = pipsToUsd(get(params, 'availableCapacityUsdPips'));
    return available
      ? `Global position limit reached. Remaining capacity: ${available}.`
      : 'Global position limit reached. Try again shortly.';
  },
  quote_side_position_limit_exceeded: (params) => {
    const available = pipsToUsd(get(params, 'availableCapacityUsdPips'));
    return available
      ? `This side of the market is at its position limit. Remaining capacity: ${available}.`
      : 'This side of the market is at its position limit. Try the other side or a smaller size.';
  },
  // SideCapacityDetails — `availableCapacityUsdPips`, `maxSupportedCollateralUsdPips`, `minNotionalUsdPips`
  quote_side_capacity_exceeded: (params) => {
    const maxCollateral = pipsToUsd(get(params, 'maxSupportedCollateralUsdPips'));
    return maxCollateral
      ? `Not enough capacity on this side of the market. Max supported collateral at this size: ${maxCollateral}.`
      : 'Not enough capacity on this side of the market for that size.';
  },
  quote_position_limit_exceeded: 'Position limit reached for this request.',

  // ─── Quote / offer — liquidity & pricing ───────────────────────────────
  quote_insufficient_liquidity: 'Not enough liquidity on the order book to fill this size.',
  quote_slippage_too_high: (params) => {
    const max = bpsToPct(get(params, 'maxSlippageBps'));
    const current = bpsToPct(get(params, 'currentSlippageBps'));
    if (max && current) return `Required slippage ${current} exceeds your tolerance (${max}). Reduce size or raise tolerance.`;
    if (max) return `Required slippage exceeds your tolerance (${max}). Reduce size or raise tolerance.`;
    return 'Price would move too far to fill this order. Reduce size or raise your slippage tolerance.';
  },
  quote_event_not_started: 'This event has not started yet. Trading opens at the scheduled start time.',
  quote_entry_bid_depth_too_low: 'Order book depth on the entry side is too thin to open this position safely.',
  quote_entry_capacity_exceeded: 'Entry size exceeds the market’s available capacity.',
  quote_entry_depth_too_low: 'Order book depth is too thin to open this position safely.',
  quote_entry_spread_too_wide: 'Bid/ask spread is too wide to open right now. Try again shortly.',
  quote_entry_tick_stale: 'Latest market price data is stale. Refresh and try again.',
  quote_entry_volume_too_low: 'Recent traded volume on this market is too low to open new positions.',
  quote_entry_top_holder_too_high: (params) => {
    const current = bpsToPct(get(params, 'currentTopHolderBps'));
    const max = bpsToPct(get(params, 'maxTopHolderBps'));
    if (current && max) return `Top holder owns ${current} of this market (max ${max}). Opening here is restricted.`;
    return 'A single trader holds too much of this market. Opening here is restricted.';
  },
  quote_entry_price_out_of_range: 'Current price is outside the range we can open at. Try again shortly.',
  quote_entry_exit_drop_too_high: 'Exit liquidity is too thin to safely open this size.',
  quote_entry_market_too_elapsed: (params) => {
    const elapsed = fractionToPct(get(params, 'pctElapsed'));
    const max = fractionToPct(get(params, 'maxPctElapsed'));
    if (elapsed && max) return `Market is ${elapsed} elapsed (max ${max}). Too close to resolution to open new positions.`;
    return 'Market is too close to resolution to open new positions.';
  },
  quote_entry_excluded_market_type: 'This market type is not supported for leveraged positions.',
  quote_entry_excluded_sport: 'This sport is not supported for leveraged positions.',
  quote_price_too_low: 'Underlying price is too low to open a leveraged position.',
  quote_open_interest_unavailable: 'Open-interest data is unavailable right now. Try again shortly.',

  // ─── Quote / offer — leverage ──────────────────────────────────────────
  quote_leverage_below_minimum: (params) => {
    const min = bpsToLeverage(get(params, 'minLeverageBps'));
    const current = bpsToLeverage(get(params, 'currentLeverageBps'));
    if (min && current) return `Leverage ${current} is below the minimum allowed (${min}).`;
    if (min) return `Leverage is below the minimum allowed (${min}).`;
    return 'Leverage is below the minimum allowed for this market.';
  },
  quote_leverage_exceeds_maximum: (params) => {
    const max = bpsToLeverage(get(params, 'maxLeverageBps'));
    const current = bpsToLeverage(get(params, 'currentLeverageBps'));
    if (max && current) return `Leverage ${current} is above the maximum allowed (${max}).`;
    if (max) return `Leverage is above the maximum allowed (${max}).`;
    return 'Leverage is above the maximum allowed for this market.';
  },
  quote_leverage_exceeds_model_max: (params) => {
    const max = bpsToLeverage(get(params, 'maxLeverageBps'));
    const current = bpsToLeverage(get(params, 'currentLeverageBps'));
    if (max && current) return `Leverage ${current} exceeds the risk-model limit (${max}) for this market.`;
    if (max) return `Leverage exceeds the risk-model limit (${max}) for this market.`;
    return 'Leverage exceeds the risk-model limit for this market.';
  },
  quote_leverage_too_high_for_price: (params) => {
    const current = bpsToLeverage(get(params, 'currentLeverageBps'));
    return current
      ? `Leverage ${current} is too high for the current price. Reduce leverage.`
      : 'Leverage is too high for the current price. Reduce leverage.';
  },
  quote_hard_exit_too_close: 'Hard-exit is too close to entry. Reduce leverage.',
  quote_liquidation_not_viable: (params) => {
    const tolerance = bpsToPct(get(params, 'minTolerancePctBps'));
    return tolerance
      ? `Liquidation price is too close to entry (minimum buffer ${tolerance}). Reduce leverage.`
      : 'Liquidation price is not viable at this leverage. Reduce leverage.';
  },

  // ─── Quote / offer — market state ──────────────────────────────────────
  quote_market_not_active: 'Market is not active.',
  quote_market_not_eligible: 'Market is not eligible for leveraged trading.',
  quote_market_not_ready: 'Market is not ready yet. Try again shortly.',
  quote_market_not_found: 'Market not found.',
  quote_market_risk_too_high: 'Market risk is too high right now. Try again later.',
  quote_market_unsupported_category: 'This market category is not supported.',
  quote_market_no_prices: 'No price data available for this market.',
  quote_market_missing_polymarket_condition_id: 'This market is missing required Polymarket data.',

  // ─── Polymarket-specific market state (the one flagged in QA) ──────────
  quote_polymarket_market_closed: 'This Polymarket market is closed and not accepting new positions.',
  quote_polymarket_market_inactive: 'This Polymarket market is inactive and not accepting new positions.',
  quote_polymarket_market_not_accepting_orders: 'Polymarket is not accepting orders on this market right now. Try again shortly or pick another market.',
  quote_polymarket_missing_token: 'This Polymarket market is missing a tradable outcome token.',
  quote_invalid_polymarket_wallet_address: 'Invalid Polymarket wallet address.',
  quote_invalid_kalshi_wallet_address: 'Invalid Kalshi wallet address.',

  // ─── Kalshi ────────────────────────────────────────────────────────────
  kalshi_quote_market_closed: 'This Kalshi market is closed.',

  // ─── Quote — data freshness ────────────────────────────────────────────
  quote_twap_data_stale: 'Reference price (TWAP) is stale. Try again shortly.',
  quote_twap_data_unavailable: 'Reference price (TWAP) is unavailable for this market.',
  quote_revision_required: 'Quote needs to be refreshed before submitting.',
  quote_price_provider_not_found: 'No price provider configured for this market.',

  // ─── Pending referrer ──────────────────────────────────────────────────
  pending_referrer_already_set: 'Referrer is already set for this account.',

  // ─── Prediction-market events ──────────────────────────────────────────
  pm_event_quote_not_found: 'Quote not found.',
  pm_event_position_not_found: 'Position not found.',

  // ─── Position monitor ──────────────────────────────────────────────────
  position_monitor_liquidation_failed: 'Automated liquidation could not be processed. Support has been notified.',
  position_monitor_unwind_failed: 'Automated unwind could not be processed. Support has been notified.',

  // ─── Position transition ───────────────────────────────────────────────
  position_transition_conflicting_operation: 'Another operation on this position is in progress. Try again shortly.',
  position_transition_invalid_state: 'Position is not in a state that allows this action.',
  position_transition_mark_transaction_reverted_input: 'Invalid input while marking transaction as reverted.',
  position_transition_no_failed_open_position_transaction: 'No failed open transaction found to recover.',
  position_transition_no_fulfilled_exchange: 'No fulfilled exchange transaction found.',
  position_transition_not_found: 'Position transition not found.',
  position_transition_not_implemented: 'This position transition is not supported.',
  position_transition_on_chain_state_mismatch: 'On-chain state does not match expected position state.',
  position_transition_on_chain_transaction_hash_mismatch: 'On-chain transaction hash does not match expected value.',
  position_transition_open_order_already_fulfilled: 'Open order has already been fulfilled.',
  position_transition_resume_open_input_missing: 'Missing input to resume the open flow.',
  position_transition_terminal_state: 'Position is in a terminal state — no further transitions allowed.',

  // ─── Polymarket data ───────────────────────────────────────────────────
  polymarket_fee_rate_fetch_failed: 'Could not fetch Polymarket fee rate. Try again shortly.',
  polymarket_gamma_chunk_fetch_failed: 'Could not fetch Polymarket market data. Try again shortly.',

  // ─── Raydium ───────────────────────────────────────────────────────────
  raydium_clmm_missing_tick_array: 'Raydium liquidity data is incomplete. Try again shortly.',

  // ─── Risk engine ───────────────────────────────────────────────────────
  risk_engine_feature_validation_drift: 'Risk model inputs are out of expected range. Try again shortly.',
  risk_engine_invalid_model_spec: 'Risk model is misconfigured. Contact support.',
  risk_engine_market_closed: 'Market is closed.',
  risk_engine_market_disabled: 'Market is disabled.',
  risk_engine_market_not_found: 'Market not found.',
  risk_engine_market_settlement_detected: 'Market is settling — no new positions allowed.',

  // ─── Settle ────────────────────────────────────────────────────────────
  finalize_settle_transaction_failed: 'Finalising the settle transaction failed.',
  settle_polymarket_order_failed: 'Polymarket settle order failed.',
  settle_polymarket_order_retry_failed: 'Polymarket settle order failed after retries.',
  settle_position_already_settled: 'Position has already been settled.',
  settle_position_transaction_failed: 'Settle transaction failed on-chain.',
  settle_position_transaction_not_found: 'Settle transaction not found.',

  // ─── Settler ───────────────────────────────────────────────────────────
  settler_market_not_resolved: 'Market has not resolved yet.',
  settler_position_in_pending_state: 'Position is still pending — settle is not available yet.',

  // ─── Redemption ────────────────────────────────────────────────────────
  redemption_bypass_pending: 'Redemption bypass is already pending.',
  redemption_oracle_not_resolved: 'Oracle has not resolved yet — redemption is not available.',

  // ─── Position validator ────────────────────────────────────────────────
  position_validator_balance_fetch_failed: 'Could not fetch on-chain balances. Try again shortly.',
  position_validator_invalid_token_id: 'Invalid token ID for this market.',
  position_validator_stale_order_book: 'Order book data is stale. Refresh and try again.',

  // ─── EVM ───────────────────────────────────────────────────────────────
  evm_gas_price_circuit_breaker: 'EVM gas price is too high — trading is temporarily paused.',
  evm_gas_price_spike: 'EVM gas price spiked. Try again shortly.',
  evm_simulation_failed: 'Transaction simulation failed. The transaction would revert on-chain.',
  evm_receipt_timeout: 'Transaction confirmation timed out. Check status before retrying.',
  evm_transaction_failed: 'EVM transaction failed.',

  // ─── Solana ────────────────────────────────────────────────────────────
  address_lookup_table_not_supported: 'This Solana transaction format is not supported.',
  balance_change_simulation_failed: 'Could not simulate balance changes for this transaction.',
  block_not_found: 'Solana block not found.',

  // ─── Telegram ──────────────────────────────────────────────────────────
  telegram_account_already_linked: 'This Telegram account is already linked.',
  telegram_account_not_found: 'Telegram account not found.',
  telegram_auth_code_expired: 'Telegram auth code has expired. Request a new one.',
  telegram_auth_code_invalid: 'Telegram auth code is invalid.',

  // ─── Video ─────────────────────────────────────────────────────────────
  failed_getting_video_metadata: 'Could not read video metadata.',
};

function humanizeCode(code: string): string {
  const spaced = code.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function resolveFriendly(code: string, params: Params | null): string | null {
  const entry = friendlyByCode[code];
  if (entry === undefined) return null;
  return typeof entry === 'function' ? entry(params) : entry;
}

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code) {
      return resolveFriendly(err.code, err.params) ?? humanizeCode(err.code);
    }
    return err.message || `Request failed (${err.status})`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong';
}
