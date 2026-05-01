import { apiFetch } from './client';
import type { CreateOfferParams, Offer } from './types';

function offerBody(params: CreateOfferParams) {
  return JSON.stringify({
    market_ticker: params.marketTicker,
    effective_side: params.effectiveSide,
    leverage_bps: params.leverageBps,
    notional_amount_usd_pips: params.notionalAmountUsdPips,
    slippage_bps: params.slippageBps,
  });
}

/** Create an offer (quote) for a leveraged position. */
export async function createOffer(params: CreateOfferParams): Promise<Offer> {
  return apiFetch<Offer>('/v1/prediction-markets/quotes', {
    method: 'POST',
    body: offerBody(params),
  });
}

/** Create a draft quote — same pricing/fees but no signature or expiry pressure. */
export async function createDraftQuote(params: CreateOfferParams): Promise<Offer> {
  return apiFetch<Offer>('/v1/prediction-markets/draft-quotes', {
    method: 'POST',
    body: offerBody(params),
  });
}

/** Promote a draft quote into a fully signed quote ready for on-chain execution. */
export async function promoteDraftQuote(draftQuoteId: string): Promise<Offer> {
  return apiFetch<Offer>(`/v1/prediction-markets/promoted-quotes/${draftQuoteId}`, {
    method: 'POST',
  });
}
