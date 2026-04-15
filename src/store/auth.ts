import { create } from 'zustand';

interface AuthState {
  jwt: string | null;
  walletAddress: string | null;
  expiresAt: string | null;
  setAuth: (jwt: string, walletAddress: string, expiresAt: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  jwt: null,
  walletAddress: null,
  expiresAt: null,
  setAuth: (jwt, walletAddress, expiresAt) => set({ jwt, walletAddress, expiresAt }),
  clearAuth: () => set({ jwt: null, walletAddress: null, expiresAt: null }),
}));
