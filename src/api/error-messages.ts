import { ApiError } from './client';

const friendlyByCode: Record<string, string> = {
  quote_partner_position_limit_exceeded: 'Partner position limit exceeded for this quote.',
  quote_user_position_limit_exceeded: 'User position limit exceeded for this quote.',
  quote_market_position_limit_exceeded: 'Market position limit exceeded for this quote.',
  quote_global_position_limit_exceeded: 'Global position limit reached. Try again later.',
  quote_side_position_limit_exceeded: 'Side position limit exceeded for this market.',
  quote_side_capacity_exceeded: 'Not enough side capacity in this market.',
  quote_insufficient_liquidity: 'Insufficient liquidity to fill this size.',
  quote_slippage_too_high: 'Slippage too high. Reduce size or increase slippage tolerance.',
  quote_leverage_below_minimum: 'Leverage is below the minimum allowed.',
  quote_leverage_exceeds_maximum: 'Leverage is above the maximum allowed.',
  quote_leverage_exceeds_model_max: 'Leverage exceeds the model limit for this market.',
  quote_leverage_too_high_for_price: 'Leverage is too high for the current price.',
  quote_price_too_low: 'Price is too low to open this position.',
  quote_market_closed: 'Market is closed.',
  quote_market_disabled: 'Market is disabled.',
  quote_market_not_eligible: 'Market is not eligible for trading.',
  quote_market_not_ready: 'Market is not ready yet.',
  quote_market_too_elapsed: 'Market is too close to resolution.',
  quote_market_settlement_detected: 'Market is settling.',
  quote_hard_exit_too_close: 'Hard exit is too close to entry. Reduce leverage.',
  quote_liquidation_not_viable: 'Liquidation price is not viable. Reduce leverage.',
  circuit_breaker_tripped: 'Trading is temporarily paused. Try again shortly.',
  invalid_wallet_address: 'Invalid wallet address.',
  unauthorized: 'Unauthorized. Please reconnect your wallet.',
};

function humanizeCode(code: string): string {
  const spaced = code.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code) {
      return friendlyByCode[err.code] ?? humanizeCode(err.code);
    }
    return err.message || `Request failed (${err.status})`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong';
}
