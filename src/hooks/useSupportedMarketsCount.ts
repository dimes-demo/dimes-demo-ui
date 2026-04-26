import { useEffect, useState } from 'react'
import { fetchMarkets } from '../api/markets'
import { useAuthStore } from '../store/auth'

/**
 * Counts active + eligible markets by walking pages of 100 (the API max).
 * Updates progressively after each page so the title reads "100", "200",
 * ... rather than "—" while the full count is still loading.
 */
export function useSupportedMarketsCount(): number | null {
  const jwt = useAuthStore((s) => s.jwt)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!jwt) return
    let cancelled = false

    ;(async () => {
      let running = 0
      let after: string | undefined = undefined
      let guard = 0
      while (guard < 30 && !cancelled) {
        try {
          const page = await fetchMarkets({
            acceptingNewPositions: true,
            status: 'active',
            limit: 100,
            startingAfter: after,
          })
          running += page.data.length
          if (cancelled) return
          setCount(running)
          if (!page.hasMore || page.data.length === 0) break
          after = page.data[page.data.length - 1].ticker
          guard++
        } catch {
          break
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [jwt])

  return count
}
