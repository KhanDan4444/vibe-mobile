import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, PixelRatio, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { useAuthThemeForced } from '@/src/context/AuthThemeContext';
import { changeAppLanguage, nextLanguage, normalizeLanguage, type AppLanguage, LANGUAGE_LABEL_KEYS } from '@/src/i18n';
import { MAX_FONT_SCALE } from '@/src/theme/typography';
import { colorsForTheme, type AppTheme, type ThemeColors } from '@/src/theme/tokens';
import {
  ensureUserLanguageFromGuest,
  langStorageKey,
  persistGuestLanguage,
  readGuestLanguage,
} from '@/src/utils/langStorage';

const THEME_KEY = 'vibe-mobile-theme';
const AUTH_SEGMENTS = new Set(['login', 'register-gym', 'forgot-password']);

function isAuthPath(pathname: string) {
  const segment = pathname.replace(/^\//, '').split('/')[0] ?? '';
  return AUTH_SEGMENTS.has(segment);
}

type PreferencesValue = {
  theme: AppTheme;
  language: AppLanguage;
  colors: ThemeColors;
  isDark: boolean;
  /** Capped system font scale — updates live when display size changes. */
  fontScale: number;
  setTheme: (theme: AppTheme) => void;
  cycleTheme: () => void;
  setLanguage: (lng: AppLanguage) => void;
  hydrated: boolean;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

function readFontScale() {
  return Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const onAuthRoute = isAuthPath(pathname);
  const windowDims = useWindowDimensions();
  const [fontScale, setFontScale] = useState(readFontScale);
  const [theme, setThemeState] = useState<AppTheme>('dark');
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [hydrated, setHydrated] = useState(false);
  const userScopeRef = useRef<string | null>(null);
  const languageRef = useRef<AppLanguage>(language);
  /** Prevents hydrate from overwriting the language just carried across login/logout. */
  const skipHydrateLanguageRef = useRef(false);
  languageRef.current = language;

  // Live system font scale — Dimensions fires on most devices; AppState covers the rest.
  useEffect(() => {
    setFontScale(Math.min(windowDims.fontScale || 1, MAX_FONT_SCALE));
  }, [windowDims.fontScale]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const next = readFontScale();
        setFontScale((prev) => (prev !== next ? next : prev));
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const scope = user ? `${user.gym_id ?? ''}:${user.id ?? ''}` : 'guest';
    if (scope === userScopeRef.current) return;

    const previousScope = userScopeRef.current;
    userScopeRef.current = scope;

    // Login: keep the language chosen on the auth screen (don't snap back to English).
    if (user && previousScope === 'guest') {
      skipHydrateLanguageRef.current = true;
      void (async () => {
        const code = normalizeLanguage(languageRef.current);
        const key = langStorageKey(user.id, user.gym_id);
        await AsyncStorage.setItem(key, code);
        await persistGuestLanguage(code);
        setLanguageState(code);
        await changeAppLanguage(code);
      })();
      return;
    }

    // Logout: carry the in-app language onto the login/guest screen.
    if (!user && previousScope && previousScope !== 'guest') {
      skipHydrateLanguageRef.current = true;
      void (async () => {
        const code = normalizeLanguage(languageRef.current);
        await persistGuestLanguage(code);
        setLanguageState(code);
        await changeAppLanguage(code);
      })();
    }
  }, [user?.id, user?.gym_id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (cancelled) return;
        if (storedTheme === 'light' || storedTheme === 'dark') setThemeState(storedTheme);

        if (skipHydrateLanguageRef.current) {
          skipHydrateLanguageRef.current = false;
          return;
        }

        let code: AppLanguage;
        if (onAuthRoute || !user) {
          code = await readGuestLanguage();
        } else {
          code = await ensureUserLanguageFromGuest(user.id, user.gym_id);
        }
        if (cancelled) return;
        setLanguageState(code);
        await changeAppLanguage(code);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // onAuthRoute is read for source selection but omitted from deps so leaving
    // login after sign-in does not re-hydrate and fight the carried language.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [user?.id, user?.gym_id]);

  const setTheme = useCallback(async (next: AppTheme) => {
    setThemeState(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  const cycleTheme = useCallback(() => {
    void setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const setLanguage = useCallback(
    async (lng: AppLanguage) => {
      const code = normalizeLanguage(lng);
      setLanguageState(code);
      await changeAppLanguage(code);
      const key = langStorageKey(user?.id, user?.gym_id);
      await AsyncStorage.setItem(key, code);
      // Mirror to guest storage so login/register keep the preference after logout.
      await persistGuestLanguage(code);
    },
    [user?.id, user?.gym_id]
  );

  const colors = colorsForTheme(theme);

  const value = useMemo(
    () => ({
      theme,
      language,
      colors,
      isDark: theme === 'dark',
      fontScale,
      setTheme,
      cycleTheme,
      setLanguage,
      hydrated,
    }),
    [theme, language, colors, fontScale, setTheme, cycleTheme, setLanguage, hydrated]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}

/** Shorthand for themed colors in screens. Auth routes always use dark (like web). */
export function useTheme() {
  const authForced = useAuthThemeForced();
  const pathname = usePathname();
  const onAuthRoute = isAuthPath(pathname);
  const { colors, theme, isDark, fontScale, cycleTheme, setTheme } = usePreferences();
  if (authForced || onAuthRoute) {
    return {
      colors: colorsForTheme('dark'),
      theme: 'dark' as AppTheme,
      isDark: true,
      fontScale,
      cycleTheme,
      setTheme,
    };
  }
  return { colors, theme, isDark, fontScale, cycleTheme, setTheme };
}
