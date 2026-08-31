import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchDashboard } from '@/src/api/dashboard';
import { fetchGymProfile } from '@/src/api/profile';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { TrialBanner } from '@/src/components/TrialBanner';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { MiniBarChart } from '@/src/components/MiniBarChart';
import { PageSkeleton } from '@/src/components/Skeleton';
import { useBranchScope } from '@/src/context/BranchContext';
import { useTheme } from '@/src/context/PreferencesContext';
import type { DashboardAlertMember } from '@/src/types/api';
import { daysUntilDate, formatDisplayDate } from '@/src/utils/date';
import { formatEtb } from '@/src/utils/formatMoney';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useTabBarOverlayInset } from '@/src/theme/tabBar';
import { isGymOwner, isGymStaff } from '@/src/utils/roles';
import { ResponsiveContent } from '@/src/components/ResponsiveContent';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import StatusBadge from '@/src/components/StatusBadge';
import { RowActionLink } from '@/src/components/RowActionLink';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { MetricStatCard } from '@/src/components/MetricStatCard';
import { LoadError } from '@/src/components/LoadError';
import { space } from '@/src/theme/tokens';
import { metricDisplayStyle } from '@/src/theme/typography';
import { timings } from '@/src/theme/motion';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import { canRenewMember } from '@/src/utils/memberRenew';
import { formatPlanDisplayName } from '@/src/utils/planFormat';
import { pullRefreshing, useQueryScreenLoading } from '@/src/query/useQueryScreenLoading';

const ATTENTION_PREVIEW = 3;

type StatFilter = 'due_soon' | 'expired' | 'new';

function filterForMemberStatus(status: string): StatFilter {
  const normalized = status.toLowerCase();
  if (normalized === 'expired') return 'expired';
  return 'due_soon';
}

