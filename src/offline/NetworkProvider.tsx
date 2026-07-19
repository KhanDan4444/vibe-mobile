import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { getOfflineQueueSummary, processOfflineQueue } from '@/src/offline/processQueue';
import { clearOfflineQueueForGym } from '@/src/offline/queue';
import { queryClient } from '@/src/query/client';

interface NetworkContextValue {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  lastError?: string;
  isSyncing: boolean;
  refreshPendingCount: () => Promise<void>;
  /** @param force When true (manual Sync), ignore retry backoff and re-attempt failed jobs. */
  syncNow: (force?: boolean) => Promise<number>;
  discardQueuedChanges: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

function computeOnline(state: { isConnected: boolean | null; isInternetReachable: boolean | null }) {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const gymId = user?.gym_id ?? null;
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastError, setLastError] = useState<string | undefined>();
  const [isSyncing, setIsSyncing] = useState(false);
  const prevPending = useRef(0);
  const wasOnline = useRef(true);

  const refreshPendingCount = useCallback(async () => {
    const summary = await getOfflineQueueSummary(gymId);
    setPendingCount(summary.pending);
    setFailedCount(summary.failed);
    setLastError(summary.lastError);
  }, [gymId]);

  const syncNow = useCallback(
    async (force = false) => {
      if (!token || !isOnline) return 0;
      setIsSyncing(true);
      try {
        const synced = await processOfflineQueue(token, queryClient, gymId, { force });
        await refreshPendingCount();
        return synced;
      } finally {
        setIsSyncing(false);
      }
    },
    [token, isOnline, gymId, refreshPendingCount]
  );

  const discardQueuedChanges = useCallback(async () => {
    await clearOfflineQueueForGym(gymId);
    await refreshPendingCount();
  }, [gymId, refreshPendingCount]);

  useEffect(() => {
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => {
        const online = computeOnline(state);
        setOnline(online);
      })
    );

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(computeOnline(state));
    });

    void refreshPendingCount();
    return () => unsubscribe();
  }, [refreshPendingCount]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') void refreshPendingCount();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [refreshPendingCount]);

  // Auto-sync when coming online, or when the first pending job appears while online.
  useEffect(() => {
    if (!token) return;

    const cameOnline = !wasOnline.current && isOnline;
    const newPending = prevPending.current === 0 && pendingCount > 0;
    wasOnline.current = isOnline;
    prevPending.current = pendingCount;

    if (!isOnline || pendingCount === 0) return;
    if (!cameOnline && !newPending) return;

    void syncNow(false);
  }, [token, isOnline, pendingCount, syncNow]);

  const value = useMemo(
    () => ({
      isOnline,
      pendingCount,
      failedCount,
      lastError,
      isSyncing,
      refreshPendingCount,
      syncNow,
      discardQueuedChanges,
    }),
    [
      isOnline,
      pendingCount,
      failedCount,
      lastError,
      isSyncing,
      refreshPendingCount,
      syncNow,
      discardQueuedChanges,
    ]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
}
