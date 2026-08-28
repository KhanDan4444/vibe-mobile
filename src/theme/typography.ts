import type { TextStyle } from 'react-native';
import { PixelRatio, Platform } from 'react-native';
import type { AppLanguage } from '@/src/i18n';

/** Cap system font scaling so dense gym UI stays usable (still honors moderate accessibility sizes). */
export const MAX_FONT_SCALE = 1.35;

/** Fixed-size avatar initials — container is pixel-sized; do not scale with system font. */
export const avatarTextProps = { maxFontSizeMultiplier: 1 } as const;

/** Primary list-row titles — wrap/shrink before hard truncation. */
export const listPrimaryTextProps = {
  numberOfLines: 2 as const,
  adjustsFontSizeToFit: true as const,
  minimumFontScale: 0.85 as const,
};

/** Compact badge/chip copy inside fixed pills. */
export const badgeTextProps = { maxFontSizeMultiplier: 1.15 } as const;

export function effectiveFontScale() {
  return Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
}

/** Scale fixed line heights to match system font size (explicit lineHeight does not auto-scale). */
export function scaleLineHeight(lineHeight: number) {
  return Math.ceil(lineHeight * effectiveFontScale());
}

/** Scale fixed min-heights for inputs, tab bars, tiles, etc. */
export function scaleMinHeight(minHeight: number) {
  return Math.ceil(minHeight * effectiveFontScale());
}

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
  return scaleLineHeight(Math.ceil(fontSize * 1.55));
}

/** Denser Latin list-row copy; Amharic keeps the taller mark-safe height (web `.list-row-copy`). */
export function listRowLineHeight(language: AppLanguage, fontSize: number) {
  const base = language === 'am' ? Math.ceil(fontSize * 1.55) : Math.ceil(fontSize * 1.4);
  return scaleLineHeight(base);
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

function resolveLineHeight(style: TextStyle, fontSize: number) {
  if (typeof style.lineHeight === 'number') {
    return scaleLineHeight(style.lineHeight);
  }
  return lineHeightFor(fontSize);
}

function isNamedFontWeight(weight: TextStyle['fontWeight']) {
  return weight != null && weight !== 'normal' && weight !== '400';
}

/**
 * Bold Space Grotesk metrics — matches web `font-display font-bold tabular-nums`.
 * Always Latin/EN so numerals use Grotesk even when UI language is Amharic.
 */
export function metricDisplayStyle(style: TextStyle = {}): TextStyle {
  return displayTextStyle('en', {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    ...style,
  });
}

/** Currency or plain numeric summary values — use bold Grotesk tabular nums. */
export function looksLikeMetricValue(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/\bETB\b/i.test(v)) return true;
  if (/^[+\-]?[\d,.\s]+$/.test(v)) return true;
  if (/^\+[\d,.\s]+/.test(v)) return true;
  return false;
}

/** Body / UI text — DM Sans (EN) or Noto Ethiopic (AM). */
export function appTextStyle(language: AppLanguage, style: TextStyle = {}): TextStyle {
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 14;
  const base: TextStyle = {
    ...style,
    lineHeight: resolveLineHeight(style, fontSize),
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
    lineHeight: resolveLineHeight(style, fontSize),
  };
  if (language === 'am') {
    return withAmUppercaseFix(style, { ...base, fontFamily: notoEthiopicForWeight(style.fontWeight) });
  }
  if (style.fontFamily) return base;
  const fontFamily = spaceGroteskForWeight(style.fontWeight);
  const out: TextStyle = { ...base, fontFamily };
  // Android faux-bolds custom faces when fontWeight + fontFamily disagree — use the file weight only.
  if (isNamedFontWeight(style.fontWeight) && Platform.OS === 'android') {
    out.fontWeight = 'normal';
  }
  return out;
}

/** Dense list primary labels (member names, row titles). */
export function listRowTextStyle(language: AppLanguage, style: TextStyle = {}): TextStyle {
  const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 15;
  return appTextStyle(language, {
    ...style,
    lineHeight:
      typeof style.lineHeight === 'number'
        ? scaleLineHeight(style.lineHeight)
        : listRowLineHeight(language, fontSize),
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
