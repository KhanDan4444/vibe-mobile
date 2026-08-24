export type AppTheme = 'light' | 'dark';

/** Shared corner radii — match web design system. */
export const radiusSm = 8;
export const radiusMd = 12;
export const radiusLg = 16;
/** Sheets / floating panels — softer, more modern pop. */
export const radiusXl = 22;

/** Comfortable rhythm scale (use instead of one-off 8/10/12/14). */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type ThemeColors = {
  bg: string;
  card: string;
  border: string;
  /** Slightly stronger edge for white cards sitting on page bg. */
  cardEdge: string;
  text: string;
  muted: string;
  dim: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  /** Brighter teal fill for small primary CTAs (renew chips, etc.). */
  accentCta: string;
  /** Focus ring on inputs — light theme stays softer than accentText. */
  fieldFocus: string;
  /** Brand signature — empty states / highlights, not primary CTAs. */
  warm: string;
  warmSoft: string;
  warmText: string;
  error: string;
  /** Solid fill for destructive primary buttons (delete confirms). */
  errorSolid: string;
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
  /** Former / archived — warm stone, distinct from All. */
  statusFormer: string;
};

export const darkTheme: ThemeColors = {
  bg: '#12151a',
  card: '#1e222a',
  border: '#2c323c',
  cardEdge: '#323844',
  text: '#e8eaf0',
  muted: '#9199a8',
  dim: '#6b7385',
  accent: '#0f766e',
  accentSoft: 'rgba(45,212,191,0.16)',
  accentText: '#2dd4bf',
  accentCta: '#14b8a6',
  fieldFocus: '#2dd4bf',
  warm: '#fbbf24',
  warmSoft: 'rgba(251,191,36,0.14)',
  warmText: '#fcd34d',
  error: '#fda4af',
  errorSolid: '#e11d48',
  errorBg: 'rgba(244,63,94,0.15)',
  headerBg: '#181c24',
  tabBarBg: '#161920',
  tabBarBorder: '#2c323c',
  inputBg: '#1a1e26',
  inputBorder: '#363c48',
  success: '#34d399',
  warning: '#fbbf24',
  statusActive: '#34d399',
  statusDueSoon: '#38bdf8',
  statusExpired: '#f87171',
  statusUnpaid: '#fb923c',
  statusNeutral: '#94a3b8',
  statusFormer: '#a8a29e',
};

/** Soft warm-gray canvas — calm and inviting without cream/terracotta cliché. */
export const lightTheme: ThemeColors = {
  bg: '#f3f4f6',
  card: '#ffffff',
  border: '#e4e7ec',
  cardEdge: '#e8eaef',
  text: '#111827',
  muted: '#6b7280',
  dim: '#9ca3af',
  accent: '#0f766e',
  accentSoft: 'rgba(15,118,110,0.1)',
  accentText: '#0f766e',
  accentCta: '#0d9488',
  fieldFocus: '#14b8a6',
  warm: '#d97706',
  warmSoft: 'rgba(217,119,6,0.12)',
  warmText: '#b45309',
  error: '#e11d48',
  errorSolid: '#e11d48',
  errorBg: 'rgba(225,29,72,0.08)',
  headerBg: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e4e7ec',
  inputBg: '#f7f8fa',
  inputBorder: '#d1d5db',
  success: '#059669',
  warning: '#d97706',
  statusActive: '#059669',
  statusDueSoon: '#0284c7',
  statusExpired: '#e11d48',
  statusUnpaid: '#ea580c',
  statusNeutral: '#64748b',
  statusFormer: '#78716c',
};

export function colorsForTheme(theme: AppTheme): ThemeColors {
  return theme === 'dark' ? darkTheme : lightTheme;
}
