import { useQuery } from '@tanstack/react-query';
import { fetchPositions } from '../api/positions';
import type { Position } from '../api/types';
import { useAuthStore } from '../store/auth';

interface UsePositionsParams {
  sortBy?: string;
  sortDirection?: string;
  state?: 'active' | 'inactive';
  status?: string;
  expand?: string[];
}

const FAST_POLL_MS = 5_000;
const SLOW_POLL_MS = 15_000;

export function usePositions(params?: UsePositionsParams) {
  const jwt = useAuthStore((s) => s.jwt);
  const expandKey = params?.expand?.join(',') ?? '';

  return useQuery({
    queryKey: ['positions', params?.sortBy, params?.sortDirection, params?.state, params?.status, expandKey],
    queryFn: () => fetchPositions(params),
    enabled: !!jwt,
    refetchInterval: (query) => {
      const data = query.state.data as Position[] | undefined;
      if (data?.some((p) => p.status === 'pending' || p.status === 'closing' || p.status === 'settling')) return FAST_POLL_MS;
      return SLOW_POLL_MS;
    },
  });
}
