import { ApiError } from '@/src/api/client';

/** Map missing trainers API (404 / Not found) to a clear owner-facing message. */
export function trainerMutationErrorMessage(
  error: unknown,
  unavailableMessage: string,
  fallback: string
): string {
  if (error instanceof ApiError && error.status === 404) return unavailableMessage;
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (/^not found\.?$/i.test(msg)) return unavailableMessage;
    if (msg) return msg;
  }
  return fallback;
}
