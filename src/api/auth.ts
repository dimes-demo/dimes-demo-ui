import { apiFetchPublic } from './client';

// ---------------------------------------------------------------------------
// DEMO-ONLY AUTH
//
// This module mints auth tokens directly from the browser. Real integrations
// should mint tokens on a backend with the partner API key kept server-side,
// and have the frontend receive a JWT from that backend — never ship
// VITE_API_KEY in production. The key-in-browser path exists so this demo
// runs end-to-end with a single command. See README → "Auth: demo vs real".
// ---------------------------------------------------------------------------

interface TokenResponse {
  token: string;
  expiresAt: string;
}

const apiKey = import.meta.env.VITE_API_KEY as string | undefined;

/**
 * Request a JWT for the given wallet.
 *
 * If VITE_API_KEY is set, this calls POST /tokens with an Api-Key header and
 * returns a real token scoped to the partner. Otherwise it falls back to
 * POST /demo-token which issues sandbox-only tokens pinned to the fixed
 * demo wallet (the `walletAddress` argument is ignored by the server in
 * this path).
 */
export async function requestAuthToken(
  walletAddress: string,
): Promise<TokenResponse> {
  if (apiKey) {
    return apiFetchPublic<TokenResponse>('/v1/prediction-markets/tokens', {
      method: 'POST',
      headers: { Authorization: `Api-Key ${apiKey}` },
      body: JSON.stringify({ wallet_address: walletAddress }),
    });
  }

  return apiFetchPublic<TokenResponse>('/v1/prediction-markets/demo-token', {
    method: 'POST',
    body: JSON.stringify({ wallet_address: walletAddress }),
  });
}
