import { useQuery } from '@tanstack/react-query'
import { fetchMarkets } from '../api/markets'
import { useAuthStore } from '../store/auth'

export function useSupportedMarketsCount(): number | null {
  const jwt = useAuthStore((s) => s.jwt)
  // Distinct top-level key — must NOT share the 'markets' prefix, otherwise
  // `queryClient.invalidateQueries({ queryKey: ['markets'] })` (fired on
  // refresh/quote flows) wipes the count and the title flickers to '—'.
  const { data } = useQuery({
    queryKey: ['supported-markets-count'],
    queryFn: async () => {
      let count = 0
      let after: string | undefined = undefined
      let guard = 0
      while (guard < 20) {
        const page = await fetchMarkets({
          acceptingNewPositions: true,
          limit: 100,
          startingAfter: after,
        })
        count += page.data.length
        if (!page.hasMore || page.data.length === 0) break
        after = page.data[page.data.length - 1].ticker
        guard++
      }
      return count
    },
    enabled: !!jwt,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
  return data ?? null
}
