import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import { ListFooterSkeleton, PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchActivityLogs } from '@/src/api/activity';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { FilterPickerButton } from '@/src/components/FilterPickerButton';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { EmptyState } from '@/src/components/EmptyState';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useBranchScope } from '@/src/context/BranchContext';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { pullRefreshing } from '@/src/query/useQueryScreenLoading';
import { formatLogTimestamp } from '@/src/utils/date';
import {
  activityActionIcon,
  formatAuditAction,
  formatAuditDetails,
  formatActorRole,
} from '@/src/utils/activityLabels';
import { useTranslation } from 'react-i18next';
import { isGymOwner } from '@/src/utils/roles';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import { badgeTextProps, listPrimaryTextProps } from '@/src/theme/typography';
import type { ActivityLogRow } from '@/src/types/api';

type ActorFilter = 'all' | 'owner' | 'staff';

const ACTOR_OPTION_KEYS: { value: ActorFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'activity.everyone' },
  { value: 'staff', labelKey: 'activity.staffOnly' },
  { value: 'owner', labelKey: 'activity.ownerOnly' },
];

function isRowClickable(entry: ActivityLogRow) {
  if (entry.entity_type === 'member' && entry.entity_id) return true;
  if (entry.entity_type === 'payment') return true;
  if (entry.entity_type === 'plan') return true;
  if (entry.entity_type === 'staff') return true;
  return false;
}

function openActivityTarget(entry: ActivityLogRow, router: ReturnType<typeof useRouter>) {
  const type = entry.entity_type;
  if (type === 'member' && entry.entity_id) {
    router.push(`/member/${entry.entity_id}` as never);
    return;
  }
  if (type === 'payment') {
    const memberId = entry.details?.member_id;
    if (memberId) {
      router.push(`/member/${memberId}` as never);
      return;
    }
    router.push('/(tabs)/revenue' as never);
    return;
  }
  if (type === 'plan') {
    router.push('/plans' as never);
    return;
  }
  if (type === 'staff') {
    router.push('/team' as never);
  }
}

