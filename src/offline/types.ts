export type OfflineJobType =
  | 'enroll'
  | 'renew'
  | 'payment'
  | 'change-plan'
  | 'transfer'
  | 'update-member'
  | 'create-plan'
  | 'update-plan'
  | 'create-branch'
  | 'update-branch'
  | 'update-profile';

export interface OfflineJob {
  id: string;
  type: OfflineJobType;
  payload: Record<string, unknown>;
  memberId?: number;
  entityId?: number;
  createdAt: string;
}

export const OFFLINE_QUEUED = { __offlineQueued: true as const };
export type OfflineQueued = typeof OFFLINE_QUEUED;

export function isOfflineQueued(value: unknown): value is OfflineQueued {
  return typeof value === 'object' && value !== null && '__offlineQueued' in value;
}
