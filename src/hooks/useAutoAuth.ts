import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useAuthStore } from '../store/auth';
import { DEMO_WALLET_ADDRESS, isDemoMode, requestAuthToken } from '../api/auth';

const REFRESH_BUFFER_MS = 60_000;

/**
 * Keep a valid JWT in the auth store.
 *
 * In demo mode the token is scoped to the hardcoded demo wallet and is
 * minted on mount so the market list is visible before wallet connect.
 * In real mode the token tracks the connected wallet and is only minted
 * once a wallet is present. Refreshes 60s before expiry in both cases.
 */
export function useAutoAuth() {
  const { address, isConnected } = useAccount();
  const { setAuth, clearAuth } = useAuthStore();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const effectiveAddress = isDemoMode
      ? DEMO_WALLET_ADDRESS
      : isConnected && address
        ? address
        : undefined;

    function clearTimer() {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
        refreshTimer.current = undefined;
      }
    }

    function scheduleRefresh(expiresAt: string) {
      clearTimer();
      const msUntilExpiry = new Date(expiresAt).getTime() - Date.now();
      const refreshIn = Math.max(msUntilExpiry - REFRESH_BUFFER_MS, 0);
      refreshTimer.current = setTimeout(fetchToken, refreshIn);
    }

    function fetchToken() {
      if (!effectiveAddress) return;
      requestAuthToken(effectiveAddress)
        .then((result) => {
          setAuth(result.token, effectiveAddress, result.expiresAt);
          scheduleRefresh(result.expiresAt);
        })
        .catch((err) => {
          console.error('[auth] failed to mint token', err);
        });
    }

    if (effectiveAddress) {
      fetchToken();
    } else {
      clearTimer();
      clearAuth();
    }

    return clearTimer;
  }, [isConnected, address, setAuth, clearAuth]);
}
