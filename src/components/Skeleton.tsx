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

/** Desk hero + today rows (matches Check-in screen). */
function CheckInPageSkeleton() {
  return (
    <View style={{ gap: 16 }}>
      <SoftSurface variant="panel" style={styles.checkInHero}>
        <View style={styles.checkInHeroTop}>
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBone width={88} height={12} />
            <SkeletonBone width={96} height={24} radius={999} />
          </View>
          <SkeletonBone width={48} height={40} radius={8} />
        </View>
        <SkeletonBone width="100%" height={44} radius={12} style={{ marginTop: 14 }} />
      </SoftSurface>
      <View style={styles.checkInSectionHead}>
        <SkeletonBone width="46%" height={17} />
        <SkeletonBone width={64} height={14} />
      </View>
      {Array.from({ length: 4 }, (_, i) => (
        <CheckInTodayRowSkeleton key={i} />
      ))}
    </View>
  );
}

export function CheckInTodayRowSkeleton() {
  return (
    <View style={styles.todayRow}>
      <SkeletonBone width={34} height={34} radius={17} />
      <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
        <SkeletonBone width="58%" height={14} />
        <SkeletonBone width="32%" height={10} />
      </View>
      <SkeletonBone width={52} height={13} />
    </View>
  );
}

function PlanCardSkeleton() {
  return (
    <SoftSurface variant="panel" style={styles.planCard}>
      <View style={styles.planPriceRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBone width="42%" height={22} />
          <SkeletonBone width="28%" height={11} />
        </View>
        <SkeletonBone width={28} height={28} radius={8} />
      </View>
      <SkeletonBone width="55%" height={15} style={{ marginTop: 14 }} />
      <SkeletonBone width="70%" height={12} style={{ marginTop: 8 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <SkeletonBone width={64} height={22} radius={8} />
        <SkeletonBone width={88} height={12} style={{ alignSelf: 'center' }} />
      </View>
    </SoftSurface>
  );
}

function PaymentRowSkeleton() {
  return (
    <SoftSurface style={styles.paymentRow}>
      <SkeletonBone width={40} height={40} radius={20} />
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <SkeletonBone width="55%" height={14} />
        <SkeletonBone width="40%" height={11} />
        <SkeletonBone width={72} height={18} radius={8} style={{ marginTop: 2 }} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <SkeletonBone width={64} height={15} />
        <SkeletonBone width={28} height={10} />
      </View>
    </SoftSurface>
  );
}

function MessageRowSkeleton() {
  return (
    <SoftSurface style={styles.messageRow}>
      <SkeletonBone width={40} height={40} radius={20} />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SkeletonBone width="42%" height={14} />
          <SkeletonBone width={56} height={18} radius={999} />
        </View>
        <SkeletonBone width="78%" height={12} />
        <SkeletonBone width="36%" height={11} />
      </View>
      <SkeletonBone width={14} height={14} radius={4} style={{ marginTop: 4 }} />
    </SoftSurface>
  );
}

function TeamRowSkeleton() {
  return (
    <SoftSurface style={styles.teamRow}>
      <SkeletonBone width={40} height={40} radius={20} />
      <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
        <SkeletonBone width="50%" height={14} />
        <SkeletonBone width={64} height={18} radius={999} />
      </View>
      <SkeletonBone width={28} height={28} radius={8} />
    </SoftSurface>
  );
}

function MemberRowSkeleton() {
  return (
    <SoftSurface style={styles.memberRow}>
      <SkeletonBone width={44} height={44} radius={22} />
      <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
        <SkeletonBone width="58%" height={14} />
        <SkeletonBone width="40%" height={11} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <SkeletonBone width={56} height={18} radius={999} />
        <SkeletonBone width={64} height={28} radius={8} />
      </View>
    </SoftSurface>
  );
}

/** Amount + method rows (member payment history — no avatar). */
function AmountMethodRowSkeleton() {
  return (
    <SoftSurface style={styles.amountRow}>
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBone width="36%" height={15} />
        <SkeletonBone width="28%" height={11} />
      </View>
      <SkeletonBone width={72} height={22} radius={8} />
    </SoftSurface>
  );
}

/** Activity log card: action|time + entity + actor/badge (no avatar). */
function ActivityCardSkeleton() {
  return (
    <SoftSurface style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <SkeletonBone width="48%" height={15} />
        <SkeletonBone width={72} height={11} />
      </View>
      <SkeletonBone width="62%" height={13} style={{ marginTop: 8 }} />
      <SkeletonBone width="78%" height={12} style={{ marginTop: 6 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <SkeletonBone width="28%" height={12} />
        <SkeletonBone width={52} height={18} radius={999} />
      </View>
    </SoftSurface>
  );
}

/** Branch card: name + pills + meta + overflow (no avatar). */
function BranchCardSkeleton() {
  return (
    <SoftSurface variant="panel" style={styles.branchCard}>
      <View style={styles.branchHeader}>
        <View style={{ flex: 1, gap: 8, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SkeletonBone width="46%" height={16} />
            <SkeletonBone width={56} height={20} radius={6} />
          </View>
          <SkeletonBone width="70%" height={12} />
          <SkeletonBone width="55%" height={11} style={{ marginTop: 4 }} />
        </View>
        <SkeletonBone width={28} height={28} radius={8} />
      </View>
    </SoftSurface>
  );
}

/** Attendance history day rows. */
export function AttendanceDaySkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: 8 }} accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.historyDayRow}>
          <View style={styles.historyDayAccent} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBone width="42%" height={14} />
            <SkeletonBone width="24%" height={11} />
          </View>
          <SkeletonBone width={16} height={16} radius={4} />
        </View>
      ))}
    </View>
  );
}

