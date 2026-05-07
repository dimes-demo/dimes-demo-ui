// Re-export from the SDK
import { formatContractError as sdkFormatContractError } from '@dimes-dot-fi/sdk/contract';
import type { DimesContractError } from '@dimes-dot-fi/sdk';

export type FormattedContractError = {
  message: string;
  code?: string;
};

export function formatContractError(err: unknown): FormattedContractError {
  const result = sdkFormatContractError(err);
  return { message: result.message, code: result.code };
}
