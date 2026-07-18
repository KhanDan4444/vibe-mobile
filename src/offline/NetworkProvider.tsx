import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { getOfflineQueueSummary, processOfflineQueue } from '@/src/offline/processQueue';
import { queryClient } from '@/src/query/client';

interface NetworkContextValue {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  lastError?: string;
  refreshPendingCount: () => Promise<void>;
  syncNow: () => Promise<number>;
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

  const refreshPendingCount = useCallback(async () => {
    const summary = await getOfflineQueueSummary(gymId);
    setPendingCount(summary.pending);
    setFailedCount(summary.failed);
    setLastError(summary.lastError);
  }, [gymId]);

  const syncNow = useCallback(async () => {
    if (!token || !isOnline) return 0;
    const synced = await processOfflineQueue(token, queryClient, gymId);
    await refreshPendingCount();
    return synced;
  }, [token, isOnline, gymId, refreshPendingCount]);

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
    if (!token || !isOnline || pendingCount === 0) return;
    void syncNow();
  }, [token, isOnline, pendingCount, syncNow]);

  const value = useMemo(
    () => ({ isOnline, pendingCount, failedCount, lastError, refreshPendingCount, syncNow }),
    [isOnline, pendingCount, failedCount, lastError, refreshPendingCount, syncNow]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
}
