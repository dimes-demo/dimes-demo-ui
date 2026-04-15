import { useQuery } from '@tanstack/react-query';
import { fetchMarkets, searchMarkets } from '../api/markets';
import type { Market } from '../api/types';
import { useAuthStore } from '../store/auth';

const PAGE_SIZE = 100;

export interface MarketsPage {
  data: Market[];
  hasMore: boolean;
}

export function useMarkets(
  category?: string,
  search?: string,
  status?: string,
  acceptingNewPositions?: boolean,
  startingAfter?: string,
) {
  const jwt = useAuthStore((s) => s.jwt);

  return useQuery<MarketsPage>({
    queryKey: ['markets', { category, search, status, acceptingNewPositions, startingAfter }],
    queryFn: async () => {
      if (search) {
        const data = await searchMarkets(search);
        return { data, hasMore: false };
      }
      return fetchMarkets({
        category: category || undefined,
        status: status || undefined,
        acceptingNewPositions,
        limit: PAGE_SIZE,
        startingAfter,
      });
    },
    enabled: !!jwt,
  });
}
