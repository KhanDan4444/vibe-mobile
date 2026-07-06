import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchDashboard } from '@/src/api/dashboard';
import { fetchGymProfile } from '@/src/api/profile';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { MiniBarChart } from '@/src/components/MiniBarChart';
import { ReadOnlyBanner } from '@/src/components/ReadOnlyBanner';
import { useBranchScope } from '@/src/context/BranchContext';
import { useTheme } from '@/src/context/PreferencesContext';
import type { DashboardAlertMember } from '@/src/types/api';
import { formatDisplayDate } from '@/src/utils/date';
import { formatEtb } from '@/src/utils/formatMoney';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { isGymOwner, isGymStaff } from '@/src/utils/roles';

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
      <View style={[styles.alertAvatar, { backgroundColor: colors.accentSoft }]}>
        <Text style={[styles.alertInitial, { color: colors.accentText }]}>
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
  const staffBranchLabel = staffUser
    ? user?.branch_name || (user?.branch_id ? `Branch #${user.branch_id}` : null)
    : null;

  const profileQuery = useQuery({
    queryKey: ['gym-profile'],
    queryFn: () => fetchGymProfile(token!),
    enabled: Boolean(token && owner),
  });

  const registeredGymName = profileQuery.data?.gym.name ?? cachedGymName ?? 'Your gym';

  const { data, isLoading, refetch, isRefetching } = useQuery({
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

  const cardStyle = [styles.statCard, { backgroundColor: c.card, borderColor: c.border }];
  const valueStyle = [styles.statValue, { color: c.text }];
  const labelStyle = [styles.statLabel, { color: c.muted }];
  const alertMembers = (data?.alertMembers ?? []).slice(0, 5);
  const alertFilter = alertMembers.some((member) => member.status.toLowerCase() === 'expired') ? 'expired' : 'due_soon';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accentText} />}
    >
      <Text style={[styles.gymName, { color: c.text }]}>{registeredGymName}</Text>
      {staffBranchLabel ? (
        <Text style={[styles.branchLabel, { color: c.muted }]}>{t('branch.staffAt', { name: staffBranchLabel })}</Text>
      ) : null}

      <BranchFilterBar horizontalPadding={0} />

      {isLoading ? (
        <Text style={[styles.muted, { color: c.dim }]}>{t('dashboard.loading')}</Text>
      ) : (
        <View style={styles.grid}>
          <StatCard
            label={t('dashboard.active')}
            value={data?.activeMembers ?? 0}
            accent={c.success}
            cardStyle={cardStyle}
            valueStyle={valueStyle}
            labelStyle={labelStyle}
            onPress={() => goMembers()}
          />
          <StatCard
            label={t('dashboard.dueSoon')}
            value={data?.dueSoonMembers ?? 0}
            accent={c.warning}
            cardStyle={cardStyle}
            valueStyle={valueStyle}
            labelStyle={labelStyle}
            onPress={() => goMembers('due_soon')}
          />
          <StatCard
            label={t('dashboard.expired')}
            value={data?.expiredMembers ?? 0}
            accent="#f87171"
            cardStyle={cardStyle}
            valueStyle={valueStyle}
            labelStyle={labelStyle}
            onPress={() => goMembers('expired')}
          />
          <StatCard
            label={t('dashboard.unpaid')}
            value={data?.unpaidCount ?? 0}
            accent="#fb923c"
            cardStyle={cardStyle}
            valueStyle={valueStyle}
            labelStyle={labelStyle}
            onPress={() => goMembers('unpaid')}
          />
        </View>
      )}

      {data ? (
        <View
          style={[styles.summary, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <Pressable onPress={() => router.push('/(tabs)/revenue')}>
            <Text style={[styles.summaryTitle, { color: c.muted }]}>{t('dashboard.thisMonth')}</Text>
            <Text style={[styles.income, { color: c.accentText }]}>
              {formatEtb(Number(data.monthlyIncome || 0))}
            </Text>
            {trendLabel ? <Text style={[styles.trend, { color: c.success }]}>{trendLabel}</Text> : null}
            <Text style={[styles.muted, { color: c.dim }]}>
              {t('dashboard.membersTotal', { count: data.totalMembers })}
              {data.newMembersThisMonth != null
                ? ` · ${t('dashboard.newThisMonth', { count: data.newMembersThisMonth })}`
                : ''}
            </Text>
          </Pressable>
          {owner ? <MiniBarChart data={data.revenueChart ?? []} showTypeSwitcher /> : null}
        </View>
      ) : null}

      {data && owner ? (
        <View style={[styles.alertCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>{t('dashboard.attentionTitle')}</Text>
            <Pressable onPress={() => goMembers(alertFilter)}>
              <Text style={[styles.viewAll, { color: c.accentText }]}>{t('dashboard.viewAll')}</Text>
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
                  onOpen={() => goMembers(filterForMemberStatus(member.status))}
                  onAction={readOnly ? undefined : () => router.push(route as never)}
                />
              );
            })
          ) : (
            <Text style={[styles.muted, { color: c.dim }]}>{t('dashboard.noAttention')}</Text>
          )}
        </View>
      ) : null}

      <ReadOnlyBanner />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  gymName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  branchLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { marginTop: 4, fontSize: 13 },
  summary: {
    marginTop: 24,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  summaryTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  income: { marginTop: 8, fontSize: 32, fontWeight: '700' },
  trend: { marginTop: 6, fontSize: 13, fontWeight: '600' },
  muted: { marginTop: 8, fontSize: 14 },
  alertCard: {
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  viewAll: { fontSize: 13, fontWeight: '600' },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  alertAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInitial: { fontSize: 14, fontWeight: '700' },
  alertBody: { flex: 1, minWidth: 0 },
  alertName: { fontSize: 14, fontWeight: '700' },
  alertMeta: { marginTop: 3, fontSize: 12 },
  alertRight: { alignItems: 'flex-end', gap: 6 },
  alertStatus: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  alertAction: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  alertActionText: { fontSize: 12, fontWeight: '700' },
  banner: {
    marginTop: 20,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  bannerText: { color: '#fcd34d', fontSize: 14 },
});
