import type { TextStyle } from 'react-native';
import type { AppLanguage } from '@/src/i18n';

/** Loaded via useAppFonts — full Ethiopic glyph coverage on Android. */
export const NOTO_ETHIOPIC = 'NotoSansEthiopic_400Regular';

/** Line height that keeps Amharic vowel marks from clipping. */
export function lineHeightFor(fontSize: number) {
  return Math.ceil(fontSize * 1.55);
}

/** Apply Amharic-safe text styles (font + line height). */
export function appTextStyle(language: AppLanguage, style: TextStyle = {}): TextStyle {
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 14;
  const base: TextStyle = {
    ...style,
    lineHeight: style.lineHeight ?? lineHeightFor(fontSize),
  };
  if (language === 'am') {
    return { ...base, fontFamily: NOTO_ETHIOPIC };
  }
  return base;
}
