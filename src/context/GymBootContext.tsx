import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchDashboard } from '@/src/api/dashboard';
import { ApiError } from '@/src/api/client';

interface GymBootContextValue {
  booting: boolean;
  bootError: Error | null;
  retryBoot: () => void;
}

const GymBootContext = createContext<GymBootContextValue | null>(null);

function bootErrorFromQuery(error: unknown): Error | null {
  if (!error) return null;
  if (error instanceof ApiError && error.status === 401) return null;
  if (error instanceof Error) return error;
  return new Error('Failed to load gym data');
}

export function GymBootProvider({ children }: { children: React.ReactNode }) {
  const { token, logout } = useAuth();

  const bootQuery = useQuery({
    queryKey: ['gym-boot', token],
    queryFn: () => fetchDashboard(token!, 'all'),
    enabled: Boolean(token),
    retry: false,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (bootQuery.error instanceof ApiError && bootQuery.error.status === 401) {
      void logout();
    }
  }, [bootQuery.error, logout]);

  const value = useMemo(
    () => ({
      booting: bootQuery.isLoading,
      bootError: bootErrorFromQuery(bootQuery.error),
      retryBoot: () => {
        void bootQuery.refetch();
      },
    }),
    [bootQuery.error, bootQuery.isLoading, bootQuery.refetch]
  );

  return <GymBootContext.Provider value={value}>{children}</GymBootContext.Provider>;
}

export function useGymBoot() {
  const ctx = useContext(GymBootContext);
  if (!ctx) throw new Error('useGymBoot must be used within GymBootProvider');
  return ctx;
}
