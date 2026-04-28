import { apiFetch, apiFetchList, apiFetchListWithPagination } from './client';
import type { Market } from './types';

export type MarketSort = 'ticker_asc' | 'depth_desc';

export interface FetchMarketsParams {
  category?: string;
  status?: string;
  acceptingNewPositions?: boolean;
  sort?: MarketSort;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
  expand?: string[];
}

export interface FetchMarketsResult {
  data: Market[];
  hasMore: boolean;
  totalCount?: number;
}

export async function fetchMarkets(params?: FetchMarketsParams): Promise<FetchMarketsResult> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.acceptingNewPositions !== undefined) searchParams.set('accepting_new_positions', String(params.acceptingNewPositions));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.startingAfter) searchParams.set('starting_after', params.startingAfter);
  if (params?.endingBefore) searchParams.set('ending_before', params.endingBefore);
  if (params?.expand) params.expand.forEach((e) => searchParams.append('expand', e));
  searchParams.set('sort', params?.sort ?? 'depth_desc');
  const qs = searchParams.toString();
  return apiFetchListWithPagination<Market>(`/v1/prediction-markets/markets${qs ? `?${qs}` : ''}`);
}

export interface SearchMarketsParams {
  query: string;
  category?: string;
  status?: string;
  acceptingNewPositions?: boolean;
}

/** Search markets by title, ticker, or token ID */
export async function searchMarkets(params: SearchMarketsParams): Promise<Market[]> {
  const searchParams = new URLSearchParams({ query: params.query });
  if (params.category) searchParams.set('category', params.category);
  if (params.status) searchParams.set('status', params.status);
  if (params.acceptingNewPositions !== undefined) {
    searchParams.set('accepting_new_positions', String(params.acceptingNewPositions));
  }
  return apiFetchList<Market>(`/v1/prediction-markets/markets/search?${searchParams.toString()}`);
}

/** Fetch a single market by ticker */
export async function fetchMarket(ticker: string): Promise<Market> {
  return apiFetch<Market>(`/v1/prediction-markets/markets/${encodeURIComponent(ticker)}`);
}
