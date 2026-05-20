import { apiFetch } from './client';

export interface RelayerBatchCall {
  target: string;
  value: string;
  data: string;
}

export interface SubmitRelayerBatchParams {
  depositWalletAddress: string;
  nonce: string;
  deadline: string;
  calls: RelayerBatchCall[];
  signature: string;
}

export interface RelayerSubmissionResult {
  transactionHash: string;
  status: string;
  blockNumber: string;
}

/**
 * Forward a deposit-wallet batch — signed by the wallet owner in the browser —
 * to the backend, which adds the Polymarket relayer HMAC auth and submits it.
 */
export async function submitRelayerBatch(params: SubmitRelayerBatchParams): Promise<RelayerSubmissionResult> {
  return apiFetch<RelayerSubmissionResult>('/v1/prediction-markets/relayer-submissions', {
    method: 'POST',
    body: JSON.stringify({
      deposit_wallet_address: params.depositWalletAddress,
      nonce: params.nonce,
      deadline: params.deadline,
      calls: params.calls,
      signature: params.signature,
    }),
  });
}
