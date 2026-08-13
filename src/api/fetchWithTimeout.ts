/** Default wait before aborting an API request (mutations + reads). */
export const REQUEST_TIMEOUT_MS = 20_000;

export const REQUEST_TIMEOUT_MESSAGE =
  'The request timed out. Check your connection and try again.';

/**
 * fetch() with an AbortController timeout.
 * If `options.signal` is already set, either abort aborts the request.
 * Timed-out errors have `name === 'TimeoutError'` and `code === 'TIMEOUT'`.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const { signal: outerSignal, ...rest } = options;
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onOuterAbort = () => {
    controller.abort();
  };

  if (outerSignal) {
    if (outerSignal.aborted) {
      clearTimeout(timeoutId);
      throw outerSignal.reason ?? new DOMException('Aborted', 'AbortError');
    }
    outerSignal.addEventListener('abort', onOuterAbort, { once: true });
  }

  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      const err = new Error(REQUEST_TIMEOUT_MESSAGE) as Error & { code?: string };
      err.name = 'TimeoutError';
      err.code = 'TIMEOUT';
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (outerSignal) {
      outerSignal.removeEventListener('abort', onOuterAbort);
    }
  }
}

export function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; code?: string };
  return e.name === 'TimeoutError' || e.code === 'TIMEOUT';
}
