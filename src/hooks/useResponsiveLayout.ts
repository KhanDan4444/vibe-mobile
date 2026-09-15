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
  const isLandscape = width > height;

  // Landscape tablets: use most of the width so content isn't a phone column.
  // Portrait keeps a readable centered column.
  const contentMaxWidth = !isTablet
    ? width
    : isLandscape
      ? Math.min(Math.round(width * 0.92), 1200)
      : isLargeTablet
        ? 980
        : 760;
  const pagePadding = isTablet ? 24 : 16;
  const listColumns = isTablet ? 2 : 1;
  const statColumns = isTablet ? 4 : 2;

  /**
   * Stat cards in a wrapping row with `gap`. Use flex grow (not fixed %) so the
   * last column lines up with full-width cards above/below.
   */
  const statCardLayoutStyle =
    statColumns === 4
      ? ({ flex: 1, flexBasis: 0, minWidth: 0 } as const)
      : ({ flexGrow: 1, flexBasis: '40%', minWidth: '40%' } as const);
  /** @deprecated Prefer statCardLayoutStyle — kept for older call sites. */
  const statCardWidthPercent = statColumns === 4 ? '23.5%' : '47%';
  /** Reports has 5 cards — prefer 3+2 over a lonely stretched fifth. */
  const reportStatLayoutStyle = isTablet
    ? ({ flexGrow: 1, flexBasis: '30%', minWidth: '30%', maxWidth: '32.5%' } as const)
    : ({ flexGrow: 1, flexBasis: '40%', minWidth: '40%', maxWidth: '48.5%' } as const);
  const reportStatWidthPercent = isTablet ? '31.5%' : '47%';

  const formMaxWidth = isTablet ? 440 : width;
  /** Bottom sheets / pickers — wider than forms so Sort & Notifications aren't a phone card on tablet. */
  const sheetMaxWidth = !isTablet
    ? width
    : isLandscape
      ? Math.min(Math.round(width * 0.62), 640)
      : Math.min(Math.round(width * 0.94), contentMaxWidth);
  const tabIconSize = isTablet ? 28 : 22;
  /** FABs sit inside TabScreenFrame — inset from the framed content edge, not the screen. */
  const fabRight = isTablet ? pagePadding : 20;
  /** Primary add FAB — near Material default on phone; larger on tablet canvas. */
  const fabSize = isTablet ? 68 : 54;
  const fabRadius = isTablet ? 20 : 16;
  const fabFontSize = isTablet ? 36 : 29;
  /** Taller on portrait tablet; shorter in landscape (esp. when paired beside Needs attention). */
  const chartHeight = isTablet ? (isLandscape ? 140 : 220) : 132;

  /**
   * FlatList 2-col item: keeps a lone last card at half width instead of stretching full row.
   * Pair with `columnWrapperStyle={{ gap: 10 }}`.
   */
  const listColumnItemStyle = listColumns > 1
    ? ({ flexGrow: 1, flexBasis: 0, maxWidth: '48.5%', marginBottom: 10 } as const)
    : ({ flex: 1, marginBottom: 0 } as const);

  return {
    width,
    height,
    isPhone,
    isTablet,
    isLargeTablet,
    isLandscape,
    contentMaxWidth,
    pagePadding,
    listColumns,
    statColumns,
    statCardLayoutStyle,
    statCardWidthPercent,
    reportStatLayoutStyle,
    reportStatWidthPercent,
    formMaxWidth,
    sheetMaxWidth,
    tabIconSize,
    fabRight,
    fabSize,
    fabRadius,
    fabFontSize,
    chartHeight,
    listColumnItemStyle,
  };
}
