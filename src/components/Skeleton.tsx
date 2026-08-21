import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

type BoneProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Pulsing block — building unit for page skeletons. */
export function SkeletonBone({ width = '100%', height = 14, radius = 8, style }: BoneProps) {
  const { isDark } = useTheme();
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.35)',
        },
        anim,
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

function ListRowSkeleton({ card }: { card?: boolean }) {
  const body = (
    <>
      <SkeletonBone width={44} height={44} radius={22} />
      <View style={styles.rowBody}>
        <SkeletonBone width="58%" height={14} />
        <SkeletonBone width="40%" height={12} style={{ marginTop: 8 }} />
        <SkeletonBone width="28%" height={10} style={{ marginTop: 8 }} />
      </View>
    </>
  );

  if (card) {
    return <SoftSurface style={styles.rowCard}>{body}</SoftSurface>;
  }

  return <View style={styles.row}>{body}</View>;
}

function ListCardSkeleton() {
  return (
    <SoftSurface variant="panel" style={styles.card}>
      <SkeletonBone width="55%" height={15} />
      <SkeletonBone width="35%" height={12} style={{ marginTop: 10 }} />
      <SkeletonBone width="70%" height={12} style={{ marginTop: 10 }} />
    </SoftSurface>
  );
}

function StatSkeleton() {
  const { statCardLayoutStyle } = useResponsiveLayout();
  return (
    <View style={statCardLayoutStyle}>
      <SoftSurface style={styles.stat}>
        <SkeletonBone width={36} height={22} />
        <SkeletonBone width="70%" height={11} style={{ marginTop: 10 }} />
      </SoftSurface>
    </View>
  );
}

type Variant = 'list-rows' | 'list-cards' | 'dashboard' | 'form' | 'detail' | 'reports';

type PageSkeletonProps = {
  variant?: Variant;
  count?: number;
  /** Horizontal padding — defaults to responsive page padding. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Full-page / section skeleton for initial data loads (replaces spinners). */
export function PageSkeleton({ variant = 'list-rows', count, padded = true, style }: PageSkeletonProps) {
  const { t } = useTranslation();
  const { pagePadding } = useResponsiveLayout();
  const n = count ?? defaultCount(variant);

  let body: ReactNode;
  switch (variant) {
    case 'dashboard':
      body = (
        <>
          <View style={styles.statGrid}>
            {Array.from({ length: 4 }, (_, i) => (
              <StatSkeleton key={i} />
            ))}
          </View>
          <SoftSurface variant="panel" style={styles.summary}>
            <SkeletonBone width="40%" height={13} />
            <SkeletonBone width="55%" height={28} style={{ marginTop: 14 }} />
            <SkeletonBone width="30%" height={12} style={{ marginTop: 12 }} />
          </SoftSurface>
        </>
      );
      break;
    case 'reports':
      body = (
        <View style={styles.statGrid}>
          {Array.from({ length: 5 }, (_, i) => (
            <StatSkeleton key={i} />
          ))}
        </View>
      );
      break;
    case 'form':
      body = (
        <View style={styles.form}>
          {Array.from({ length: n }, (_, i) => (
            <View key={i} style={styles.formField}>
              <SkeletonBone width="32%" height={11} />
              <SkeletonBone width="100%" height={44} radius={10} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
      );
      break;
    case 'detail':
      body = (
        <View style={styles.detail}>
          <View style={styles.detailHeader}>
            <SkeletonBone width={72} height={72} radius={20} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <SkeletonBone width="70%" height={18} />
              <SkeletonBone width="45%" height={13} style={{ marginTop: 10 }} />
            </View>
          </View>
          {Array.from({ length: 3 }, (_, i) => (
            <SoftSurface key={i} variant="panel" style={[styles.card, { marginTop: 12 }]}>
              <SkeletonBone width="40%" height={12} />
              <SkeletonBone width="85%" height={14} style={{ marginTop: 12 }} />
              <SkeletonBone width="60%" height={14} style={{ marginTop: 10 }} />
            </SoftSurface>
          ))}
        </View>
      );
      break;
    case 'list-cards':
      body = Array.from({ length: n }, (_, i) => <ListCardSkeleton key={i} />);
      break;
    case 'list-rows':
    default:
      body = Array.from({ length: n }, (_, i) => <ListRowSkeleton key={i} card />);
      break;
  }

  return (
    <View
      style={[padded ? { paddingHorizontal: pagePadding, paddingTop: 8 } : null, style]}
      accessibilityLabel={t('common.loading')}
      accessibilityRole="progressbar"
    >
      {body}
    </View>
  );
}

/** Compact footer skeleton while fetching the next page. */
export function ListFooterSkeleton() {
  return (
    <View style={styles.footer}>
      <SkeletonBone width="40%" height={12} style={{ alignSelf: 'center' }} />
    </View>
  );
}

/** Check-in search results — ring + identity + CTA bones. */
export function CheckInSearchSkeleton({
  count = 2,
  columns = 1,
}: {
  count?: number;
  columns?: number;
}) {
  const multi = columns > 1;
  return (
    <View
      style={multi ? styles.checkInGrid : undefined}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: count }, (_, i) => (
        <SoftSurface
          key={i}
          variant="panel"
          style={[styles.checkInCard, multi ? styles.checkInCardHalf : null]}
        >
          <View style={styles.checkInTop}>
            <SkeletonBone width={84} height={84} radius={42} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBone width="70%" height={15} />
              <SkeletonBone width="45%" height={12} />
              <SkeletonBone width="32%" height={18} radius={999} />
            </View>
          </View>
          <SkeletonBone width="100%" height={44} radius={12} style={{ marginTop: 12 }} />
        </SoftSurface>
      ))}
    </View>
  );
}

function defaultCount(variant: Variant) {
  switch (variant) {
    case 'form':
      return 5;
    case 'list-cards':
      return 5;
    case 'list-rows':
      return 6;
    default:
      return 4;
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  rowBody: { flex: 1 },
  card: {
    padding: 14,
    marginBottom: 10,
  },
  checkInCard: {
    padding: 14,
    marginBottom: 10,
  },
  checkInGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  checkInCardHalf: {
    flexGrow: 1,
    flexBasis: 0,
    maxWidth: '48.5%',
    marginBottom: 0,
  },
  checkInTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  stat: {
    flex: 1,
    padding: 14,
    minHeight: 72,
    justifyContent: 'center',
  },
  summary: {
    padding: 16,
  },
  form: { gap: 18, paddingTop: 8 },
  formField: {},
  detail: { paddingTop: 8 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  footer: { paddingVertical: 18, alignItems: 'center' },
});
