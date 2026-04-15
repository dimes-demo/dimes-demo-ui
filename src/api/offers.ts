import { apiFetch } from './client';
import type { CreateOfferParams, Offer } from './types';

/** Create an offer (quote) for a leveraged position. */
export async function createOffer(params: CreateOfferParams): Promise<Offer> {
  return apiFetch<Offer>('/v1/prediction-markets/quotes', {
    method: 'POST',
    body: JSON.stringify({
      market_ticker: params.marketTicker,
      effective_side: params.effectiveSide,
      leverage_bps: params.leverageBps,
      notional_amount_usd_pips: params.notionalAmountUsdPips,
      slippage_bps: params.slippageBps,
    }),
  });
}
