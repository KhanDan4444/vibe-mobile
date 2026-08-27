import { useIsRestoring } from '@tanstack/react-query';

/**
 * True while persisted cache is hydrating, or while a query has no data yet.
 * Use instead of `isLoading` alone — during restore RQ sets isPending without isFetching,
 * so `isLoading` is false and screens would render blank.
 */
export function useQueryScreenLoading(isLoading: boolean, hasData: boolean, isPending = false) {
  const restoring = useIsRestoring();
  return restoring || isLoading || (isPending && !hasData);
}

/** Pull-to-refresh spinner — exclude pagination fetches so the list doesn't jump. */
export function pullRefreshing(isRefetching: boolean, isFetchingNextPage = false) {
  return isRefetching && !isFetchingNextPage;
}
