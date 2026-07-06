import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchActivityLogs } from '@/src/api/activity';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { FilterPickerButton } from '@/src/components/FilterPickerButton';
import { useBranchScope } from '@/src/context/BranchContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { formatDisplayDateTime } from '@/src/utils/date';
import { formatAuditAction, formatAuditDetails, formatActorRole } from '@/src/utils/activityLabels';
import { useTranslation } from 'react-i18next';
import { isGymOwner } from '@/src/utils/roles';
import type { ActivityLogRow } from '@/src/types/api';

type ActorFilter = 'all' | 'owner' | 'staff';

const ACTOR_OPTION_KEYS: { value: ActorFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'activity.everyone' },
  { value: 'staff', labelKey: 'activity.staffOnly' },
  { value: 'owner', labelKey: 'activity.ownerOnly' },
];

function ActivityItem({ entry }: { entry: ActivityLogRow }) {
  const styles = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 8 },
    action: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: c.text },
    time: { fontSize: 11, color: c.dim },
    entity: { marginTop: 6, fontSize: 14, color: c.muted },
    details: { marginTop: 4, fontSize: 13, color: c.text },
    actor: { marginTop: 8, fontSize: 12, color: c.dim },
  }));

  const details = formatAuditDetails(entry);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.action}>{formatAuditAction(entry.action)}</Text>
        <Text style={styles.time}>{formatDisplayDateTime(entry.created_at)}</Text>
      </View>
      {entry.entity_label ? <Text style={styles.entity}>{entry.entity_label}</Text> : null}
      {details ? <Text style={styles.details}>{details}</Text> : null}
      <Text style={styles.actor}>
        {entry.actor_name || entry.actor_email} · {formatActorRole(entry.actor_role)}
        {entry.branch_name ? ` · ${entry.branch_name}` : ''}
      </Text>
    </View>
  );
}

export default function ActivityScreen() {
  const { token, user } = useAuth();
  const { selectedBranchId } = useBranchScope();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    filters: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
    list: { padding: 16, paddingBottom: 24 },
    empty: { textAlign: 'center' as const, color: colors.dim, marginTop: 40, fontSize: 15 },
  }));

  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
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
    <View style={styles.container}>
      <BranchFilterBar />
      <View style={styles.filters}>
        <FilterPickerButton
          label={t('activity.filterLabel')}
          sheetTitle={t('activity.filterLabel')}
          value={actorFilter}
          onChange={setActorFilter}
          options={actorOptions.map((o) => ({ value: o.value, label: o.label }))}
        />
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.accentText} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ActivityItem entry={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.accentText} />
          }
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={styles.empty}>{t('activity.empty')}</Text>}
          ListFooterComponent={
            query.isFetchingNextPage ? <ActivityIndicator color={c.accentText} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}
    </View>
  );
}
