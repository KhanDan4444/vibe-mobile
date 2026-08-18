import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchDashboard } from '@/src/api/dashboard';
import { fetchGymProfile } from '@/src/api/profile';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { MiniBarChart } from '@/src/components/MiniBarChart';
import { PageSkeleton } from '@/src/components/Skeleton';
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
import StatusBadge from '@/src/components/StatusBadge';
import { RowActionLink } from '@/src/components/RowActionLink';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { MetricStatCard } from '@/src/components/MetricStatCard';
import { SecondaryButton } from '@/src/components/ui/Button';
import { space } from '@/src/theme/tokens';
import { timings } from '@/src/theme/motion';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { branchDisplayName } from '@/src/utils/branchDisplayName';

type StatFilter = 'due_soon' | 'expired' | 'unpaid';

function filterForMemberStatus(status: string): StatFilter {
  const normalized = status.toLowerCase();
  if (normalized === 'expired') return 'expired';
  if (normalized === 'due soon') return 'due_soon';
  return 'unpaid';
}

function AlertMemberRow({
  member,
  colors,
  token,
  onOpen,
  onAction,
}: {
  member: DashboardAlertMember;
  colors: ReturnType<typeof useTheme>['colors'];
  token: string;
  onOpen: () => void;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable style={[styles.alertRow, { borderColor: colors.border }]} onPress={onOpen}>
      <MemberPhoto
        memberId={member.id}
        name={member.name}
        token={token}
        size={36}
        hasPhoto={Boolean(member.photo_url)}
      />
      <View style={styles.alertBody}>
        <Text listRow style={[styles.alertName, { color: colors.text }]} numberOfLines={1}>
          {member.name}
        </Text>
        <Text style={[styles.alertMeta, { color: colors.dim }]} numberOfLines={1}>
          {member.plan_name || t('members.noPlan')}
        </Text>
        <Text style={[styles.alertExpires, { color: colors.dim }]} numberOfLines={1}>
          {t('dashboard.expires', { date: formatDisplayDate(member.end_date) })}
        </Text>
      </View>
      <View style={styles.alertRight}>
        <StatusBadge status={member.status} />
        {onAction ? (
          <RowActionLink
            label={t('dashboard.renew')}
            icon="sync-outline"
            color={colors.statusActive}
            onPress={onAction}
          />
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
  const { statCardLayoutStyle, isTablet, pagePadding, chartHeight } = useResponsiveLayout();
  const staffBranchLabel = staffUser
    ? branchDisplayName(user?.branch_name) || (user?.branch_id ? `Branch #${user.branch_id}` : null)
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

  const trendPercent = data?.revenueTrendPercent;
  const trendNegative = (() => {
    if (trendPercent == null) return false;
    if (typeof trendPercent === 'string') {
      const trimmed = trendPercent.trim();
      if (trimmed.startsWith('-')) return true;
      const n = Number(trimmed.replace(/%/g, ''));
      return Number.isFinite(n) && n < 0;
    }
    return Number(trendPercent) < 0;
  })();
  const trendLabel = (() => {
    if (trendPercent == null) return null;
    if (typeof trendPercent === 'string') {
      const trimmed = trendPercent.trim();
      return trimmed ? t('dashboard.trendVsLastMonth', { value: trimmed }) : null;
    }
    const n = Number(trendPercent);
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
    <SoftSurface variant="panel" style={styles.summary}>
      <Pressable
        onPress={() => router.push('/(tabs)/revenue')}
        hitSlop={8}
        accessibilityRole="link"
        accessibilityLabel={t('dashboard.thisMonth')}
        style={styles.summaryTitleRow}
      >
        <Text style={[styles.summaryTitle, { color: c.accentText }]}>{t('dashboard.thisMonth')}</Text>
        <Text style={[styles.summaryTitleChevron, { color: c.accentText }]}>›</Text>
      </Pressable>
      <Text style={[styles.income, { color: c.text }]}>
        {formatEtb(Number(data.monthlyIncome || 0), { forceCompact: false })}
      </Text>
      {trendLabel ? (
        <Text style={[styles.trend, { color: trendNegative ? c.statusExpired : c.success }]}>{trendLabel}</Text>
      ) : null}
      <Text style={[styles.muted, { color: c.dim }]}>
        {t('dashboard.membersTotal', { count: data.totalMembers })}
        {data.newMembersThisMonth != null
          ? ` · ${t('dashboard.newThisMonth', { count: data.newMembersThisMonth })}`
          : ''}
      </Text>
      {owner ? (
        <MiniBarChart data={data.revenueChart ?? []} height={chartHeight} />
      ) : null}
    </SoftSurface>
  ) : null;

  const attentionBlock =
    data && owner && attentionHasContent ? (
      <SoftSurface variant="panel" style={styles.alertCard}>
        <View style={styles.sectionHeader}>
          <Text display style={[styles.sectionTitle, { color: c.text }]}>{t('dashboard.attentionTitle')}</Text>
          <Pressable onPress={() => goMembers(alertFilter)}>
            <Text style={[styles.viewAll, { color: c.statusActive }]}>{t('dashboard.viewAll')}</Text>
          </Pressable>
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
                token={token!}
                onOpen={() => goMembers(filterForMemberStatus(member.status))}
                onAction={readOnly ? undefined : () => router.push(route as never)}
              />
            );
          })
        ) : (
          <SoftSurface
            variant="quiet"
            onPress={() => goMembers('unpaid')}
            style={[styles.attentionShortcut, { backgroundColor: c.accentSoft }]}
          >
            <Text display style={[styles.attentionShortcutValue, { color: c.statusUnpaid }]}>{unpaidCount}</Text>
            <View style={styles.attentionShortcutBody}>
              <Text style={[styles.attentionShortcutTitle, { color: c.text }]}>
                {t('dashboard.unpaidShortcutTitle')}
              </Text>
              <Text style={[styles.attentionShortcutMeta, { color: c.dim }]}>
                {t('dashboard.unpaidShortcutBody')}
              </Text>
            </View>
            <Text style={[styles.viewAll, { color: c.statusActive }]}>{t('dashboard.viewAll')}</Text>
          </SoftSurface>
        )}
      </SoftSurface>
    ) : null;

  return (
    <TabScreenFrame>
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={[styles.content, isTablet && styles.contentTablet]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accentText} />}
    >
      <ResponsiveContent style={{ paddingHorizontal: pagePadding }}>
      <Text display style={[styles.gymName, { color: c.text }, isTablet && styles.gymNameTablet]}>{registeredGymName}</Text>
      {staffBranchLabel ? (
        <Text style={[styles.branchLabel, { color: c.muted }]}>{t('branch.staffAt', { name: staffBranchLabel })}</Text>
      ) : null}

      <BranchFilterBar horizontalPadding={0} />

      {isLoading ? (
        <PageSkeleton variant="dashboard" padded={false} />
      ) : isError ? (
        <View style={styles.errorWrap}>
          <Text style={[styles.errorText, { color: c.error }]}>
            {userFacingApiMessage(error, t('gymBoot.errorBody'), t('gymBoot.errorBody'))}
          </Text>
          <SecondaryButton label={t('gymBoot.retry')} onPress={() => void refetch()} />
        </View>
      ) : data ? (
        <Animated.View entering={FadeIn.duration(timings.fadeMs)}>
          <View style={styles.grid}>
            <MetricStatCard
              label={t('dashboard.active')}
              value={data.activeMembers ?? 0}
              accent={c.statusActive}
              tone="neutral"
              layoutStyle={statCardLayoutStyle}
              onPress={() => goMembers()}
            />
            <MetricStatCard
              label={t('dashboard.dueSoon')}
              value={data.dueSoonMembers ?? 0}
              accent={c.statusDueSoon}
              tone="neutral"
              layoutStyle={statCardLayoutStyle}
              onPress={() => goMembers('due_soon')}
            />
            <MetricStatCard
              label={t('dashboard.expired')}
              value={data.expiredMembers ?? 0}
              accent={c.statusExpired}
              tone="attention"
              layoutStyle={statCardLayoutStyle}
              onPress={() => goMembers('expired')}
            />
            <MetricStatCard
              label={t('dashboard.unpaid')}
              value={data.unpaidCount ?? 0}
              accent={c.statusUnpaid}
              tone="neutral"
              layoutStyle={statCardLayoutStyle}
              onPress={() => goMembers('unpaid')}
            />
          </View>
          {summaryBlock}
          {owner ? attentionBlock : null}
        </Animated.View>
      ) : null}
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
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  gymNameTablet: {
    fontSize: 28,
  },
  branchLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.sm },
  summary: {
    marginTop: space.lg,
    padding: space.lg + 2,
  },
  summaryTitle: { fontSize: 13, fontWeight: '600' },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  summaryTitleChevron: { fontSize: 16, fontWeight: '600', lineHeight: 18 },
  income: { marginTop: 6, fontSize: 30, fontWeight: '700', letterSpacing: -0.8 },
  trend: { marginTop: 6, fontSize: 13, fontWeight: '600' },
  muted: { marginTop: 8, fontSize: 14 },
  errorWrap: { alignItems: 'center', paddingTop: 32, gap: 12 },
  errorText: { textAlign: 'center', fontSize: 15 },
  alertCard: {
    marginTop: space.lg,
    padding: space.lg,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  viewAll: { fontSize: 15, fontWeight: '600' },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  alertBody: { flex: 1, minWidth: 0, marginRight: 8 },
  alertName: { fontSize: 14, fontWeight: '600' },
  alertMeta: { marginTop: 3, fontSize: 12 },
  alertExpires: { marginTop: 2, fontSize: 12 },
  alertRight: { alignItems: 'flex-end', gap: 8 },
  attentionShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    padding: space.md,
  },
  attentionShortcutValue: { fontSize: 28, fontWeight: '700', minWidth: 36, letterSpacing: -0.4 },
  attentionShortcutBody: { flex: 1, minWidth: 0 },
  attentionShortcutTitle: { fontSize: 14, fontWeight: '600' },
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
