import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchDashboard } from '@/src/api/dashboard';
import { ApiError } from '@/src/api/client';

interface GymBootContextValue {
  booting: boolean;
  bootError: Error | null;
  retrying: boolean;
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
  const [retrying, setRetrying] = useState(false);
  /** Keep the last boot error visible while a retry is in flight (query may clear error briefly). */
  const [heldError, setHeldError] = useState<Error | null>(null);

  const bootQuery = useQuery({
    queryKey: ['gym-boot', token],
    queryFn: () => fetchDashboard(token!, 'all'),
    enabled: Boolean(token),
    retry: false,
    staleTime: 1000 * 60,
  });

  const queryError = bootErrorFromQuery(bootQuery.error);

  useEffect(() => {
    if (bootQuery.error instanceof ApiError && bootQuery.error.status === 401) {
      void logout();
    }
  }, [bootQuery.error, logout]);

  useEffect(() => {
    if (!token) {
      setHeldError(null);
      setRetrying(false);
      return;
    }
    if (queryError) setHeldError(queryError);
  }, [token, queryError]);

  useEffect(() => {
    // Only dismiss the overlay after a successful boot finishes.
    if (token && bootQuery.isSuccess && !bootQuery.isFetching && !queryError) {
      setHeldError(null);
    }
  }, [token, bootQuery.isSuccess, bootQuery.isFetching, queryError]);

  const retryBoot = useCallback(() => {
    if (retrying) return;
    setRetrying(true);
    const started = Date.now();
    const MIN_BUSY_MS = 5000;
    void bootQuery
      .refetch()
      .finally(async () => {
        const wait = MIN_BUSY_MS - (Date.now() - started);
        if (wait > 0) {
          await new Promise((r) => setTimeout(r, wait));
        }
        setRetrying(false);
      });
  }, [retrying, bootQuery]);

  const value = useMemo(
    () => ({
      booting: bootQuery.isLoading,
      // Sticky error: stay on the error UI during retry instead of flashing the tabs.
      bootError: heldError,
      retrying,
      retryBoot,
    }),
    [bootQuery.isLoading, heldError, retrying, retryBoot]
  );

  return <GymBootContext.Provider value={value}>{children}</GymBootContext.Provider>;
}

export function useGymBoot() {
  const ctx = useContext(GymBootContext);
  if (!ctx) throw new Error('useGymBoot must be used within GymBootProvider');
  return ctx;
}
