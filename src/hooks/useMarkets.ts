import { useQuery } from '@tanstack/react-query';
import { fetchMarkets, searchMarkets } from '../api/markets';
import type { MarketSort } from '../api/markets';
import type { Market } from '../api/types';
import { useAuthStore } from '../store/auth';

const PAGE_SIZE = 15;

export interface MarketsPage {
  data: Market[];
  hasMore: boolean;
  totalCount?: number;
}

export function useMarkets(
  category?: string,
  search?: string,
  status?: string,
  acceptingNewPositions?: boolean,
  startingAfter?: string,
  sort?: MarketSort,
) {
  const jwt = useAuthStore((s) => s.jwt);

  return useQuery<MarketsPage>({
    queryKey: ['markets', { category, search, status, acceptingNewPositions, startingAfter, sort }],
    queryFn: async () => {
      if (search) {
        const data = await searchMarkets({
          query: search,
          category: category || undefined,
          status: status || undefined,
          acceptingNewPositions,
        });
        return { data, hasMore: false };
      }
      return fetchMarkets({
        category: category || undefined,
        status: status || undefined,
        acceptingNewPositions,
        sort,
        limit: PAGE_SIZE,
        startingAfter,
        expand: ['total_count', 'prices'],
      });
    },
    enabled: !!jwt,
  });
}
