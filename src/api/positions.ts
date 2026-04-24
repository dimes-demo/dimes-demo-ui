import { apiFetch, apiFetchList } from './client';
import type { ContractInfo, Position } from './types';

interface FetchPositionsParams {
  sortBy?: string;
  sortDirection?: string;
  state?: 'active' | 'inactive';
  status?: string;
  expand?: string[];
}

export async function fetchPositions(params?: FetchPositionsParams): Promise<Position[]> {
  const searchParams = new URLSearchParams();
  if (params?.sortBy) {
    searchParams.set('sort_by', params.sortBy);
  }
  if (params?.sortDirection) {
    searchParams.set('sort_direction', params.sortDirection);
  }
  if (params?.state) {
    searchParams.set('state', params.state);
  }
  if (params?.status) {
    searchParams.set('status', params.status);
  }
  if (params?.expand && params.expand.length > 0) {
    searchParams.set('expand', params.expand.join(','));
  }
  const query = searchParams.toString();
  const path = `/v1/prediction-markets/positions${query ? `?${query}` : ''}`;
  return apiFetchList<Position>(path);
}

export async function cancelPosition(positionId: string): Promise<void> {
  await apiFetch<void>(`/v1/prediction-markets/positions/${encodeURIComponent(positionId)}`, {
    method: 'DELETE',
  });
}

export async function fetchContractInfo(): Promise<ContractInfo> {
  return apiFetch<ContractInfo>('/v1/prediction-markets/contract-info');
}

