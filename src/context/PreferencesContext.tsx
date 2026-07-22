import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { useAuthThemeForced } from '@/src/context/AuthThemeContext';
import { changeAppLanguage, type AppLanguage } from '@/src/i18n';
import { colorsForTheme, type AppTheme, type ThemeColors } from '@/src/theme/tokens';
import {
  defaultGuestLanguage,
  langStorageKey,
  persistGuestLanguage,
  readGuestLanguage,
  readStoredLanguage,
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
  setTheme: (theme: AppTheme) => void;
  cycleTheme: () => void;
  setLanguage: (lng: AppLanguage) => void;
  hydrated: boolean;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const onAuthRoute = isAuthPath(pathname);
  const [theme, setThemeState] = useState<AppTheme>('dark');
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [hydrated, setHydrated] = useState(false);
  const userScopeRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_KEY);
        const code = onAuthRoute || !user
          ? await readGuestLanguage()
          : await readStoredLanguage(user.id, user.gym_id);
        if (cancelled) return;
        if (storedTheme === 'light' || storedTheme === 'dark') setThemeState(storedTheme);
        setLanguageState(code);
        await changeAppLanguage(code);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.gym_id, onAuthRoute]);

  useEffect(() => {
    const scope = user ? `${user.gym_id ?? ''}:${user.id ?? ''}` : 'guest';
    if (scope === userScopeRef.current) return;

    const previousScope = userScopeRef.current;
    userScopeRef.current = scope;

    if (!user && previousScope && previousScope !== 'guest') {
      void (async () => {
        const guest = defaultGuestLanguage();
        await persistGuestLanguage(guest);
        setLanguageState(guest);
        await changeAppLanguage(guest);
      })();
    }
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
      const code = lng === 'am' ? 'am' : 'en';
      setLanguageState(code);
      await changeAppLanguage(code);
      const key = langStorageKey(user?.id, user?.gym_id);
      await AsyncStorage.setItem(key, code);
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
      setTheme,
      cycleTheme,
      setLanguage,
      hydrated,
    }),
    [theme, language, colors, setTheme, cycleTheme, setLanguage, hydrated]
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
  const { colors, theme, isDark, cycleTheme, setTheme } = usePreferences();
  if (authForced || onAuthRoute) {
    return {
      colors: colorsForTheme('dark'),
      theme: 'dark' as AppTheme,
      isDark: true,
      cycleTheme,
      setTheme,
    };
  }
  return { colors, theme, isDark, cycleTheme, setTheme };
}
