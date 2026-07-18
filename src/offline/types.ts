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

export type OfflineJobStatus = 'pending' | 'failed';

export interface OfflineJob {
  id: string;
  type: OfflineJobType;
  payload: Record<string, unknown>;
  /** Gym that owned the session when the job was queued — used to survive logout. */
  gymId?: number;
  memberId?: number;
  entityId?: number;
  createdAt: string;
  attempts?: number;
  lastError?: string;
  nextRetryAt?: string;
  status?: OfflineJobStatus;
}

export const OFFLINE_MAX_ATTEMPTS = 5;
export const OFFLINE_RETRY_BASE_MS = 30_000;

export const OFFLINE_QUEUED = { __offlineQueued: true as const };
export type OfflineQueued = typeof OFFLINE_QUEUED;

export function isOfflineQueued(value: unknown): value is OfflineQueued {
  return typeof value === 'object' && value !== null && '__offlineQueued' in value;
}

/** Large base64 photos must not sit in AsyncStorage offline queue. */
export function enrollPayloadHasPhoto(payload: Record<string, unknown>): boolean {
  const photo = payload.photo;
  return typeof photo === 'string' && photo.length > 0;
}
