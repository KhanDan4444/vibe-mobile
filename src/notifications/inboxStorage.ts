import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DashboardNotification } from '@/src/types/api';

const readKey = (userId: number) => `vibe-notif-read:${userId}`;
const dismissedKey = (userId: number) => `vibe-notif-dismissed:${userId}`;

export async function loadNotificationState(userId: number) {
  const [readRaw, dismissedRaw] = await Promise.all([
    AsyncStorage.getItem(readKey(userId)),
    AsyncStorage.getItem(dismissedKey(userId)),
  ]);
  return {
    readIds: readRaw ? (JSON.parse(readRaw) as string[]) : [],
    dismissedIds: dismissedRaw ? (JSON.parse(dismissedRaw) as string[]) : [],
  };
}

export async function saveReadIds(userId: number, ids: string[]) {
  await AsyncStorage.setItem(readKey(userId), JSON.stringify(ids));
}

export async function saveDismissedIds(userId: number, ids: string[]) {
  await AsyncStorage.setItem(dismissedKey(userId), JSON.stringify(ids));
}

export function visibleNotifications(
  all: DashboardNotification[],
  dismissedIds: string[]
) {
  return all.filter((n) => !dismissedIds.includes(n.id));
}

export function unreadCount(notifications: DashboardNotification[], readIds: string[]) {
  return notifications.filter((n) => !readIds.includes(n.id)).length;
}
