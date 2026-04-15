import { apiFetchPublic } from './client';

// ---------------------------------------------------------------------------
// DEMO-ONLY AUTH
//
// This module mints auth tokens directly from the browser. Real integrations
// should mint tokens on a backend with the partner API key kept server-side,
// and have the frontend receive a JWT from that backend — never ship
// VITE_API_KEY in production. The key-in-browser path exists so this demo
// runs end-to-end with a single command. See README → "Auth: demo vs real".
//
// There are two paths:
//
//   1. Demo path (VITE_API_KEY unset): calls POST /demo-token. The sandbox
//      enforces a single fixed demo wallet on this endpoint and rejects any
//      other wallet address, so the UI hardcodes that wallet. All reads and
//      writes are scoped to the demo wallet regardless of which wallet the
//      user has connected — connect a wallet only to sign on-chain txs.
//
//   2. Real path (VITE_API_KEY set): calls POST /tokens with an Api-Key
//      header and the connected wallet address. Requires a wallet connect
//      before the UI can mint.
// ---------------------------------------------------------------------------

interface TokenResponse {
  token: string;
  expiresAt: string;
}

const apiKey = import.meta.env.VITE_API_KEY as string | undefined;

/** True when the UI is running in demo mode (no VITE_API_KEY set). */
export const isDemoMode = !apiKey;

/**
 * The wallet address the sandbox demo-token endpoint is hardcoded to accept.
 * Mirrors `DemoService.walletAddress` on the backend. In demo mode every
 * request is scoped to this wallet.
 */
export const DEMO_WALLET_ADDRESS = '0xCB93661f8120A082a59642455b776311e1726420' as const;

export async function requestAuthToken(connectedWallet?: string): Promise<TokenResponse> {
  if (apiKey) {
    if (!connectedWallet) {
      throw new Error('requestAuthToken: wallet address required when VITE_API_KEY is set');
    }
    return apiFetchPublic<TokenResponse>('/v1/prediction-markets/tokens', {
      method: 'POST',
      headers: { Authorization: `Api-Key ${apiKey}` },
      body: JSON.stringify({ wallet_address: connectedWallet }),
    });
  }

  return apiFetchPublic<TokenResponse>('/v1/prediction-markets/demo-token', {
    method: 'POST',
    body: JSON.stringify({ wallet_address: DEMO_WALLET_ADDRESS }),
  });
}
