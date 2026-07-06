import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

export const PERSISTED_QUERY_KEYS = new Set([
  'dashboard',
  'members',
  'member',
  'member-payments',
  'plans',
  'branches',
  'payments',
  'activity',
  'team',
  'member-sms',
  'gym-profile',
]);
