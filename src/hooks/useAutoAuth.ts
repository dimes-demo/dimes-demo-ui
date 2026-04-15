import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useAuthStore } from '../store/auth';
import { requestAuthToken } from '../api/auth';

const REFRESH_BUFFER_MS = 60_000;

// Placeholder used to mint a sandbox token before the user connects a wallet
// so the market list is visible on first load. The /demo-token endpoint
// ignores this and pins the JWT to the fixed sandbox wallet.
const ANONYMOUS_WALLET = '0x0000000000000000000000000000000000000000';

/**
 * Keep a valid JWT in the auth store.
 *
 * Mints a sandbox token on mount so unauthenticated visitors can browse
 * markets, then re-mints against the connected wallet once one is present.
 * Refreshes 60s before expiry.
 */
export function useAutoAuth() {
  const { address, isConnected } = useAccount();
  const { setAuth } = useAuthStore();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const effectiveAddress = isConnected && address ? address : ANONYMOUS_WALLET;

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
      requestAuthToken(effectiveAddress)
        .then((result) => {
          setAuth(result.token, effectiveAddress, result.expiresAt);
          scheduleRefresh(result.expiresAt);
        })
        .catch((err) => {
          console.error('[auth] failed to mint token', err);
        });
    }

    fetchToken();
    return clearTimer;
  }, [isConnected, address, setAuth]);
}
