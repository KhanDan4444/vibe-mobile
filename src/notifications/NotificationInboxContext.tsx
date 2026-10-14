import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { dismissNotificationIds, fetchDashboard, markNotificationIdsRead } from '@/src/api/dashboard';
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
  const serverApplied = useRef(false);
  const pushedRead = useRef(new Set<string>());
  const pushedDismissed = useRef(new Set<string>());

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const state = await loadNotificationState(user.id);
      if (cancelled || serverApplied.current) return;
      setReadIds(state.readIds);
      setDismissedIds(state.dismissedIds);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', branchKey],
    queryFn: () => fetchDashboard(token!, selectedBranchId),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  useEffect(() => {
    const data = dashboardQuery.data;
    if (!user?.id || !token || !data || !Array.isArray(data.notificationReadIds)) return;
    const serverRead = data.notificationReadIds;
    const serverDismissed = data.notificationDismissedIds ?? [];
    serverApplied.current = true;
    setHydrated(true);

    setReadIds((prev) => {
      const missing = prev.filter((id) => !serverRead.includes(id) && !pushedRead.current.has(id));
      missing.forEach((id) => pushedRead.current.add(id));
      if (missing.length) {
        markNotificationIdsRead(token, missing)
          .then((saved) => {
            serverApplied.current = true;
            setReadIds(saved.readIds);
            setDismissedIds(saved.dismissedIds);
            saveReadIds(user.id, saved.readIds).catch(() => {});
            saveDismissedIds(user.id, saved.dismissedIds).catch(() => {});
          })
          .catch(() => {});
      }
      const next = [...new Set([...prev, ...serverRead])];
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) return prev;
      saveReadIds(user.id, next).catch(() => {});
      return next;
    });

    setDismissedIds((prev) => {
      const missing = prev.filter((id) => !serverDismissed.includes(id) && !pushedDismissed.current.has(id));
      missing.forEach((id) => pushedDismissed.current.add(id));
      if (missing.length) {
        dismissNotificationIds(token, missing).catch(() => {});
      }
      const next = [...new Set([...prev, ...serverDismissed])];
      if (next.length === prev.length && next.every((id, index) => id === prev[index])) return prev;
      saveDismissedIds(user.id, next).catch(() => {});
      return next;
    });
  }, [user?.id, token, dashboardQuery.data, hydrated]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void dashboardQuery.refetch();
    });
    return () => sub.remove();
  }, [dashboardQuery]);

  const allNotifications = dashboardQuery.data?.notifications ?? [];
  const notifications = useMemo(
    () => visibleNotifications(allNotifications, dismissedIds),
    [allNotifications, dismissedIds]
  );
  const unread = unreadCount(notifications, readIds);

  const applyServerInbox = useCallback(
    (saved: { readIds: string[]; dismissedIds: string[] }) => {
      if (!user?.id) return;
      serverApplied.current = true;
      setReadIds(saved.readIds);
      setDismissedIds(saved.dismissedIds);
      saveReadIds(user.id, saved.readIds).catch(() => {});
      saveDismissedIds(user.id, saved.dismissedIds).catch(() => {});
    },
    [user?.id]
  );

  const markRead = useCallback(
    (id: string) => {
      if (!user?.id || !token) return;
      setReadIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        saveReadIds(user.id, next).catch(() => {});
        return next;
      });
      markNotificationIdsRead(token, [id]).then(applyServerInbox).catch(() => {});
    },
    [user?.id, token, applyServerInbox]
  );

  const markAllRead = useCallback(() => {
    if (!user?.id || !token) return;
    const ids = notifications.map((n) => n.id);
    const next = [...new Set([...readIds, ...ids])];
    setReadIds(next);
    saveReadIds(user.id, next).catch(() => {});
    markNotificationIdsRead(token, ids).then(applyServerInbox).catch(() => {});
  }, [user?.id, token, readIds, notifications, applyServerInbox]);

  const dismiss = useCallback(
    (id: string) => {
      if (!user?.id || !token) return;
      setDismissedIds((prev) => {
        const next = prev.includes(id) ? prev : [...prev, id];
        saveDismissedIds(user.id, next).catch(() => {});
        return next;
      });
      setReadIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        saveReadIds(user.id, next).catch(() => {});
        return next;
      });
      dismissNotificationIds(token, [id]).then(applyServerInbox).catch(() => {});
    },
    [user?.id, token, applyServerInbox]
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
