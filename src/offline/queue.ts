import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfflineJob } from '@/src/offline/types';

const QUEUE_KEY = 'vibe-offline-queue';
/** Last gym that owned the session while queue jobs existed (for legacy untagged jobs). */
const QUEUE_OWNER_GYM_KEY = 'vibe-offline-queue-gym';

export async function readOfflineQueue(): Promise<OfflineJob[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OfflineJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeOfflineQueue(jobs: OfflineJob[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(jobs));
}

export async function rememberOfflineQueueGym(gymId: number | null | undefined): Promise<void> {
  if (gymId == null) {
    await AsyncStorage.removeItem(QUEUE_OWNER_GYM_KEY);
    return;
  }
  await AsyncStorage.setItem(QUEUE_OWNER_GYM_KEY, String(gymId));
}

/**
 * Keep pending writes for this gym after login; drop jobs from other gyms.
 * Untagged (legacy) jobs are kept only when the last logged-out gym matches.
 */
export async function retainOfflineQueueForGym(gymId: number): Promise<void> {
  const [jobs, ownerRaw] = await Promise.all([
    readOfflineQueue(),
    AsyncStorage.getItem(QUEUE_OWNER_GYM_KEY),
  ]);
  const ownerGym = ownerRaw != null && ownerRaw !== '' ? Number(ownerRaw) : null;
  const ownerMatches = ownerGym != null && !Number.isNaN(ownerGym) && ownerGym === gymId;

  const kept = jobs
    .filter((job) => {
      if (typeof job.gymId === 'number') return job.gymId === gymId;
      return ownerMatches;
    })
    .map((job) => (typeof job.gymId === 'number' ? job : { ...job, gymId }));

  await writeOfflineQueue(kept);
  await rememberOfflineQueueGym(gymId);
}

export async function enqueueOfflineJob(job: OfflineJob): Promise<void> {
  const jobs = await readOfflineQueue();
  jobs.push({
    ...job,
    attempts: job.attempts ?? 0,
    status: job.status ?? 'pending',
  });
  await writeOfflineQueue(jobs);
  if (typeof job.gymId === 'number') {
    await rememberOfflineQueueGym(job.gymId);
  }
}

export async function updateOfflineJob(jobId: string, patch: Partial<OfflineJob>): Promise<void> {
  const jobs = await readOfflineQueue();
  await writeOfflineQueue(jobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job)));
}

export async function removeOfflineJob(jobId: string): Promise<void> {
  const jobs = await readOfflineQueue();
  await writeOfflineQueue(jobs.filter((job) => job.id !== jobId));
}

export function createOfflineJobId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function jobBelongsToGym(job: OfflineJob, gymId: number | null | undefined): boolean {
  if (gymId == null) return true;
  if (typeof job.gymId === 'number') return job.gymId === gymId;
  // Legacy untagged jobs: allow sync for the active session (owner hint already pruned on login).
  return true;
}
