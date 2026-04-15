import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelPosition } from '../api/positions';

export function useCancelPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (positionId: string) => cancelPosition(positionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}
