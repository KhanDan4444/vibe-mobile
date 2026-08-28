import { ApiError } from '@/src/api/client';

/** True when the request aborted because the server did not respond in time. */
export function isTimeoutApiError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === 'TIMEOUT';
}

/** True when the device could not reach the API (offline, DNS, TLS, timeout, etc.). */
export function isNetworkApiError(error: unknown): boolean {
  if (
    error instanceof ApiError &&
    (error.status === 0 || error.code === 'NETWORK' || error.code === 'TIMEOUT')
  ) {
    return true;
  }
  if (error instanceof Error) {
    return isNetworkErrorMessage(error.message);
  }
  return false;
}

/** Detects current + legacy network error copy (incl. old URL/env leaks). */
export function isNetworkErrorMessage(message?: string | null): boolean {
  if (!message?.trim()) return false;
  return /EXPO_PUBLIC_API_URL|Cannot reach the server at|Could not connect to the server|request timed out/i.test(
    message
  );
}

/**
 * Message safe to show in the UI. Network failures use `networkFallback`
 * (pass a translated string). Timeouts keep a specific retry message.
 * Other API errors keep the server message.
 */
export function userFacingApiMessage(
  error: unknown,
  networkFallback: string,
  fallback: string
): string {
  if (isTimeoutApiError(error) && error.message.trim()) {
    return error.message;
  }
  if (isNetworkApiError(error)) return networkFallback;
  if (error instanceof Error && error.message.trim()) {
    if (isNetworkErrorMessage(error.message)) return networkFallback;
    return error.message;
  }
  return fallback;
}
