/** Minimum spinner time on Retry so instant failures still feel intentional. */
export const RETRY_MIN_BUSY_MS = 5000;

export async function settleMinBusy(startedAt: number, minMs = RETRY_MIN_BUSY_MS): Promise<void> {
  const wait = minMs - (Date.now() - startedAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}
