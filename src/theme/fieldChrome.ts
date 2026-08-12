import { type TextStyle, type ViewStyle } from 'react-native';
import { radiusMd } from '@/src/theme/tokens';

/** Shared field chrome — keep Field / Date / Picker / Money / Search in sync. */
export const FIELD_MIN_HEIGHT = 48;
export const FIELD_RADIUS = radiusMd;
export const FIELD_BORDER = 1;
export const FIELD_BORDER_ACTIVE = 2;

export function fieldRingStyle(
  colors: { inputBorder: string; accentText: string; error: string },
  opts: { focused?: boolean; open?: boolean; error?: boolean; disabled?: boolean } = {},
): ViewStyle {
  if (opts.error) {
    return { borderColor: colors.error, borderWidth: FIELD_BORDER_ACTIVE };
  }
  if (opts.disabled) {
    return { borderColor: colors.inputBorder, borderWidth: FIELD_BORDER };
  }
  if (opts.focused || opts.open) {
    return { borderColor: colors.accentText, borderWidth: FIELD_BORDER_ACTIVE };
  }
  return { borderColor: colors.inputBorder, borderWidth: FIELD_BORDER };
}

export const fieldChrome = {
  label: { fontSize: 14, fontWeight: '600' as const, marginBottom: 7, marginTop: 14 } satisfies TextStyle,
  inputShell: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: FIELD_BORDER,
    borderRadius: FIELD_RADIUS,
    minHeight: FIELD_MIN_HEIGHT,
    paddingHorizontal: 14,
    // Flat chrome only — no SoftSurface / Material halo around form fields.
    elevation: 0,
    shadowOpacity: 0,
  } satisfies ViewStyle,
  inputText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: 0,
    minHeight: FIELD_MIN_HEIGHT - 2,
    textAlignVertical: 'center' as const,
    backgroundColor: 'transparent',
  } satisfies TextStyle,
  /** Pressable field face (date / option pickers). */
  input: {
    borderWidth: FIELD_BORDER,
    borderRadius: FIELD_RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: FIELD_MIN_HEIGHT,
    elevation: 0,
    shadowOpacity: 0,
  } satisfies ViewStyle,
  affixHit: {
    paddingLeft: 10,
    minHeight: 44,
    justifyContent: 'center' as const,
  } satisfies ViewStyle,
  affixText: {
    fontSize: 13,
    fontWeight: '600' as const,
    paddingLeft: 8,
  } satisfies TextStyle,
};
