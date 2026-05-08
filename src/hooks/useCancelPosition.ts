import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelPosition } from '../api/positions';

function isConflict(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    return (err as { status: number }).status === 409;
  }
  return false;
}

export type CancelResult = 'cancelled' | 'already_cancelling';

export function useCancelPosition() {
  const queryClient = useQueryClient();

  return useMutation<CancelResult, Error, string>({
    mutationFn: async (positionId: string) => {
      try {
        await cancelPosition(positionId);
        return 'cancelled';
      } catch (err) {
        if (isConflict(err)) return 'already_cancelling';
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
    onError: (err: Error) => {
      console.warn('[cancel-position] failed:', err);
    },
  });
}
