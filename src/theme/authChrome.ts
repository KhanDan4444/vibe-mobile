import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { radiusMd } from '@/src/theme/tokens';

/** Premium auth field tokens — soft glass on the dark hero, color-only focus. */
export const AUTH = {
  text: '#f8fafc',
  textMuted: 'rgba(226, 232, 240, 0.78)',
  textDim: 'rgba(226, 232, 240, 0.52)',
  placeholder: 'rgba(226, 232, 240, 0.48)',
  fieldBg: 'rgba(255, 255, 255, 0.055)',
  fieldBorder: 'rgba(255, 255, 255, 0.14)',
  fieldBorderFocus: 'rgba(94, 234, 212, 0.48)',
  fieldBorderError: 'rgba(251, 113, 133, 0.55)',
  selection: 'rgba(94, 234, 212, 0.4)',
  link: '#2dd4bf',
  cta: '#0f766e',
  ctaPressed: '#0d9488',
} as const;

export function authFieldRing(opts: {
  focused?: boolean;
  open?: boolean;
  error?: boolean;
  disabled?: boolean;
}): ViewStyle {
  if (opts.error) {
    return { borderColor: AUTH.fieldBorderError, borderWidth: 1 };
  }
  if (opts.disabled) {
    return { borderColor: AUTH.fieldBorder, borderWidth: 1, opacity: 0.65 };
  }
  if (opts.focused || opts.open) {
    return { borderColor: AUTH.fieldBorderFocus, borderWidth: 1 };
  }
  return { borderColor: AUTH.fieldBorder, borderWidth: 1 };
}

export const authFieldShell = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: AUTH.fieldBg,
  borderRadius: radiusMd,
  minHeight: 50,
  paddingHorizontal: 16,
  borderWidth: 1,
  borderColor: AUTH.fieldBorder,
} satisfies ViewStyle;

export const authFieldText = {
  flex: 1,
  fontSize: 16,
  fontWeight: '400' as const,
  lineHeight: 22,
  paddingVertical: 0,
  minHeight: 48,
  textAlignVertical: 'center' as const,
  color: AUTH.text,
  letterSpacing: 0.1,
} satisfies TextStyle;

export const authTitle = {
  fontSize: 28,
  fontWeight: '600' as const,
  letterSpacing: -0.45,
  textAlign: 'center' as const,
} satisfies TextStyle;

export const authSubtitle = {
  marginTop: 8,
  marginBottom: 28,
  fontSize: 14,
  lineHeight: 21,
  fontWeight: '400' as const,
  textAlign: 'center' as const,
  letterSpacing: 0.1,
} satisfies TextStyle;

export const authHairline = StyleSheet.hairlineWidth;
