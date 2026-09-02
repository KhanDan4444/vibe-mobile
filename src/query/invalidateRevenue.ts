import type { QueryClient } from '@tanstack/react-query';

/** Refresh revenue tab list/summary and reports after a payment is created or changed. */
export function invalidateRevenueQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['payments'] });
  void queryClient.invalidateQueries({ queryKey: ['report-revenue-summary'] });
}
