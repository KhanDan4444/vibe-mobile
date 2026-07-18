export type AppTheme = 'light' | 'dark';

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
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  muted: '#94a3b8',
  dim: '#64748b',
  accent: '#2dd4bf',
  accentSoft: 'rgba(45,212,191,0.18)',
  accentText: '#99f6e4',
  error: '#fda4af',
  errorBg: 'rgba(244,63,94,0.15)',
  headerBg: '#1e293b',
  tabBarBg: '#1e293b',
  tabBarBorder: '#334155',
  inputBg: '#0f172a',
  inputBorder: '#475569',
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