function ActivityItem({
  entry,
  showBranch,
  isFirst,
  isLight,
  language,
  onPress,
}: {
  entry: ActivityLogRow;
  showBranch?: boolean;
  isFirst?: boolean;
  isLight: boolean;
  language: string;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const isOwner = entry.actor_role === 'Gym Owner';
  const styles = useThemedStyles((theme) => ({
    row: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 14,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(228,231,238,0.08)',
      marginHorizontal: 14,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      // Light keeps a soft teal well; dark stays flat (no glow wash).
      backgroundColor: isLight ? 'rgba(15,118,110,0.08)' : 'transparent',
      marginTop: 1,
    },
    body: { flex: 1, minWidth: 0 },
    headerRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
      gap: 10,
    },
    action: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600' as const,
      color: theme.text,
      letterSpacing: -0.2,
    },
    time: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: theme.dim,
      fontVariant: ['tabular-nums' as const],
      letterSpacing: -0.1,
    },
    entity: { marginTop: 4, fontSize: 14, color: theme.muted },
    details: { marginTop: 3, fontSize: 13, color: theme.text },
    actorRow: {
      marginTop: 7,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    actorName: { fontSize: 12, fontWeight: '600' as const, color: theme.dim },
    roleBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    roleBadgeOwner: {
      backgroundColor: 'rgba(100, 116, 139, 0.14)',
      borderColor: 'rgba(100, 116, 139, 0.28)',
    },
    roleBadgeStaff: {
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      borderColor: 'rgba(249, 115, 22, 0.24)',
    },
    roleBadgeText: { fontSize: 10, fontWeight: '700' as const },
    roleBadgeTextOwner: { color: theme.statusNeutral },
    roleBadgeTextStaff: { color: theme.statusUnpaid },
    branch: { fontSize: 12, color: theme.dim },
  }));

  const details = formatAuditDetails(entry, t);
  const iconName = activityActionIcon(entry.action);

  const content = (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={17} color={isLight ? '#0F766E' : c.muted} />
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.action} numberOfLines={2}>
            {formatAuditAction(entry.action, t)}
          </Text>
          <Text style={styles.time}>{formatLogTimestamp(entry.created_at, t, language)}</Text>
        </View>
        {entry.entity_label ? (
          <Text {...listPrimaryTextProps} style={styles.entity}>
            {entry.entity_label}
          </Text>
        ) : null}
        {details ? (
          <Text style={styles.details} numberOfLines={2}>
            {details}
          </Text>
        ) : null}
        <View style={styles.actorRow}>
          <Text {...listPrimaryTextProps} style={styles.actorName}>
            {entry.actor_name || entry.actor_email}
          </Text>
          <View style={[styles.roleBadge, isOwner ? styles.roleBadgeOwner : styles.roleBadgeStaff]}>
            <Text {...badgeTextProps} style={[styles.roleBadgeText, isOwner ? styles.roleBadgeTextOwner : styles.roleBadgeTextStaff]}>
              {formatActorRole(entry.actor_role, t)}
            </Text>
          </View>
          {showBranch && entry.branch_name ? (
            <Text style={styles.branch}>· {branchDisplayName(entry.branch_name)}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <View>
      {!isFirst ? <View style={styles.divider} /> : null}
      {onPress ? (
        <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  );
}

export default function ActivityScreen() {
  const { token, user } = useAuth();
  const { selectedBranchId, showBranchFilter } = useBranchScope();
  const { colors: c, theme } = useTheme();
  const { language } = usePreferences();
  const isLight = theme === 'light';
  const { t } = useTranslation();
  const router = useRouter();
  const { pagePadding } = useResponsiveLayout();
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    filters: { paddingTop: 12, paddingBottom: 10 },
    listWrap: { flex: 1 },
    statusMeta: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.dim,
      marginBottom: 10,
      letterSpacing: -0.1,
    },
    listCard: {
      flex: 1,
      paddingVertical: 4,
      paddingHorizontal: 0,
      overflow: 'hidden' as const,
    },
    listContent: { paddingBottom: 24, flexGrow: 1 },
    emptyWrap: { paddingVertical: 8 },
  }));

  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const showBranchOnRows = showBranchFilter && selectedBranchId === 'all';
  const [actorFilter, setActorFilter] = useState<ActorFilter>('all');
  const canViewActivity = Boolean(user && isGymOwner(user.role));
  const lang = language || 'en';

  const query = useInfiniteQuery({
    queryKey: ['activity', actorFilter, branchKey],
    queryFn: ({ pageParam = 1 }) =>
      fetchActivityLogs(token!, {
        page: pageParam,
        limit: 25,
        actor: actorFilter,
        ...(selectedBranchId !== 'all' ? { branch_id: selectedBranchId } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: Boolean(token && canViewActivity),
  });

  const actorOptions = ACTOR_OPTION_KEYS.map((o) => ({ ...o, label: t(o.labelKey) }));
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  const filterLabel = useMemo(() => {
    if (actorFilter === 'all') return t('activity.everyone');
    if (actorFilter === 'staff') return t('activity.staffOnly');
    return t('activity.ownerOnly');
  }, [actorFilter, t]);

  const statusLine =
    total > 0
      ? t('activity.statusLine', { count: total, filter: filterLabel })
      : t('activity.statusLineEmpty');

  if (!canViewActivity) {
    return <Redirect href="/(tabs)/more" />;
  }

  return (
    <TabScreenFrame>
      <View style={styles.container}>
        <BranchFilterBar horizontalPadding={pagePadding} />
        <View style={[styles.filters, { paddingHorizontal: pagePadding }]}>
          <FilterPickerButton
            label={t('activity.filterLabel')}
            sheetTitle={t('activity.filterLabel')}
            value={actorFilter}
            onChange={setActorFilter}
            options={actorOptions.map((o) => ({ value: o.value, label: o.label }))}
          />
        </View>

        {query.isLoading ? (
          <PageSkeleton variant="activity" />
        ) : query.isError ? (
          <LoadError
            message={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <View style={[styles.listWrap, { paddingHorizontal: pagePadding }]}>
            {items.length > 0 ? <Text style={styles.statusMeta}>{statusLine}</Text> : null}
            <SoftSurface variant="panel" flat style={styles.listCard}>
              <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item, index }) => (
                  <ActivityItem
                    entry={item}
                    showBranch={showBranchOnRows}
                    isFirst={index === 0}
                    isLight={isLight}
                    language={lang}
                    onPress={
                      isRowClickable(item)
                        ? () => openActivityTarget(item, router)
                        : undefined
                    }
                  />
                )}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={pullRefreshing(query.isRefetching, query.isFetchingNextPage)}
                    onRefresh={() => query.refetch()}
                    tintColor={c.accentText}
                  />
                }
                onEndReached={() => {
                  if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
                }}
                onEndReachedThreshold={0.4}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <EmptyState
                      icon="time-outline"
                      title={t('activity.emptyTitle')}
                      body={t('activity.emptyBody')}
                    />
                  </View>
                }
                ListFooterComponent={query.isFetchingNextPage ? <ListFooterSkeleton /> : null}
              />
            </SoftSurface>
          </View>
        )}
      </View>
    </TabScreenFrame>
  );
}
