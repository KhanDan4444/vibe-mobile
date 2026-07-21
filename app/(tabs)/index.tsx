import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchDashboard } from '@/src/api/dashboard';
import { fetchGymProfile } from '@/src/api/profile';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { MiniBarChart } from '@/src/components/MiniBarChart';
import { PageSkeleton } from '@/src/components/Skeleton';
import { ReadOnlyBanner } from '@/src/components/ReadOnlyBanner';
import { useBranchScope } from '@/src/context/BranchContext';
import { useTheme } from '@/src/context/PreferencesContext';
import type { DashboardAlertMember } from '@/src/types/api';
import { formatDisplayDate } from '@/src/utils/date';
import { formatEtb } from '@/src/utils/formatMoney';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { isGymOwner, isGymStaff } from '@/src/utils/roles';
import { ResponsiveContent } from '@/src/components/ResponsiveContent';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';

type StatFilter = 'due_soon' | 'expired' | 'unpaid';

function filterForMemberStatus(status: string): StatFilter {
  const normalized = status.toLowerCase();
  if (normalized === 'expired') return 'expired';
  if (normalized === 'due soon') return 'due_soon';
  return 'unpaid';
}

function StatCard({
  label,
  value,
  accent,
  cardStyle,
  valueStyle,
  labelStyle,
  onPress,
}: {
  label: string;
  value: string | number;
  accent?: string;
  cardStyle: object;
  valueStyle: object;
  labelStyle: object;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={[valueStyle, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={labelStyle}>{label}</Text>
    </>
  );

  if (!onPress) {
    return <View style={cardStyle}>{content}</View>;
  }

  return (
    <Pressable style={cardStyle} onPress={onPress}>
      {content}
    </Pressable>
  );
}

function alertAccent(status: string) {
  const s = status.toLowerCase();
  if (s === 'due soon') return '#fbbf24';
  if (s === 'expired') return '#f87171';
  return '#fb923c';
}

function AlertMemberRow({
  member,
  colors,
  onOpen,
  onAction,
}: {
  member: DashboardAlertMember;
  colors: ReturnType<typeof useTheme>['colors'];
  onOpen: () => void;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable style={[styles.alertRow, { borderColor: colors.border }]} onPress={onOpen}>
      <View style={[styles.alertAvatar, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.alertInitial, { color: colors.text }]}>
          {(member.name || '?').trim().charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.alertBody}>
        <Text style={[styles.alertName, { color: colors.text }]} numberOfLines={1}>
          {member.name}
        </Text>
        <Text style={[styles.alertMeta, { color: colors.dim }]} numberOfLines={1}>
          {(member.plan_name || t('members.noPlan'))} · {t('dashboard.expires', { date: formatDisplayDate(member.end_date) })}
        </Text>
      </View>
      <View style={styles.alertRight}>
        <Text style={[styles.alertStatus, { color: alertAccent(member.status) }]}>{member.status}</Text>
        {onAction ? (
          <Pressable style={[styles.alertAction, { backgroundColor: colors.accentSoft }]} onPress={onAction}>
            <Text style={[styles.alertActionText, { color: colors.accentText }]}>{t('dashboard.renew')}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { token, user, gymName: cachedGymName } = useAuth();
  const { selectedBranchId } = useBranchScope();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const owner = isGymOwner(user?.role);
  const staffUser = isGymStaff(user?.role);
  const { readOnly } = useGymReadOnly();
  const { statCardWidthPercent, isTablet, pagePadding, chartHeight } = useResponsiveLayout();
  const staffBranchLabel = staffUser
    ? user?.branch_name || (user?.branch_id ? `Branch #${user.branch_id}` : null)
    : null;

  const profileQuery = useQuery({
    queryKey: ['gym-profile'],
    queryFn: () => fetchGymProfile(token!),
    enabled: Boolean(token && owner),
  });

  const registeredGymName = profileQuery.data?.gym.name ?? cachedGymName ?? 'Your gym';

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', branchKey],
    queryFn: () => fetchDashboard(token!, selectedBranchId),
    enabled: Boolean(token),
  });

  const trendLabel = (() => {
    const percent = data?.revenueTrendPercent;
    if (percent == null) return null;
    if (typeof percent === 'string') {
      const trimmed = percent.trim();
      return trimmed ? t('dashboard.trendVsLastMonth', { value: trimmed }) : null;
    }
    const n = Number(percent);
    if (!Number.isFinite(n)) return null;
    const sign = n > 0 ? '+' : '';
    return t('dashboard.trendVsLastMonth', { value: `${sign}${n.toFixed(0)}%` });
  })();

  const goMembers = (filter?: StatFilter) => {
    router.push({
      pathname: '/(tabs)/members',
      params: { filter: filter ?? 'active', focus: String(Date.now()) },
    });
  };

  const cardStyle = [
    styles.statCard,
    { width: statCardWidthPercent, backgroundColor: c.card, borderColor: c.border },
  ];
  const valueStyle = [styles.statValue, { color: c.text }];
  const labelStyle = [styles.statLabel, { color: c.muted }];
  const alertMembers = (data?.alertMembers ?? []).slice(0, 5);
  const unpaidCount = data?.unpaidCount ?? 0;
  const attentionHasContent = alertMembers.length > 0 || unpaidCount > 0;
  const alertFilter = alertMembers.some((member) => member.status.toLowerCase() === 'expired')
    ? 'expired'
    : alertMembers.some((member) => member.status.toLowerCase() === 'due soon')
      ? 'due_soon'
      : unpaidCount > 0
        ? 'unpaid'
        : 'due_soon';

  const summaryBlock = data ? (
    <View style={[styles.summary, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable onPress={() => router.push('/(tabs)/revenue')}>
        <Text style={[styles.summaryTitle, { color: c.muted }]}>{t('dashboard.thisMonth')}</Text>
        <Text style={[styles.income, { color: c.accentText }]}>
          {formatEtb(Number(data.monthlyIncome || 0), { forceCompact: false })}
        </Text>
        {trendLabel ? <Text style={[styles.trend, { color: c.success }]}>{trendLabel}</Text> : null}
        <Text style={[styles.muted, { color: c.dim }]}>
          {t('dashboard.membersTotal', { count: data.totalMembers })}
          {data.newMembersThisMonth != null
            ? ` · ${t('dashboard.newThisMonth', { count: data.newMembersThisMonth })}`
            : ''}
        </Text>
      </Pressable>
      {owner ? (
        <MiniBarChart data={data.revenueChart ?? []} height={chartHeight} />
      ) : null}
    </View>
  ) : null;

  const attentionBlock =
    data && owner && (attentionHasContent || !isTablet) ? (
      <View style={[styles.alertCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>{t('dashboard.attentionTitle')}</Text>
          {attentionHasContent ? (
            <Pressable onPress={() => goMembers(alertFilter)}>
              <Text style={[styles.viewAll, { color: c.accentText }]}>{t('dashboard.viewAll')}</Text>
            </Pressable>
          ) : null}
        </View>
        {alertMembers.length ? (
          alertMembers.map((member) => {
            const status = member.status.toLowerCase();
            const route = status === 'expired' || status === 'due soon' ? `/renew/${member.id}` : `/member/${member.id}`;
            return (
              <AlertMemberRow
                key={member.id}
                member={member}
                colors={c}
                onOpen={() => goMembers(filterForMemberStatus(member.status))}
                onAction={readOnly ? undefined : () => router.push(route as never)}
              />
            );
          })
        ) : unpaidCount > 0 ? (
          <Pressable
            style={[styles.attentionShortcut, { borderColor: c.border, backgroundColor: c.accentSoft }]}
            onPress={() => goMembers('unpaid')}
          >
            <Text style={[styles.attentionShortcutValue, { color: c.statusUnpaid }]}>{unpaidCount}</Text>
            <View style={styles.attentionShortcutBody}>
              <Text style={[styles.attentionShortcutTitle, { color: c.text }]}>
                {t('dashboard.unpaidShortcutTitle')}
              </Text>
              <Text style={[styles.attentionShortcutMeta, { color: c.dim }]}>
                {t('dashboard.unpaidShortcutBody')}
              </Text>
            </View>
            <Text style={[styles.viewAll, { color: c.accentText }]}>{t('dashboard.viewAll')}</Text>
          </Pressable>
        ) : (
          <Text style={[styles.muted, { color: c.dim }]}>{t('dashboard.noAttention')}</Text>
        )}
      </View>
    ) : null;

  return (
    <TabScreenFrame>
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={[styles.content, isTablet && styles.contentTablet]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accentText} />}
    >
      <ResponsiveContent style={{ paddingHorizontal: pagePadding }}>
      <Text style={[styles.gymName, { color: c.text }, isTablet && styles.gymNameTablet]}>{registeredGymName}</Text>
      {staffBranchLabel ? (
        <Text style={[styles.branchLabel, { color: c.muted }]}>{t('branch.staffAt', { name: staffBranchLabel })}</Text>
      ) : null}

      <BranchFilterBar horizontalPadding={0} />

      {isLoading ? (
        <PageSkeleton variant="dashboard" padded={false} />
      ) : isError ? (
        <View style={styles.errorWrap}>
          <Text style={[styles.errorText, { color: c.error }]}>
            {error instanceof Error ? error.message : t('gymBoot.errorBody')}
          </Text>
          <Pressable
            style={[styles.retryBtn, { borderColor: c.border, backgroundColor: c.card }]}
            onPress={() => void refetch()}
          >
            <Text style={[styles.retryText, { color: c.accentText }]}>{t('gymBoot.retry')}</Text>
          </Pressable>
        </View>
      ) : data ? (
        <>
          <View style={styles.grid}>
            <StatCard
              label={t('dashboard.active')}
              value={data.activeMembers ?? 0}
              accent={c.statusActive}
              cardStyle={cardStyle}
              valueStyle={valueStyle}
              labelStyle={labelStyle}
              onPress={() => goMembers()}
            />
            <StatCard
              label={t('dashboard.dueSoon')}
              value={data.dueSoonMembers ?? 0}
              accent={c.statusDueSoon}
              cardStyle={cardStyle}
              valueStyle={valueStyle}
              labelStyle={labelStyle}
              onPress={() => goMembers('due_soon')}
            />
            <StatCard
              label={t('dashboard.expired')}
              value={data.expiredMembers ?? 0}
              accent={c.statusExpired}
              cardStyle={cardStyle}
              valueStyle={valueStyle}
              labelStyle={labelStyle}
              onPress={() => goMembers('expired')}
            />
            <StatCard
              label={t('dashboard.unpaid')}
              value={data.unpaidCount ?? 0}
              accent={c.statusUnpaid}
              cardStyle={cardStyle}
              valueStyle={valueStyle}
              labelStyle={labelStyle}
              onPress={() => goMembers('unpaid')}
            />
          </View>
          {summaryBlock}
          {owner ? attentionBlock : null}
        </>
      ) : null}

      <ReadOnlyBanner />
      </ResponsiveContent>
    </ScrollView>
    </TabScreenFrame>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  contentTablet: { flexGrow: 1 },
  gymName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  gymNameTablet: {
    fontSize: 26,
  },
  branchLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statCard: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { marginTop: 2, fontSize: 12 },
  summary: {
    marginTop: 16,
    borderRadius: 14,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryTitle: { fontSize: 13, fontWeight: '600' },
  income: { marginTop: 6, fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  trend: { marginTop: 6, fontSize: 13, fontWeight: '600' },
  muted: { marginTop: 8, fontSize: 14 },
  errorWrap: { alignItems: 'center', paddingTop: 32, gap: 12 },
  errorText: { textAlign: 'center', fontSize: 15 },
  retryBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: { fontSize: 14, fontWeight: '600' },
  alertCard: {
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  viewAll: { fontSize: 13, fontWeight: '600' },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  alertAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInitial: { fontSize: 14, fontWeight: '700' },
  alertBody: { flex: 1, minWidth: 0 },
  alertName: { fontSize: 14, fontWeight: '700' },
  alertMeta: { marginTop: 3, fontSize: 12 },
  alertRight: { alignItems: 'flex-end', gap: 6 },
  alertStatus: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  alertAction: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  alertActionText: { fontSize: 12, fontWeight: '700' },
  attentionShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  attentionShortcutValue: { fontSize: 28, fontWeight: '800', minWidth: 36 },
  attentionShortcutBody: { flex: 1, minWidth: 0 },
  attentionShortcutTitle: { fontSize: 14, fontWeight: '700' },
  attentionShortcutMeta: { marginTop: 3, fontSize: 12, lineHeight: 16 },
  banner: {
    marginTop: 20,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 10,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  bannerText: { color: '#fcd34d', fontSize: 14 },
});
