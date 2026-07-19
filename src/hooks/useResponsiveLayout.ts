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
  /** Reports has 5 cards — prefer 3+2 over a lonely stretched fifth. */
  const reportStatWidthPercent = isTablet ? '31.5%' : '47%';

  const formMaxWidth = isTablet ? 440 : width;
  const tabIconSize = isTablet ? 26 : 24;
  /** FABs sit inside TabScreenFrame — inset from the framed content edge, not the screen. */
  const fabRight = isTablet ? pagePadding : 20;
  const chartHeight = isTablet ? 168 : 132;

  /**
   * FlatList 2-col item: keeps a lone last card at half width instead of stretching full row.
   * Pair with `columnWrapperStyle={{ gap: 10 }}`.
   */
  const listColumnItemStyle = listColumns > 1
    ? ({ flexGrow: 1, flexBasis: 0, maxWidth: '48.5%', marginBottom: 0 } as const)
    : ({ flex: 1, marginBottom: 0 } as const);

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
    reportStatWidthPercent,
    formMaxWidth,
    tabIconSize,
    fabRight,
    chartHeight,
    listColumnItemStyle,
  };
}
