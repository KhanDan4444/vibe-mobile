import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import type { AppLanguage } from '@/src/i18n';

const LANG_KEY_PREFIX = 'vibe-mobile-lang';
export const GUEST_LANG_KEY = `${LANG_KEY_PREFIX}:guest`;

export function langStorageKey(userId?: number | null, gymId?: number | null) {
  if (gymId) return `${LANG_KEY_PREFIX}:gym:${gymId}`;
  if (userId) return `${LANG_KEY_PREFIX}:user:${userId}`;
  return GUEST_LANG_KEY;
}

export function defaultGuestLanguage(): AppLanguage {
  const deviceLang = Localization.getLocales()[0]?.languageCode;
  return deviceLang === 'am' ? 'am' : 'en';
}

export async function readGuestLanguage(): Promise<AppLanguage> {
  const stored = await AsyncStorage.getItem(GUEST_LANG_KEY);
  if (stored === 'am' || stored === 'en') return stored;
  return defaultGuestLanguage();
}

export async function persistGuestLanguage(code: AppLanguage): Promise<AppLanguage> {
  const normalized = code === 'am' ? 'am' : 'en';
  await AsyncStorage.setItem(GUEST_LANG_KEY, normalized);
  return normalized;
}

export async function readStoredLanguage(userId?: number | null, gymId?: number | null): Promise<AppLanguage> {
  if (!userId && !gymId) return readGuestLanguage();
  const key = langStorageKey(userId, gymId);
  const stored = await AsyncStorage.getItem(key);
  if (stored === 'am' || stored === 'en') return stored;
  return 'en';
}