function AlertMemberRow({
  member,
  colors,
  token,
  onOpen,
  onAction,
  actionColor,
}: {
  member: DashboardAlertMember;
  colors: ReturnType<typeof useTheme>['colors'];
  token: string;
  onOpen: () => void;
  onAction?: () => void;
  /** Dark: brand teal (ex-Details); light: keep status green. */
  actionColor: string;
}) {
  const { t } = useTranslation();
  const statusLower = String(member.status || '').toLowerCase();
  const endLabel = (() => {
    if (statusLower === 'expired') {
      return t('dashboard.expiredOn', { date: formatDisplayDate(member.end_date) });
    }
    const days = daysUntilDate(member.end_date);
    if (days == null) return formatDisplayDate(member.end_date);
    if (days <= 0) return t('dashboard.expiresToday');
    return t('dashboard.daysLeft', { count: days });
  })();

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
          {formatPlanDisplayName(member.plan_name) || t('members.noPlan')}
        </Text>
        <Text style={[styles.alertExpires, { color: colors.dim }]} numberOfLines={1}>
          {endLabel}
        </Text>
      </View>
      <View style={styles.alertRight}>
        <StatusBadge status={member.status} />
        {onAction ? (
          <RowActionLink
            label={t('dashboard.renew')}
            icon="refresh"
            color={actionColor}
            emphasized
            onPress={onAction}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { token, user, gymName: cachedGymName, subscription } = useAuth();
  const { selectedBranchId } = useBranchScope();
  const { colors: c, theme } = useTheme();
  const isLight = theme === 'light';
  const { t } = useTranslation();
  const linkColor = c.accentCta;
  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const queryClient = useQueryClient();
  const owner = isGymOwner(user?.role);
  const staffUser = isGymStaff(user?.role);
  const { readOnly } = useGymReadOnly();
  const { statCardLayoutStyle, isTablet, pagePadding, chartHeight, width } = useResponsiveLayout();
  const heroMetricSm = width >= 640;
  const tabOverlayInset = useTabBarOverlayInset();
  const staffBranchLabel = staffUser
    ? branchDisplayName(user?.branch_name) || (user?.branch_id ? `Branch #${user.branch_id}` : null)
    : null;

  const profileQuery = useQuery({
    queryKey: ['gym-profile'],
    queryFn: () => fetchGymProfile(token!),
    enabled: Boolean(token && owner),
  });

  const registeredGymName = profileQuery.data?.gym.name ?? cachedGymName ?? 'Your gym';

  const { data, isLoading, isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', branchKey],
    queryFn: () => fetchDashboard(token!, selectedBranchId),
    enabled: Boolean(token),
  });
  const screenLoading = useQueryScreenLoading(isLoading, Boolean(data), isPending);
  const trialDaysLeft = data?.trialDaysLeft ?? subscription?.trialDaysLeft;
  const showTrialBanner =
    owner &&
    Boolean(data?.isTrial ?? subscription?.isTrial) &&
    !readOnly &&
    trialDaysLeft != null &&
    trialDaysLeft >= 0;

  useFocusEffect(
    useCallback(() => {
      void queryClient.refetchQueries({ queryKey: ['dashboard', branchKey], type: 'active', stale: true });
    }, [queryClient, branchKey]),
  );

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

  const goMembers = (filter?: StatFilter | 'active') => {
    const next = filter ?? 'active';
    // Query-string navigate is reliable for tab screens (params object can drop on tab switch).
    router.navigate(`/(tabs)/members?filter=${next}&focus=${Date.now()}` as Href);
  };

  const [attentionExpanded, setAttentionExpanded] = useState(false);
  const allAlertMembers = data?.alertMembers ?? [];
  const alertMembers = attentionExpanded
    ? allAlertMembers
    : allAlertMembers.slice(0, ATTENTION_PREVIEW);
  const attentionHasMore = allAlertMembers.length > ATTENTION_PREVIEW;
  const attentionHasContent = allAlertMembers.length > 0;

  const summaryBlock = data ? (
    <SoftSurface variant="panel" style={styles.summary}>
      <View style={styles.heroHeader}>
        <Pressable
          onPress={() => router.push('/(tabs)/revenue')}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel={t('dashboard.thisMonth')}
          style={styles.summaryTitleRow}
        >
          <Text style={[styles.summaryTitle, { color: c.muted }]}>{t('dashboard.thisMonth')}</Text>
          <Text style={[styles.summaryTitleChevron, { color: c.muted }]}>›</Text>
        </Pressable>
        <Ionicons
          name={
            trendLabel
              ? trendNegative
                ? 'trending-down-outline'
                : 'trending-up-outline'
              : 'cash-outline'
          }
          size={18}
          color={
            trendLabel ? (trendNegative ? c.statusExpired : c.success) : c.muted
          }
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
      <Text latin display style={[metricDisplayStyle(styles.income), { color: c.text }]}>
        {formatEtb(Number(data.monthlyIncome || 0), { forceCompact: false })}
      </Text>
      {trendLabel ? (
        <Text style={[styles.trend, { color: trendNegative ? c.statusExpired : c.success }]}>{trendLabel}</Text>
      ) : null}
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
          <Pressable onPress={() => goMembers('expired')}>
            <Text style={[styles.viewAll, { color: linkColor }]}>{t('dashboard.viewAll')}</Text>
          </Pressable>
        </View>
        {alertMembers.map((member) => {
          const renewable = canRenewMember(member);
          const route = renewable ? `/renew/${member.id}` : `/member/${member.id}`;
          return (
            <AlertMemberRow
              key={member.id}
              member={member}
              colors={c}
              token={token!}
              actionColor={linkColor}
              onOpen={() => goMembers(filterForMemberStatus(member.status))}
              onAction={readOnly ? undefined : renewable ? () => router.push(route as never) : undefined}
            />
          );
        })}
        {attentionHasMore ? (
          <View
            style={[
              styles.showMoreWrap,
              {
                borderTopColor: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(228,231,238,0.08)',
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                attentionExpanded ? t('dashboard.showLess') : t('dashboard.showMore')
              }
              onPress={() => setAttentionExpanded((v) => !v)}
              style={({ pressed }) => [
                styles.showMoreBtn,
                {
                  backgroundColor: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(228,231,238,0.06)',
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text style={[styles.showMoreLabel, { color: c.muted }]}>
                {attentionExpanded ? t('dashboard.showLess') : t('dashboard.showMore')}
              </Text>
              <Ionicons
                name={attentionExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={c.muted}
              />
            </Pressable>
            <Text style={[styles.showMoreMeta, { color: c.dim }]}>
              {t('dashboard.showingOf', {
                shown: alertMembers.length,
                total: allAlertMembers.length,
              })}
            </Text>
          </View>
        ) : null}
      </SoftSurface>
    ) : null;

  return (
    <TabScreenFrame>
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={[
        styles.content,
        isTablet && styles.contentTablet,
        { paddingBottom: 40 + tabOverlayInset },
      ]}
      refreshControl={<RefreshControl refreshing={pullRefreshing(isRefetching)} onRefresh={refetch} tintColor={c.accentText} />}
    >
      <ResponsiveContent style={{ paddingHorizontal: pagePadding }}>
      <Text display style={[styles.gymName, { color: c.text }, isTablet && styles.gymNameTablet]}>{registeredGymName}</Text>
      {staffBranchLabel ? (
        <Text style={[styles.branchLabel, { color: c.muted }]}>{t('branch.staffAt', { name: staffBranchLabel })}</Text>
      ) : null}

      <BranchFilterBar horizontalPadding={0} />

      {showTrialBanner ? (
        <TrialBanner
          isTrial={data?.isTrial ?? subscription?.isTrial}
          trialDaysLeft={trialDaysLeft}
          trialEndDate={data?.trialEndDate ?? subscription?.trialEndDate}
        />
      ) : null}

      {screenLoading ? (
        <PageSkeleton variant="dashboard" padded={false} />
      ) : isError ? (
        <LoadError error={error} onRetry={() => void refetch()} />
      ) : data ? (
        <Animated.View entering={FadeIn.duration(timings.fadeMs)}>
          <SoftSurface
            variant="panel"
            onPress={() => goMembers('active')}
            style={[styles.heroMetricCard, showTrialBanner ? styles.heroMetricCardAfterTrial : null]}
            accessibilityRole="button"
            accessibilityLabel={`${t('dashboard.activeMembersLabel')}: ${data.activeMembers ?? 0} / ${data.totalMembers ?? 0}`}
          >
            <View style={styles.heroHeader}>
              <Text style={[styles.heroMetricLabel, { color: c.muted }]}>
                {t('dashboard.activeMembersLabel')}
              </Text>
              <Ionicons
                name="people-outline"
                size={18}
                color={c.statusActive}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
            <View style={styles.heroValueRow}>
              <Text
                latin
                display
                style={[
                  metricDisplayStyle(styles.heroMetricValue),
                  heroMetricSm ? metricDisplayStyle(styles.heroMetricValueLg) : null,
                  { color: c.text },
                ]}
              >
                {data.activeMembers ?? 0}
              </Text>
              <Text
                latin
                display
                style={[
                  metricDisplayStyle({ ...styles.heroMetricSubValue, fontWeight: '500' }),
                  heroMetricSm ? metricDisplayStyle({ ...styles.heroMetricSubValueLg, fontWeight: '500' }) : null,
                  { color: c.muted },
                ]}
              >
                /{data.totalMembers ?? 0}
              </Text>
            </View>
            <View style={[styles.heroProgressTrack, { backgroundColor: c.border }]}>
              <View
                style={[
                  styles.heroProgressFill,
                  {
                    backgroundColor: c.statusActive,
                    width: `${
                      (data.totalMembers ?? 0) > 0
                        ? Math.min(100, ((data.activeMembers ?? 0) / (data.totalMembers ?? 1)) * 100)
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </SoftSurface>
          <View style={styles.grid}>
            <MetricStatCard
              label={t('dashboard.dueSoon')}
              value={data.dueSoonMembers ?? 0}
              accent={c.statusDueSoon}
              tone="neutral"
              icon="warning-outline"
              layoutStyle={statCardLayoutStyle}
              onPress={() => goMembers('due_soon')}
            />
            <MetricStatCard
              label={t('dashboard.expired')}
              value={data.expiredMembers ?? 0}
              accent={c.statusExpired}
              tone="attention"
              icon="close-circle-outline"
              layoutStyle={statCardLayoutStyle}
              onPress={() => goMembers('expired')}
            />
            <MetricStatCard
              label={t('dashboard.newMember', { count: data.newMembersThisMonth ?? 0 })}
              value={data.newMembersThisMonth ?? 0}
              accent={c.statusNew}
              tone="neutral"
              icon="person-add-outline"
              caption={t('dashboard.thisMonthCaption')}
              captionColor={c.statusNew}
              layoutStyle={statCardLayoutStyle}
              onPress={() => goMembers('new')}
            />
            <MetricStatCard
              label={t('dashboard.checkedIn')}
              value={typeof data.checkedInToday === 'number' ? data.checkedInToday : 0}
              accent={c.warm}
              tone="neutral"
              icon="clipboard-outline"
              caption={t('dashboard.todayCaption')}
              captionColor={c.warm}
              layoutStyle={statCardLayoutStyle}
              onPress={() => router.push('/(tabs)/check-in' as never)}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
  heroMetricCard: {
    marginTop: space.sm,
    padding: space.lg,
  },
  heroMetricCardAfterTrial: {
    marginTop: 0,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroMetricLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  heroMetricValue: {
    fontSize: 34,
    letterSpacing: -0.9,
  },
  heroMetricValueLg: {
    fontSize: 46,
    letterSpacing: -1.2,
  },
  heroMetricSubValue: {
    fontSize: 20,
    letterSpacing: -0.5,
  },
  heroMetricSubValueLg: {
    fontSize: 24,
    letterSpacing: -0.6,
  },
  heroProgressTrack: {
    marginTop: 16,
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: 6,
    borderRadius: 999,
  },
  summary: {
    marginTop: space.md,
    padding: space.lg,
  },
  summaryTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  summaryTitleChevron: { fontSize: 16, fontWeight: '600', lineHeight: 18 },
  income: {
    marginTop: 6,
    fontSize: 30,
    letterSpacing: -0.8,
  },
  trend: { marginTop: 6, fontSize: 13, fontWeight: '600' },
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
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  alertBody: { flex: 1, minWidth: 0, marginRight: 6 },
  alertName: { fontSize: 14, fontWeight: '600' },
  alertMeta: { marginTop: 2, fontSize: 12, lineHeight: 16 },
  alertExpires: { marginTop: 1, fontSize: 12, lineHeight: 16 },
  alertRight: { alignItems: 'flex-end', gap: 6 },
  showMoreWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 4,
    marginTop: 4,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  showMoreLabel: { fontSize: 14, fontWeight: '600', letterSpacing: -0.1 },
  showMoreMeta: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
  },
});
