import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelPosition } from '../api/positions';
import { ApiError } from '../api/client';

export function useCancelPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positionId: string) => {
      try {
        await cancelPosition(positionId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) return;
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}
