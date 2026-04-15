import { useState, useCallback } from 'react';
import { createOffer } from '../api/offers';
import type { Offer } from '../api/types';

interface UseOfferParams {
  marketTicker: string;
  effectiveSide: 'yes' | 'no';
  leverageBps: number;
  collateralUsd: number;
}

export function useOffer() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const getQuote = useCallback(async (params: UseOfferParams) => {
    // Clear any prior offer so a stale one can't be acted on if this fetch fails
    setOffer(null);
    setIsLoading(true);
    setError(null);
    try {
      // notional (USD pips) = collateral × leverage. Leverage is in bps so
      // dividing by 10_000 converts to a multiplier, then ×10_000 converts
      // dollars to pips.
      const notionalUsdPips = Math.round(params.collateralUsd * params.leverageBps);

      const result = await createOffer({
        marketTicker: params.marketTicker,
        effectiveSide: params.effectiveSide,
        leverageBps: params.leverageBps,
        notionalAmountUsdPips: notionalUsdPips.toString(),
        slippageBps: 200,
      });
      setOffer(result);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearOffer = useCallback(() => {
    setOffer(null);
    setError(null);
  }, []);

  return { offer, isLoading, error, getQuote, clearOffer };
}
