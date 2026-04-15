import { useQuery } from '@tanstack/react-query';
import { fetchPositions } from '../api/positions';
import { useAuthStore } from '../store/auth';

interface UsePositionsParams {
  sortBy?: string;
  sortDirection?: string;
}

export function usePositions(params?: UsePositionsParams) {
  const jwt = useAuthStore((s) => s.jwt);

  return useQuery({
    queryKey: ['positions', params?.sortBy, params?.sortDirection],
    queryFn: () => fetchPositions(params),
    enabled: !!jwt,
    refetchInterval: 15_000,
  });
}
