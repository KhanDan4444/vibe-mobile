import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchDashboard } from '@/src/api/dashboard';
import { useBranchScope } from '@/src/context/BranchContext';
import {
  loadNotificationState,
  saveDismissedIds,
  saveReadIds,
  unreadCount,
  visibleNotifications,
} from '@/src/notifications/inboxStorage';
import type { DashboardNotification } from '@/src/types/api';

interface NotificationInboxValue {
  notifications: DashboardNotification[];
  unread: number;
  loading: boolean;
  isRead: (id: string) => boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  refresh: () => void;
}

const NotificationInboxContext = createContext<NotificationInboxValue | null>(null);

export function NotificationInboxProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const { selectedBranchId } = useBranchScope();
  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const [readIds, setReadIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const state = await loadNotificationState(user.id);
      setReadIds(state.readIds);
      setDismissedIds(state.dismissedIds);
      setHydrated(true);
    })();
  }, [user?.id]);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', branchKey],
    queryFn: () => fetchDashboard(token!, selectedBranchId),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  const allNotifications = dashboardQuery.data?.notifications ?? [];
  const notifications = useMemo(
    () => visibleNotifications(allNotifications, dismissedIds),
    [allNotifications, dismissedIds]
  );
  const unread = unreadCount(notifications, readIds);

  const markRead = useCallback(
    (id: string) => {
      if (!user?.id) return;
      setReadIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        saveReadIds(user.id, next).catch(() => {});
        return next;
      });
    },
    [user?.id]
  );

  const markAllRead = useCallback(() => {
    if (!user?.id) return;
    const next = [...new Set([...readIds, ...notifications.map((n) => n.id)])];
    setReadIds(next);
    saveReadIds(user.id, next).catch(() => {});
  }, [user?.id, readIds, notifications]);

  const dismiss = useCallback(
    (id: string) => {
      if (!user?.id) return;
      setDismissedIds((prev) => {
        const next = [...prev, id];
        saveDismissedIds(user.id, next).catch(() => {});
        return next;
      });
      markRead(id);
    },
    [user?.id, markRead]
  );

  const value: NotificationInboxValue = {
    notifications,
    unread,
    loading: !hydrated || dashboardQuery.isLoading,
    isRead: (id) => readIds.includes(id),
    markRead,
    markAllRead,
    dismiss,
    refresh: () => dashboardQuery.refetch(),
  };

  return <NotificationInboxContext.Provider value={value}>{children}</NotificationInboxContext.Provider>;
}

export function useNotificationInbox() {
  const ctx = useContext(NotificationInboxContext);
  if (!ctx) {
    throw new Error('useNotificationInbox must be used within NotificationInboxProvider');
  }
  return ctx;
}
