import { create } from 'zustand';

/**
 * Polymarket builder API credentials, entered by the user for the local-demo
 * direct-relayer flow. Held in memory ONLY — never persisted to localStorage
 * and never sent to the Dimes backend. Cleared on page refresh.
 */
interface BuilderCredsState {
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
  /** True only when all three fields are populated. */
  hasCreds: boolean;
  setCreds: (apiKey: string, apiSecret: string, apiPassphrase: string) => void;
  clearCreds: () => void;
}

export const useBuilderCredsStore = create<BuilderCredsState>((set) => ({
  apiKey: '',
  apiSecret: '',
  apiPassphrase: '',
  hasCreds: false,
  setCreds: (apiKey, apiSecret, apiPassphrase) => {
    const trimmedKey = apiKey.trim();
    const trimmedSecret = apiSecret.trim();
    const trimmedPassphrase = apiPassphrase.trim();
    set({
      apiKey: trimmedKey,
      apiSecret: trimmedSecret,
      apiPassphrase: trimmedPassphrase,
      hasCreds: Boolean(trimmedKey && trimmedSecret && trimmedPassphrase),
    });
  },
  clearCreds: () => set({ apiKey: '', apiSecret: '', apiPassphrase: '', hasCreds: false }),
}));
