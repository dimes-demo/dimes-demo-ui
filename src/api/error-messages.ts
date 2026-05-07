// Re-export from the SDK
import { DimesApiError, formatErrorMessage } from '@dimes-dot-fi/sdk';

export function formatApiError(err: unknown): string {
  if (err instanceof DimesApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong';
}

export { formatErrorMessage };
