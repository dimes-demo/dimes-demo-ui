import { useState, useCallback } from 'react';
import { createOffer } from '../api/offers';
import type { Offer } from '../api/types';

interface UseOfferParams {
  marketTicker: string;
  effectiveSide: 'yes' | 'no';
  leverageBps: number;
  collateralUsd: number;
  slippageBps: number;
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
      // API requires leverage to be a multiple of 2500 bps (0.25x)
      const LEVERAGE_STEP_BPS = 2500;
      const leverageBps = Math.round(params.leverageBps / LEVERAGE_STEP_BPS) * LEVERAGE_STEP_BPS;

      // notional (USD pips) = collateral × leverage. Leverage is in bps so
      // dividing by 10_000 converts to a multiplier, then ×10_000 converts
      // dollars to pips.
      const notionalUsdPips = Math.round(params.collateralUsd * leverageBps);

      const result = await createOffer({
        marketTicker: params.marketTicker,
        effectiveSide: params.effectiveSide,
        leverageBps,
        notionalAmountUsdPips: notionalUsdPips.toString(),
        slippageBps: params.slippageBps,
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
