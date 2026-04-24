import { create } from 'zustand';

export interface PendingPositionStub {
  key: string;
  marketTicker: string;
  side: 'yes' | 'no';
  leverageBps: number;
  collateralUsd: string;
  createdAt: number;
}

interface PendingPositionsState {
  stubs: PendingPositionStub[];
  add: (stub: PendingPositionStub) => void;
  remove: (key: string) => void;
  pruneMatched: (keys: string[]) => void;
}

const MAX_AGE_MS = 2 * 60 * 1000;

const normalizeKey = (key: string) => key.toLowerCase();

export const usePendingPositionsStore = create<PendingPositionsState>((set) => ({
  stubs: [],
  add: (stub) =>
    set((state) => {
      const key = normalizeKey(stub.key);
      if (state.stubs.some((s) => s.key === key)) return state;
      return { stubs: [...state.stubs, { ...stub, key }] };
    }),
  remove: (key) =>
    set((state) => ({ stubs: state.stubs.filter((s) => s.key !== normalizeKey(key)) })),
  pruneMatched: (keys) =>
    set((state) => {
      const matched = new Set(keys.map(normalizeKey));
      const now = Date.now();
      return {
        stubs: state.stubs.filter(
          (s) => !matched.has(s.key) && now - s.createdAt < MAX_AGE_MS,
        ),
      };
    }),
}));
