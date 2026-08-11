import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { radiusMd } from '@/src/theme/tokens';

/** Shared field chrome — keep Field / Date / Picker / Money in sync. */
export const FIELD_MIN_HEIGHT = 48;
export const FIELD_RADIUS = radiusMd;

export const fieldChrome = {
  label: { fontSize: 14, fontWeight: '600' as const, marginBottom: 7, marginTop: 14 } satisfies TextStyle,
  inputShell: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: FIELD_RADIUS,
    minHeight: FIELD_MIN_HEIGHT,
    paddingHorizontal: 14,
  } satisfies ViewStyle,
  inputText: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    minHeight: FIELD_MIN_HEIGHT - 2,
  } satisfies TextStyle,
  /** Pressable field face (date / option pickers). */
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: FIELD_RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: FIELD_MIN_HEIGHT,
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
