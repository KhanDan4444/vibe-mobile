import type { TextStyle } from 'react-native';
import type { AppLanguage } from '@/src/i18n';

/** Loaded via useAppFonts — Latin UI face (matches web `DM Sans`). */
export const DM_SANS = 'DMSans_400Regular';
export const DM_SANS_SEMI = 'DMSans_600SemiBold';

/** Loaded via useAppFonts — Latin display face (matches web `Space Grotesk` / `.font-display`). */
export const SPACE_GROTESK = 'SpaceGrotesk_400Regular';
export const SPACE_GROTESK_SEMI = 'SpaceGrotesk_600SemiBold';
export const SPACE_GROTESK_BOLD = 'SpaceGrotesk_700Bold';

/** Loaded via useAppFonts — Ethiopic coverage (matches web `Noto Sans Ethiopic`). */
export const NOTO_ETHIOPIC = 'NotoSansEthiopic_400Regular';

/** Line height that keeps Amharic vowel marks from clipping. */
export function lineHeightFor(fontSize: number) {
  return Math.ceil(fontSize * 1.55);
}

/** Denser Latin list-row copy; Amharic keeps the taller mark-safe height (web `.list-row-copy`). */
export function listRowLineHeight(language: AppLanguage, fontSize: number) {
  return language === 'am' ? lineHeightFor(fontSize) : Math.ceil(fontSize * 1.4);
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

function spaceGroteskForWeight(fontWeight: TextStyle['fontWeight']): string {
  switch (fontWeight) {
    case '100':
    case '200':
    case '300':
      return 'SpaceGrotesk_300Light';
    case '500':
      return 'SpaceGrotesk_500Medium';
    case '600':
      return SPACE_GROTESK_SEMI;
    case '700':
    case 'bold':
    case '800':
    case '900':
      return SPACE_GROTESK_BOLD;
    default:
      return SPACE_GROTESK;
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

function withAmUppercaseFix(style: TextStyle, out: TextStyle): TextStyle {
  // Mirror web: `html[lang=am] .uppercase { text-transform: none; letter-spacing: normal }`
  if (style.textTransform === 'uppercase') {
    out.textTransform = 'none';
    out.letterSpacing = 0;
  }
  return out;
}

/** Body / UI text — DM Sans (EN) or Noto Ethiopic (AM). */
export function appTextStyle(language: AppLanguage, style: TextStyle = {}): TextStyle {
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 14;
  const base: TextStyle = {
    ...style,
    lineHeight: style.lineHeight ?? lineHeightFor(fontSize),
  };
  if (language === 'am') {
    return withAmUppercaseFix(style, { ...base, fontFamily: notoEthiopicForWeight(style.fontWeight) });
  }
  if (style.fontFamily) return base;
  return { ...base, fontFamily: dmSansForWeight(style.fontWeight) };
}

/**
 * Display / title / metric text — Space Grotesk (EN) or Noto Ethiopic (AM).
 * Mirrors web `pageTitle` / `sectionTitle` / `panelTitle` / `modalTitle` / `.font-display`.
 */
export function displayTextStyle(language: AppLanguage, style: TextStyle = {}): TextStyle {
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 16;
  const base: TextStyle = {
    ...style,
    lineHeight: style.lineHeight ?? lineHeightFor(fontSize),
  };
  if (language === 'am') {
    return withAmUppercaseFix(style, { ...base, fontFamily: notoEthiopicForWeight(style.fontWeight) });
  }
  if (style.fontFamily) return base;
  return { ...base, fontFamily: spaceGroteskForWeight(style.fontWeight) };
}

/** Dense list primary labels (member names, row titles). */
export function listRowTextStyle(language: AppLanguage, style: TextStyle = {}): TextStyle {
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 15;
  return appTextStyle(language, {
    ...style,
    lineHeight: style.lineHeight ?? listRowLineHeight(language, fontSize),
  });
}

/** Scale tokens aligned with web `surfaceClasses` typography. */
export const typeTokens = {
  pageTitle: { fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.4 },
  sectionTitle: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  panelTitle: { fontSize: 15, fontWeight: '600' as const, letterSpacing: -0.15 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.25 },
  metricLg: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  metricMd: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
};