type Variant =
  | 'list-rows'
  | 'list-cards'
  | 'dashboard'
  | 'form'
  | 'detail'
  | 'reports'
  | 'check-in'
  | 'plans'
  | 'payments'
  | 'messages'
  | 'team'
  | 'members'
  | 'amount-rows'
  | 'activity'
  | 'branches';

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
          {Array.from({ length: 6 }, (_, i) => (
            <StatSkeleton key={i} />
          ))}
        </View>
      );
      break;
    case 'check-in':
      body = <CheckInPageSkeleton />;
      break;
    case 'plans':
      body = Array.from({ length: n }, (_, i) => <PlanCardSkeleton key={i} />);
      break;
    case 'payments':
      body = Array.from({ length: n }, (_, i) => <PaymentRowSkeleton key={i} />);
      break;
    case 'messages':
      body = Array.from({ length: n }, (_, i) => <MessageRowSkeleton key={i} />);
      break;
    case 'team':
      body = Array.from({ length: n }, (_, i) => <TeamRowSkeleton key={i} />);
      break;
    case 'members':
      body = Array.from({ length: n }, (_, i) => <MemberRowSkeleton key={i} />);
      break;
    case 'amount-rows':
      body = Array.from({ length: n }, (_, i) => <AmountMethodRowSkeleton key={i} />);
      break;
    case 'activity':
      body = Array.from({ length: n }, (_, i) => <ActivityCardSkeleton key={i} />);
      break;
    case 'branches':
      body = Array.from({ length: n }, (_, i) => <BranchCardSkeleton key={i} />);
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

/** Check-in search results — ring + identity + right CTA (matches CheckInMemberCard). */
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
          <View style={styles.checkInRow}>
            <SkeletonBone width={72} height={72} radius={36} />
            <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
              <SkeletonBone width="72%" height={15} />
              <SkeletonBone width="48%" height={12} />
              <SkeletonBone width={64} height={16} radius={999} style={{ marginTop: 1 }} />
            </View>
            <SkeletonBone width={84} height={32} radius={7} />
          </View>
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
    case 'plans':
      return 4;
    case 'list-rows':
    case 'payments':
    case 'messages':
    case 'team':
    case 'members':
    case 'amount-rows':
    case 'activity':
    case 'branches':
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
  checkInHero: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  checkInHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  checkInSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  planCard: {
    padding: 16,
    marginBottom: 10,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  activityCard: {
    padding: 14,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  branchCard: {
    padding: 16,
    marginBottom: 12,
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  historyDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    paddingLeft: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.25)',
    overflow: 'hidden',
  },
  historyDayAccent: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(15,118,110,0.35)',
  },
  checkInCard: {
    paddingVertical: 9,
    paddingHorizontal: 10,
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
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
