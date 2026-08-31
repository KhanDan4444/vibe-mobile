import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { usePreferences } from '@/src/context/PreferencesContext';
import { appTextStyle, displayTextStyle, listRowTextStyle, MAX_FONT_SCALE } from '@/src/theme/typography';

function flattenStyle(style: TextProps['style']): TextStyle {
  const flat = StyleSheet.flatten(style);
  return flat && typeof flat === 'object' ? (flat as TextStyle) : {};
}

type LatinOpt = {
  /** Force DM Sans / Space Grotesk — for English brand lines, emails, passwords, etc. */
  latin?: boolean;
  /** Use Space Grotesk (EN) for titles / metrics — mirrors web `.font-display`. */
  display?: boolean;
  /** Dense list primary copy (member names, row titles). */
  listRow?: boolean;
  /**
   * Lock size/line-height against phone font settings (tab bar, badges, chrome).
   * Still applies the language font stack.
   */
  fixedLayout?: boolean;
};

/**
 * Text that always uses the same faces as web:
 * - English body → DM Sans
 * - English display → Space Grotesk
 * - Amharic → Noto Sans Ethiopic (+ taller line height so glyphs are not clipped)
 */
export function AppText({ style, latin, display, listRow, fixedLayout, maxFontSizeMultiplier, allowFontScaling, ...props }: TextProps & LatinOpt & { maxFontSizeMultiplier?: number }) {
  const { language, fontScale } = usePreferences();
  const lang = latin ? 'en' : language;
  const flat = flattenStyle(style);
  const lock = Boolean(fixedLayout);
  const resolved = display
    ? displayTextStyle(lang, flat)
    : listRow
      ? listRowTextStyle(lang, flat)
      : appTextStyle(lang, flat, lock ? { scaleLineHeight: false } : undefined);
  return (
    <Text
      {...props}
      key={lock ? 'fs-lock' : `fs-${fontScale}`}
      allowFontScaling={lock ? false : allowFontScaling}
      maxFontSizeMultiplier={lock ? 1 : (maxFontSizeMultiplier ?? MAX_FONT_SCALE)}
      style={resolved}
    />
  );
}

/**
 * TextInput with the same language-safe font stack as {@link AppText}.
 */
export const AppTextInput = forwardRef<TextInput, TextInputProps & LatinOpt & { maxFontSizeMultiplier?: number }>(function AppTextInput(
  { style, latin, display, listRow, maxFontSizeMultiplier, ...props },
  ref,
) {
  const { language, fontScale } = usePreferences();
  const lang = latin ? 'en' : language;
  const flat = flattenStyle(style);
  const resolved = display
    ? displayTextStyle(lang, flat)
    : listRow
      ? listRowTextStyle(lang, flat)
      : appTextStyle(lang, flat);
  return (
    <TextInput
      ref={ref}
      key={`fs-${fontScale}`}
      underlineColorAndroid="transparent"
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_SCALE}
      {...props}
      // Transparent so Android's default white fill doesn't paint a "mid" box inside field shells.
      style={[{ backgroundColor: 'transparent' }, resolved]}
    />
  );
});
