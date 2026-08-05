import { useCallback, useState } from 'react';

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
    return Promise.resolve(query.refetch()).finally(() => {
      setRetrying(false);
    });
  }, [query.refetch, retrying]);

  return { showLoading, showError, loading, onRetry };
}
