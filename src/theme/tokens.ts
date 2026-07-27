export type AppTheme = 'light' | 'dark';

/** Shared corner radii — match web design system. */
export const radiusSm = 8;
export const radiusMd = 12;
export const radiusLg = 16;

export type ThemeColors = {
  bg: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  dim: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  /** Brand signature — empty states / highlights, not primary CTAs. */
  warm: string;
  warmSoft: string;
  warmText: string;
  error: string;
  errorBg: string;
  headerBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  inputBg: string;
  inputBorder: string;
  success: string;
  warning: string;
  statusActive: string;
  statusDueSoon: string;
  statusExpired: string;
  statusUnpaid: string;
  statusNeutral: string;
};

export const darkTheme: ThemeColors = {
  bg: '#13161c',
  card: '#22262f',
  border: '#2a2f3a',
  text: '#e4e7ee',
  muted: '#8b93a3',
  dim: '#64748b',
  accent: '#0f766e',
  accentSoft: 'rgba(45,212,191,0.16)',
  accentText: '#2dd4bf',
  warm: '#fbbf24',
  warmSoft: 'rgba(251,191,36,0.14)',
  warmText: '#fcd34d',
  error: '#fda4af',
  errorBg: 'rgba(244,63,94,0.15)',
  headerBg: '#1a1e26',
  tabBarBg: '#171a21',
  tabBarBorder: '#2a2f3a',
  inputBg: '#1e222b',
  inputBorder: '#343a46',
  success: '#34d399',
  warning: '#fbbf24',
  statusActive: '#34d399',
  statusDueSoon: '#38bdf8',
  statusExpired: '#f87171',
  statusUnpaid: '#fb923c',
  statusNeutral: '#94a3b8',
};

export const lightTheme: ThemeColors = {
  bg: '#f1f5f9',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  dim: '#94a3b8',
  accent: '#0f766e',
  accentSoft: 'rgba(15,118,110,0.12)',
  accentText: '#115e59',
  warm: '#b45309',
  warmSoft: 'rgba(180,83,9,0.12)',
  warmText: '#92400e',
  error: '#e11d48',
  errorBg: 'rgba(225,29,72,0.08)',
  headerBg: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',
  inputBg: '#f8fafc',
  inputBorder: '#cbd5e1',
  success: '#059669',
  warning: '#d97706',
  statusActive: '#059669',
  statusDueSoon: '#0284c7',
  statusExpired: '#e11d48',
  statusUnpaid: '#ea580c',
  statusNeutral: '#64748b',
};

export function colorsForTheme(theme: AppTheme): ThemeColors {
  return theme === 'dark' ? darkTheme : lightTheme;
}
