import { Platform, type ViewStyle } from 'react-native';
import type { AppTheme } from '@/src/theme/tokens';

type ElevationLevel = 'none' | 'soft' | 'raised' | 'float' | 'sheet';

/** Soft, warm-tinted shadows — comfort without harsh material chrome. */
export function elevationStyle(level: ElevationLevel, theme: AppTheme = 'light'): ViewStyle {
  if (level === 'none') {
    return Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
      default: {},
    }) as ViewStyle;
  }

  const dark = theme === 'dark';
  // Slightly warm black — feels calmer than pure cool slate shadows.
  const shadowColor = dark ? '#000000' : '#1c1917';

  const presets: Record<Exclude<ElevationLevel, 'none'>, { opacity: number; radius: number; y: number; elevation: number }> = {
    soft: { opacity: dark ? 0.28 : 0.07, radius: 10, y: 3, elevation: 2 },
    raised: { opacity: dark ? 0.36 : 0.1, radius: 16, y: 6, elevation: 4 },
    float: { opacity: dark ? 0.42 : 0.14, radius: 22, y: 10, elevation: 8 },
    sheet: { opacity: dark ? 0.5 : 0.18, radius: 28, y: -8, elevation: 16 },
  };

  const p = presets[level];
  return Platform.select({
    ios: {
      shadowColor,
      shadowOpacity: p.opacity,
      shadowRadius: p.radius,
      shadowOffset: { width: 0, height: p.y },
    },
    android: {
      elevation: p.elevation,
      shadowColor,
    },
    default: {},
  }) as ViewStyle;
}

/** Accent FAB shadow — soft float, no harsh Material blob. */
export function fabElevation(theme: AppTheme = 'light'): ViewStyle {
  return elevationStyle('float', theme);
}
