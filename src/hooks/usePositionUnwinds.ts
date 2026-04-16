import { useQuery } from '@tanstack/react-query';
import { fetchPositionUnwinds } from '../api/positions';
import { useAuthStore } from '../store/auth';

export function usePositionUnwinds(positionId: string) {
  const jwt = useAuthStore((s) => s.jwt);

  return useQuery({
    queryKey: ['position-unwinds', positionId],
    queryFn: () => fetchPositionUnwinds(positionId),
    enabled: !!jwt,
    refetchInterval: 30_000,
  });
}
