import { useCallback, useState } from 'react';
import { settleMinBusy } from '@/src/utils/minBusy';

type RetryableQuery = {
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  data: unknown;
  refetch: () => Promise<unknown>;
};

/**
 * Keeps the LoadError UI mounted while a retry is in flight so the screen
 * does not flash skeleton/empty content (common when offline refetch fails fast).
 * Enforces a short minimum busy time so the spinner is visible even on instant failures.
 */
export function useLoadRetry(query: RetryableQuery) {
  const [retrying, setRetrying] = useState(false);

  const showLoading = query.isLoading && !query.isError && !retrying;
  const showError =
    retrying || query.isError || (!query.data && !query.isLoading && !query.isFetching);
  const loading = retrying;

  const onRetry = useCallback(() => {
    if (retrying) return Promise.resolve();
    setRetrying(true);
    const started = Date.now();
    return Promise.resolve(query.refetch())
      .catch(() => undefined)
      .finally(async () => {
        await settleMinBusy(started);
        setRetrying(false);
      });
  }, [query.refetch, retrying]);

  return { showLoading, showError, loading, onRetry };
}
