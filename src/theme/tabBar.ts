/**
 * Extra bottom inset for tab screens.
 * Tab bar is in-flow again (not absolute overlay), so content already clears it —
 * keep a small constant for FAB / list breathing room only.
 */
export function useTabBarOverlayInset() {
  return 0;
}

/** Matches tab bar content height in `(tabs)/_layout` (excludes home-indicator padding). */
export const TAB_BAR_BODY_PHONE = 52;
export const TAB_BAR_BODY_TABLET = 58;
