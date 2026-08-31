import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

/**
 * Extra bottom inset for tab screens.
 * Tab bar is in-flow again (not absolute overlay), so content already clears it —
 * keep a small constant for FAB / list breathing room only.
 */
export function useTabBarOverlayInset() {
  return 0;
}

/** Tab bar icon + label stack (excludes home-indicator / nav-bar padding). */
export const TAB_BAR_BODY_PHONE = 52;
export const TAB_BAR_BODY_TABLET = 58;

/** Floor when `insets.bottom` is 0 (common on Android 3-button nav). */
const TAB_BAR_MIN_BOTTOM_PHONE = Platform.OS === 'android' ? 12 : 10;
const TAB_BAR_MIN_BOTTOM_TABLET = 12;

/**
 * Bottom padding above the system nav bar / home indicator.
 * Gesture-nav phones report a real inset; 3-button Android often reports 0.
 */
export function tabBarBottomPadding(
  insetsBottom: number,
  isTablet: boolean,
  fontScale: number,
): number {
  const min = isTablet ? TAB_BAR_MIN_BOTTOM_TABLET : TAB_BAR_MIN_BOTTOM_PHONE;
  const base = Math.max(insetsBottom, min);
  // When there is no home-indicator inset, add a little extra at larger display sizes.
  const fontBump =
    insetsBottom < 16 && fontScale > 1 ? Math.round((fontScale - 1) * 4) : 0;
  return base + fontBump;
}

/** Shared tab bar dimensions — keeps `(tabs)/_layout` and toast clearance in sync. */
export function useTabBarMetrics() {
  const insets = useSafeAreaInsets();
  const { fontScale } = usePreferences();
  const { isTablet } = useResponsiveLayout();

  const bodyBase = isTablet ? TAB_BAR_BODY_TABLET : TAB_BAR_BODY_PHONE;
  const bodyHeight = Math.ceil(bodyBase * fontScale);
  const bottomPadding = tabBarBottomPadding(insets.bottom, isTablet, fontScale);

  return {
    bodyHeight,
    bottomPadding,
    totalHeight: bodyHeight + bottomPadding,
  };
}
