import { useQuery } from '@tanstack/react-query'
import { fetchMarket } from '../api/markets'
import type { Market } from '../api/types'
import { useAuthStore } from '../store/auth'

/** Reads the cached Market record for a ticker (or null while loading). */
export function useMarket(ticker: string | undefined): Market | null {
  const jwt = useAuthStore((s) => s.jwt)
  const { data } = useQuery({
    queryKey: ['market', ticker],
    queryFn: () => fetchMarket(ticker!),
    enabled: !!jwt && !!ticker,
    staleTime: 5 * 60 * 1000,
  })
  return data ?? null
}

/** Convenience wrapper: just the title. Shares cache with `useMarket`. */
export function useMarketTitle(ticker: string | undefined): string | null {
  return useMarket(ticker)?.title ?? null
}
