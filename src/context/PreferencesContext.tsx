import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/auth/AuthContext';
import { changeAppLanguage, type AppLanguage } from '@/src/i18n';
import { colorsForTheme, type AppTheme, type ThemeColors } from '@/src/theme/tokens';

const THEME_KEY = 'vibe-mobile-theme';
const LANG_KEY_PREFIX = 'vibe-mobile-lang';

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

function langStorageKey(userId?: number | null, gymId?: number | null) {
  if (gymId) return `${LANG_KEY_PREFIX}:gym:${gymId}`;
  if (userId) return `${LANG_KEY_PREFIX}:user:${userId}`;
  return `${LANG_KEY_PREFIX}:guest`;
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<AppTheme>('dark');
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_KEY);
        const langKey = langStorageKey(user?.id, user?.gym_id);
        const storedLang = await AsyncStorage.getItem(langKey);
        if (cancelled) return;
        if (storedTheme === 'light' || storedTheme === 'dark') setThemeState(storedTheme);
        const lng = storedLang === 'am' ? 'am' : 'en';
        setLanguageState(lng);
        await changeAppLanguage(lng);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
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

/** Shorthand for themed colors in screens. */
export function useTheme() {
  const { colors, theme, isDark, cycleTheme, setTheme } = usePreferences();
  return { colors, theme, isDark, cycleTheme, setTheme };
}
