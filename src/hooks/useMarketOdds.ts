import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createOffer } from '../api/offers'
import { useAuthStore } from '../store/auth'

export interface Odds {
  yes: number
  no: number
}

const ODDS_QUERY_KEY = (ticker: string) => ['market-odds', ticker]
const STALE_TIME = 5 * 60 * 1000

async function fetchOdds(ticker: string, leverageMinBps: number): Promise<Odds | null> {
  try {
    const offer = await createOffer({
      marketTicker: ticker,
      effectiveSide: 'yes',
      leverageBps: leverageMinBps,
      notionalAmountUsdPips: '15000',
      slippageBps: 800,
    })
    const yes = Number(offer.entryPriceUsd)
    if (Number.isNaN(yes) || yes <= 0 || yes >= 1) return null
    return { yes, no: 1 - yes }
  } catch {
    return null
  }
}

/**
 * Reads cached YES/NO odds for a market. Returns null until the prefetch
 * (fired on row hover/select via `usePrefetchMarketOdds`) lands.
 */
export function useMarketOdds(
  marketTicker: string | undefined,
  acceptingNewPositions: boolean,
  leverageMinBps: number,
): Odds | null {
  const { data } = useQuery<Odds | null>({
    queryKey: marketTicker ? ODDS_QUERY_KEY(marketTicker) : ['market-odds', 'none'],
    queryFn: () => fetchOdds(marketTicker!, leverageMinBps),
    enabled: false,
    staleTime: STALE_TIME,
    retry: 0,
  })
  return data ?? null
}

/**
 * Returns a function that prefetches odds for a market — call from
 * `onMouseEnter` on a market row so by the time the user clicks, the YES/NO
 * cents are already painted.
 */
export function usePrefetchMarketOdds() {
  const queryClient = useQueryClient()
  const jwt = useAuthStore((s) => s.jwt)
  return (ticker: string, leverageMinBps: number, acceptingNewPositions: boolean) => {
    if (!jwt || !acceptingNewPositions) return
    queryClient.prefetchQuery({
      queryKey: ODDS_QUERY_KEY(ticker),
      queryFn: () => fetchOdds(ticker, leverageMinBps),
      staleTime: STALE_TIME,
    })
  }
}
