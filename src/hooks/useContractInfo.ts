import { useQuery } from '@tanstack/react-query';
import { fetchContractInfo } from '../api/positions';
import { useAuthStore } from '../store/auth';

export function useContractInfo() {
  const jwt = useAuthStore((s) => s.jwt);

  return useQuery({
    queryKey: ['contract-info'],
    queryFn: fetchContractInfo,
    enabled: !!jwt,
    staleTime: Infinity,
  });
}
