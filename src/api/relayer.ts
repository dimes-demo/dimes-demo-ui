import { apiFetchPublic } from './client';

// Optional override for the relayer endpoint's base URL. Leave unset to use
// VITE_API_URL like every other call; set this only when the relayer is
// hosted on a separate domain.
const RELAYER_BASE_URL = import.meta.env.VITE_RELAYER_URL as string | undefined;

const apiKey = import.meta.env.VITE_API_KEY as string | undefined;

// Polymarket's relayer, called directly from the browser in the local-demo
// flow. The `to` target is the deposit-wallet factory (same address the
// backend uses when it forwards the batch).
const POLYMARKET_RELAYER_URL = 'https://relayer-v2.polymarket.com';
const DEPOSIT_WALLET_FACTORY_ADDRESS = '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07';

export interface RelayerBatchCall {
  target: string;
  value: string;
  data: string;
}

export interface SubmitRelayerBatchParams {
  depositWalletAddress: string;
  ownerAddress: string;
  nonce: string;
  deadline: string;
  calls: RelayerBatchCall[];
  signature: string;
}

export interface RelayerSubmissionResult {
  transactionHash: string;
  status: string;
  /** Present only for the backend path; the direct relayer call does not return it. */
  blockNumber?: string;
}

export interface BuilderCreds {
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
}

/**
 * Forward a deposit-wallet batch — signed by the wallet owner in the browser —
 * to the backend, which adds the Polymarket relayer HMAC auth and submits it.
 *
 * The endpoint is partner-API-key guarded: it authenticates the calling
 * partner via the Api-Key header, while the batch itself is authorized by the
 * deposit wallet owner's EIP-712 signature. Demo mode (no VITE_API_KEY) has no
 * key to send — set a partner API key to use the push-funded flow.
 */
export async function submitRelayerBatch(params: SubmitRelayerBatchParams): Promise<RelayerSubmissionResult> {
  if (!apiKey) {
    throw new Error('Relayer submission requires a partner API key. Set VITE_API_KEY to use the push-funded flow.');
  }

  return apiFetchPublic<RelayerSubmissionResult>(
    '/v1/prediction-markets/relayer-submissions',
    {
      method: 'POST',
      headers: { Authorization: `Api-Key ${apiKey}` },
      body: JSON.stringify({
        deposit_wallet_address: params.depositWalletAddress,
        nonce: params.nonce,
        deadline: params.deadline,
        calls: params.calls,
        signature: params.signature,
      }),
    },
    RELAYER_BASE_URL,
  );
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_');
}

/**
 * Polymarket builder HMAC: base64url(HMAC_SHA256(base64Decode(secret), message)),
 * where message is `timestamp + "POST" + "/submit" + body`.
 */
async function signRelayerRequest(apiSecret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToBytes(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return bufferToBase64Url(signature);
}

interface RelayerSubmitResponse {
  transactionID?: string;
  id?: string;
  transactionHash?: string;
  state?: string;
}

interface RelayerTransactionRecord {
  state: string;
  transactionHash?: string;
  errorMsg?: string;
}

const TERMINAL_SUCCESS_STATES = ['STATE_EXECUTED', 'STATE_MINED', 'STATE_CONFIRMED'];
const TERMINAL_FAILURE_STATES = ['STATE_FAILED', 'STATE_CANCELLED', 'STATE_INVALID'];
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 60;

async function pollRelayerTransaction(transactionId: string): Promise<string> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const response = await fetch(`${POLYMARKET_RELAYER_URL}/transaction?id=${transactionId}`);
    if (!response.ok) {
      continue;
    }
    const records = (await response.json()) as RelayerTransactionRecord[];
    const record = records[0];
    if (!record) {
      continue;
    }
    if (TERMINAL_SUCCESS_STATES.includes(record.state) && record.transactionHash) {
      return record.transactionHash;
    }
    if (TERMINAL_FAILURE_STATES.includes(record.state)) {
      throw new Error(`Relayer transaction ${record.state}${record.errorMsg ? `: ${record.errorMsg}` : ''}`);
    }
  }
  throw new Error('Timed out waiting for the relayer transaction to mine.');
}

/**
 * Submit the signed deposit-wallet batch straight to Polymarket's relayer from
 * the browser, using user-supplied builder credentials. LOCAL-DEMO ONLY — the
 * builder secret is HMAC'd client-side and never touches the Dimes backend.
 */
export async function submitRelayerBatchDirect(
  params: SubmitRelayerBatchParams,
  creds: BuilderCreds,
): Promise<RelayerSubmissionResult> {
  const payload = {
    type: 'WALLET',
    from: params.ownerAddress,
    to: DEPOSIT_WALLET_FACTORY_ADDRESS,
    nonce: params.nonce,
    signature: params.signature,
    depositWalletParams: {
      depositWallet: params.depositWalletAddress,
      deadline: params.deadline,
      calls: params.calls,
    },
  };
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const hmac = await signRelayerRequest(creds.apiSecret, `${timestamp}POST/submit${body}`);

  const response = await fetch(`${POLYMARKET_RELAYER_URL}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      POLY_BUILDER_API_KEY: creds.apiKey,
      POLY_BUILDER_TIMESTAMP: timestamp,
      POLY_BUILDER_PASSPHRASE: creds.apiPassphrase,
      POLY_BUILDER_SIGNATURE: hmac,
    },
    body,
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Polymarket relayer returned ${response.status}: ${responseText}`);
  }

  const submit = JSON.parse(responseText) as RelayerSubmitResponse;
  if (submit.state && TERMINAL_FAILURE_STATES.includes(submit.state)) {
    throw new Error(`Relayer rejected the batch: ${submit.state}`);
  }

  if (submit.transactionHash && submit.state && TERMINAL_SUCCESS_STATES.includes(submit.state)) {
    return { transactionHash: submit.transactionHash, status: 'success' };
  }

  const transactionId = submit.transactionID ?? submit.id;
  if (!transactionId) {
    throw new Error(`Relayer response missing a transaction id: ${responseText}`);
  }
  const transactionHash = await pollRelayerTransaction(transactionId);
  return { transactionHash, status: 'success' };
}
