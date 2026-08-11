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
import { appTextStyle, displayTextStyle, listRowTextStyle } from '@/src/theme/typography';

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
};

/**
 * Text that always uses the same faces as web:
 * - English body → DM Sans
 * - English display → Space Grotesk
 * - Amharic → Noto Sans Ethiopic (+ taller line height so glyphs are not clipped)
 */
export function AppText({ style, latin, display, listRow, ...props }: TextProps & LatinOpt) {
  const { language } = usePreferences();
  const lang = latin ? 'en' : language;
  const flat = flattenStyle(style);
  const resolved = display
    ? displayTextStyle(lang, flat)
    : listRow
      ? listRowTextStyle(lang, flat)
      : appTextStyle(lang, flat);
  return <Text {...props} style={resolved} />;
}

/**
 * TextInput with the same language-safe font stack as {@link AppText}.
 */
export const AppTextInput = forwardRef<TextInput, TextInputProps & LatinOpt>(function AppTextInput(
  { style, latin, display, listRow, ...props },
  ref,
) {
  const { language } = usePreferences();
  const lang = latin ? 'en' : language;
  const flat = flattenStyle(style);
  const resolved = display
    ? displayTextStyle(lang, flat)
    : listRow
      ? listRowTextStyle(lang, flat)
      : appTextStyle(lang, flat);
  return <TextInput ref={ref} {...props} style={resolved} />;
});
