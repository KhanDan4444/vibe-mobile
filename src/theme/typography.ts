import type { TextStyle } from 'react-native';
import type { AppLanguage } from '@/src/i18n';

/** Loaded via useAppFonts — Latin UI face (matches web `DM Sans`). */
export const DM_SANS = 'DMSans_400Regular';
export const DM_SANS_SEMI = 'DMSans_600SemiBold';

/** Loaded via useAppFonts — Ethiopic coverage (matches web `Noto Sans Ethiopic`). */
export const NOTO_ETHIOPIC = 'NotoSansEthiopic_400Regular';

/** Line height that keeps Amharic vowel marks from clipping. */
export function lineHeightFor(fontSize: number) {
  return Math.ceil(fontSize * 1.55);
}

function dmSansForWeight(fontWeight: TextStyle['fontWeight']): string {
  switch (fontWeight) {
    case '100':
    case '200':
    case '300':
      return 'DMSans_300Light';
    case '500':
      return 'DMSans_500Medium';
    case '600':
      return 'DMSans_600SemiBold';
    case '700':
    case 'bold':
      return 'DMSans_700Bold';
    case '800':
    case '900':
      return 'DMSans_800ExtraBold';
    default:
      return DM_SANS;
  }
}

/** Amharic gets a 3-step scale: regular, semibold, bold — light weights hurt Ethiopic legibility. */
function notoEthiopicForWeight(fontWeight: TextStyle['fontWeight']): string {
  switch (fontWeight) {
    case '500':
    case '600':
      return 'NotoSansEthiopic_600SemiBold';
    case '700':
    case '800':
    case '900':
    case 'bold':
      return 'NotoSansEthiopic_700Bold';
    default:
      return NOTO_ETHIOPIC;
  }
}

/** Apply language-safe text styles (font + line height), matching web `html` / `html[lang=am]`. */
export function appTextStyle(language: AppLanguage, style: TextStyle = {}): TextStyle {
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 14;
  const base: TextStyle = {
    ...style,
    lineHeight: style.lineHeight ?? lineHeightFor(fontSize),
  };
  if (language === 'am') {
    const am: TextStyle = { ...base, fontFamily: notoEthiopicForWeight(style.fontWeight) };
    // Mirror web: `html[lang=am] .uppercase { text-transform: none; letter-spacing: normal }`
    if (style.textTransform === 'uppercase') {
      am.textTransform = 'none';
      am.letterSpacing = 0;
    }
    return am;
  }
  if (style.fontFamily) return base;
  return { ...base, fontFamily: dmSansForWeight(style.fontWeight) };
}
