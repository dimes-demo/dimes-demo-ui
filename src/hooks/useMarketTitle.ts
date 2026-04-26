import { useQuery } from '@tanstack/react-query'
import { fetchMarket } from '../api/markets'
import { useAuthStore } from '../store/auth'

export function useMarketTitle(ticker: string | undefined): string | null {
  const jwt = useAuthStore((s) => s.jwt)
  const { data } = useQuery({
    queryKey: ['market', ticker],
    queryFn: () => fetchMarket(ticker!),
    enabled: !!jwt && !!ticker,
    staleTime: 5 * 60 * 1000,
  })
  return data?.title ?? null
}
