import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfflineJob } from '@/src/offline/types';

const QUEUE_KEY = 'vibe-offline-queue';

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

export async function enqueueOfflineJob(job: OfflineJob): Promise<void> {
  const jobs = await readOfflineQueue();
  jobs.push({
    ...job,
    attempts: job.attempts ?? 0,
    status: job.status ?? 'pending',
  });
  await writeOfflineQueue(jobs);
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
