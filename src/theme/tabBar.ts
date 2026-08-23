import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

/** Matches tab bar content height in `(tabs)/_layout` (excludes home-indicator padding). */
export const TAB_BAR_BODY_PHONE = 58;
export const TAB_BAR_BODY_TABLET = 64;

/**
 * Extra bottom inset when the tab bar is `position: 'absolute'` so lists/FABs clear the frosted bar.
 */
export function useTabBarOverlayInset() {
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsiveLayout();
  const body = isTablet ? TAB_BAR_BODY_TABLET : TAB_BAR_BODY_PHONE;
  const pad = Math.max(insets.bottom, isTablet ? 10 : 8);
  return body + pad;
}
