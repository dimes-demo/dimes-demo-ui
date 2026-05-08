// Re-export from the SDK
import { formatErrorMessage } from '@dimes-dot-fi/sdk';

export function formatApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong';
}

export { formatErrorMessage };
