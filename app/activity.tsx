import { Redirect } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
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
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { formatDisplayDateTime } from '@/src/utils/date';
import { formatAuditAction, formatAuditDetails, formatActorRole } from '@/src/utils/activityLabels';
import { useTranslation } from 'react-i18next';
import { isGymOwner } from '@/src/utils/roles';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import type { ActivityLogRow } from '@/src/types/api';

type ActorFilter = 'all' | 'owner' | 'staff';

const ACTOR_OPTION_KEYS: { value: ActorFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'activity.everyone' },
  { value: 'staff', labelKey: 'activity.staffOnly' },
  { value: 'owner', labelKey: 'activity.ownerOnly' },
];

function ActivityItem({
  entry,
  multiColumn,
  columnStyle,
  showBranch,
}: {
  entry: ActivityLogRow;
  multiColumn?: boolean;
  columnStyle?: object;
  showBranch?: boolean;
}) {
  const { t } = useTranslation();
  const isOwner = entry.actor_role === 'Gym Owner';
  const styles = useThemedStyles((theme) => ({
    card: {
      padding: 14,
      marginBottom: 12,
    },
    cardColumn: { marginBottom: 0 },
    cardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 8 },
    action: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: theme.text },
    time: { fontSize: 11, color: theme.dim },
    entity: { marginTop: 6, fontSize: 14, color: theme.muted },
    details: { marginTop: 4, fontSize: 13, color: theme.text },
    actorRow: {
      marginTop: 8,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    actorName: { fontSize: 12, fontWeight: '600' as const, color: theme.muted },
    roleBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    roleBadgeOwner: {
      backgroundColor: 'rgba(100, 116, 139, 0.18)',
      borderColor: 'rgba(100, 116, 139, 0.35)',
    },
    roleBadgeStaff: {
      backgroundColor: 'rgba(249, 115, 22, 0.12)',
      borderColor: 'rgba(249, 115, 22, 0.28)',
    },
    roleBadgeText: { fontSize: 10, fontWeight: '700' as const },
    roleBadgeTextOwner: { color: theme.statusNeutral },
    roleBadgeTextStaff: { color: theme.statusUnpaid },
    branch: { fontSize: 12, color: theme.dim },
  }));

  const details = formatAuditDetails(entry, t);

  return (
    <SoftSurface style={[styles.card, multiColumn && styles.cardColumn, multiColumn && columnStyle]}>
      <View style={styles.cardHeader}>
        <Text style={styles.action}>{formatAuditAction(entry.action, t)}</Text>
        <Text style={styles.time}>{formatDisplayDateTime(entry.created_at)}</Text>
      </View>
      {entry.entity_label ? <Text style={styles.entity}>{entry.entity_label}</Text> : null}
      {details ? <Text style={styles.details}>{details}</Text> : null}
      <View style={styles.actorRow}>
        <Text style={styles.actorName}>{entry.actor_name || entry.actor_email}</Text>
        <View style={[styles.roleBadge, isOwner ? styles.roleBadgeOwner : styles.roleBadgeStaff]}>
          <Text style={[styles.roleBadgeText, isOwner ? styles.roleBadgeTextOwner : styles.roleBadgeTextStaff]}>
            {formatActorRole(entry.actor_role, t)}
          </Text>
        </View>
        {showBranch && entry.branch_name ? (
          <Text style={styles.branch}>· {branchDisplayName(entry.branch_name)}</Text>
        ) : null}
      </View>
    </SoftSurface>
  );
}

export default function ActivityScreen() {
  const { token, user } = useAuth();
  const { selectedBranchId, showBranchFilter } = useBranchScope();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { pagePadding, listColumnItemStyle } = useResponsiveLayout();
  const listColumns = 1;
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    filters: { paddingTop: 12, paddingBottom: 14 },
    list: { paddingTop: 4, paddingBottom: 24 },
    columnWrap: { gap: 10 },
    empty: { textAlign: 'center' as const, color: colors.dim, marginTop: 40, fontSize: 15 },
  }));

  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const showBranchOnRows = showBranchFilter && selectedBranchId === 'all';
  const [actorFilter, setActorFilter] = useState<ActorFilter>('all');
  const canViewActivity = Boolean(user && isGymOwner(user.role));

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
        <FlatList
          key={`activity-cols-${listColumns}`}
          data={items}
          numColumns={listColumns}
          columnWrapperStyle={listColumns > 1 ? styles.columnWrap : undefined}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ActivityItem
              entry={item}
              multiColumn={listColumns > 1}
              columnStyle={listColumnItemStyle}
              showBranch={showBranchOnRows}
            />
          )}
          contentContainerStyle={[styles.list, { paddingHorizontal: pagePadding }]}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.accentText} />
          }
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title={t('activity.emptyTitle')}
              body={t('activity.emptyBody')}
            />
          }
          ListFooterComponent={
            query.isFetchingNextPage ? <ListFooterSkeleton /> : null
          }
        />
      )}
    </View>
    </TabScreenFrame>
  );
}
