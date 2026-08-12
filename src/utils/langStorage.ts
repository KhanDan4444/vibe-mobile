import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { normalizeLanguage, type AppLanguage } from '@/src/i18n/languages';

const LANG_KEY_PREFIX = 'vibe-mobile-lang';
export const GUEST_LANG_KEY = `${LANG_KEY_PREFIX}:guest`;

export function langStorageKey(userId?: number | null, gymId?: number | null) {
  if (gymId) return `${LANG_KEY_PREFIX}:gym:${gymId}`;
  if (userId) return `${LANG_KEY_PREFIX}:user:${userId}`;
  return GUEST_LANG_KEY;
}

export function defaultGuestLanguage(): AppLanguage {
  const deviceLang = Localization.getLocales()[0]?.languageCode;
  return normalizeLanguage(deviceLang);
}

export async function readGuestLanguage(): Promise<AppLanguage> {
  const stored = await AsyncStorage.getItem(GUEST_LANG_KEY);
  return normalizeLanguage(stored);
}

export async function persistGuestLanguage(code: AppLanguage): Promise<AppLanguage> {
  const normalized = normalizeLanguage(code);
  await AsyncStorage.setItem(GUEST_LANG_KEY, normalized);
  return normalized;
}

export async function readStoredLanguage(userId?: number | null, gymId?: number | null): Promise<AppLanguage> {
  if (!userId && !gymId) return readGuestLanguage();
  const key = langStorageKey(userId, gymId);
  const stored = await AsyncStorage.getItem(key);
  if (stored === 'am' || stored === 'en' || stored === 'om') {
    return stored;
  }
  // No per-user preference yet — keep the language chosen on login/guest screens.
  return readGuestLanguage();
}

/** Seed user/gym language from guest when the scoped key is still empty. */
export async function ensureUserLanguageFromGuest(
  userId?: number | null,
  gymId?: number | null,
): Promise<AppLanguage> {
  const code = await readStoredLanguage(userId, gymId);
  const key = langStorageKey(userId, gymId);
  if (key !== GUEST_LANG_KEY) {
    const existing = await AsyncStorage.getItem(key);
    if (existing !== 'am' && existing !== 'en' && existing !== 'om') {
      await AsyncStorage.setItem(key, code);
    }
  }
  return code;
}
