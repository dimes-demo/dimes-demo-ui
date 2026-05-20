import { create } from 'zustand';

interface AuthState {
  jwt: string | null;
  walletAddress: string | null;
  expiresAt: string | null;
  /** When true, auth + quotes are scoped to `depositWalletAddress` instead of the connected wallet. */
  depositWalletMode: boolean;
  /** The Polymarket deposit wallet contract address, when deposit-wallet mode is on. */
  depositWalletAddress: string | null;
  setAuth: (jwt: string, walletAddress: string, expiresAt: string) => void;
  clearAuth: () => void;
  setDepositWalletMode: (enabled: boolean, depositWalletAddress: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  jwt: null,
  walletAddress: null,
  expiresAt: null,
  depositWalletMode: false,
  depositWalletAddress: null,
  setAuth: (jwt, walletAddress, expiresAt) => set({ jwt, walletAddress, expiresAt }),
  clearAuth: () =>
    set({ jwt: null, walletAddress: null, expiresAt: null, depositWalletMode: false, depositWalletAddress: null }),
  setDepositWalletMode: (depositWalletMode, depositWalletAddress) => set({ depositWalletMode, depositWalletAddress }),
}));
