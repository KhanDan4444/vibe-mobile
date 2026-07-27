import { ApiError } from '@/src/api/client';

/** True when the device could not reach the API (offline, DNS, TLS, etc.). */
export function isNetworkApiError(error: unknown): boolean {
  if (error instanceof ApiError && (error.status === 0 || error.code === 'NETWORK')) {
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
  return /EXPO_PUBLIC_API_URL|Cannot reach the server at|Could not connect to the server/i.test(
    message
  );
}

/**
 * Message safe to show in the UI. Network failures use `networkFallback`
 * (pass a translated string). Other API errors keep the server message.
 */
export function userFacingApiMessage(
  error: unknown,
  networkFallback: string,
  fallback: string
): string {
  if (isNetworkApiError(error)) return networkFallback;
  if (error instanceof Error && error.message.trim()) {
    if (isNetworkErrorMessage(error.message)) return networkFallback;
    return error.message;
  }
  return fallback;
}
