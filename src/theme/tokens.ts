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
};

export const darkTheme: ThemeColors = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  muted: '#94a3b8',
  dim: '#64748b',
  accent: '#4f46e5',
  accentSoft: 'rgba(99,102,241,0.2)',
  accentText: '#c7d2fe',
  error: '#fda4af',
  errorBg: 'rgba(244,63,94,0.15)',
  headerBg: '#1e293b',
  tabBarBg: '#1e293b',
  tabBarBorder: '#334155',
  inputBg: '#0f172a',
  inputBorder: '#475569',
  success: '#34d399',
  warning: '#fbbf24',
};

export const lightTheme: ThemeColors = {
  bg: '#f1f5f9',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  dim: '#94a3b8',
  accent: '#4f46e5',
  accentSoft: 'rgba(79,70,229,0.1)',
  accentText: '#4338ca',
  error: '#e11d48',
  errorBg: 'rgba(225,29,72,0.08)',
  headerBg: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',
  inputBg: '#f8fafc',
  inputBorder: '#cbd5e1',
  success: '#059669',
  warning: '#d97706',
};

export function colorsForTheme(theme: AppTheme): ThemeColors {
  return theme === 'dark' ? darkTheme : lightTheme;
}
