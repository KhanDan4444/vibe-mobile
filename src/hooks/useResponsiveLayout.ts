import { useWindowDimensions } from 'react-native';

/** Smallest width treated as tablet (dp) — covers most 7"+ tablets in portrait. */
const TABLET_MIN_WIDTH = 600;
/** Large tablets / landscape-friendly layouts. */
const LARGE_TABLET_MIN_WIDTH = 900;

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN_WIDTH;
  const isLargeTablet = width >= LARGE_TABLET_MIN_WIDTH;
  const isPhone = !isTablet;

  const contentMaxWidth = isLargeTablet ? 980 : isTablet ? 760 : width;
  const pagePadding = isTablet ? 24 : 16;
  const listColumns = isTablet ? 2 : 1;
  const statColumns = isTablet ? 4 : 2;

  /** Width % for stat cards in a wrapping row (gap handled separately). */
  const statCardWidthPercent = statColumns === 4 ? '23.5%' : '47%';

  const formMaxWidth = isTablet ? 440 : width;
  const tabIconSize = isTablet ? 26 : 24;
  const fabRight = isTablet ? Math.max(pagePadding, (width - contentMaxWidth) / 2 + pagePadding) : 20;

  return {
    width,
    height,
    isPhone,
    isTablet,
    isLargeTablet,
    contentMaxWidth,
    pagePadding,
    listColumns,
    statColumns,
    statCardWidthPercent,
    formMaxWidth,
    tabIconSize,
    fabRight,
  };
}
