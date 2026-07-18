import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import i18n from '@/src/i18n';
import { createOfflineJobId, enqueueOfflineJob } from '@/src/offline/queue';
import { useNetwork } from '@/src/offline/NetworkProvider';
import {
  OFFLINE_QUEUED,
  enrollPayloadHasPhoto,
  type OfflineJobType,
  type OfflineQueued,
} from '@/src/offline/types';

type OfflineMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData | OfflineQueued, Error, TVariables>,
  'mutationFn'
> & {
  jobType: OfflineJobType;
  memberId?: number | ((variables: TVariables) => number | undefined);
  entityId?: number | ((variables: TVariables) => number | undefined);
  mutationFn: (variables: TVariables) => Promise<TData>;
};

export function useOfflineMutation<TData, TVariables>({
  jobType,
  memberId,
  entityId,
  mutationFn,
  ...options
}: OfflineMutationOptions<TData, TVariables>) {
  const { user } = useAuth();
  const { isOnline, refreshPendingCount } = useNetwork();

  return useMutation<TData | OfflineQueued, Error, TVariables>({
    ...options,
    mutationFn: async (variables) => {
      if (isOnline) {
        return mutationFn(variables);
      }

      const payload = variables as Record<string, unknown>;
      if (jobType === 'enroll' && enrollPayloadHasPhoto(payload)) {
        throw new Error(i18n.t('offline.photoEnrollRequiresOnline'));
      }
      if (jobType === 'update-member' && enrollPayloadHasPhoto(payload)) {
        throw new Error(i18n.t('offline.photoUpdateRequiresOnline'));
      }

      const resolvedMemberId = typeof memberId === 'function' ? memberId(variables) : memberId;
      const resolvedEntityId = typeof entityId === 'function' ? entityId(variables) : entityId;

      await enqueueOfflineJob({
        id: createOfflineJobId(),
        type: jobType,
        payload,
        gymId: typeof user?.gym_id === 'number' ? user.gym_id : undefined,
        memberId: resolvedMemberId,
        entityId: resolvedEntityId,
        createdAt: new Date().toISOString(),
        attempts: 0,
        status: 'pending',
      });
      await refreshPendingCount();
      return OFFLINE_QUEUED;
    },
  });
}
