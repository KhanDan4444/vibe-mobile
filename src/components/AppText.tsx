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
import { appTextStyle } from '@/src/theme/typography';

function flattenStyle(style: TextProps['style']): TextStyle {
  const flat = StyleSheet.flatten(style);
  return flat && typeof flat === 'object' ? (flat as TextStyle) : {};
}

type LatinOpt = {
  /** Force DM Sans — for English brand lines, emails, passwords, etc. */
  latin?: boolean;
};

/**
 * Text that always uses the same faces as web:
 * - English → DM Sans
 * - Amharic → Noto Sans Ethiopic (+ taller line height so glyphs are not clipped)
 */
export function AppText({ style, latin, ...props }: TextProps & LatinOpt) {
  const { language } = usePreferences();
  return <Text {...props} style={appTextStyle(latin ? 'en' : language, flattenStyle(style))} />;
}

/**
 * TextInput with the same language-safe font stack as {@link AppText}.
 */
export const AppTextInput = forwardRef<TextInput, TextInputProps & LatinOpt>(function AppTextInput(
  { style, latin, ...props },
  ref,
) {
  const { language } = usePreferences();
  return (
    <TextInput ref={ref} {...props} style={appTextStyle(latin ? 'en' : language, flattenStyle(style))} />
  );
});
