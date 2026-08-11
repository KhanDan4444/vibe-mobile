import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { ListFooterSkeleton, PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchMemberSms } from '@/src/api/memberSms';
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
import { SMS_TYPE_FILTER_KEYS, formatSmsType } from '@/src/utils/smsLabels';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import { useTranslation } from 'react-i18next';
import { isGymOwner } from '@/src/utils/roles';
import type { MemberSmsRow } from '@/src/types/api';

type SmsFilter = (typeof SMS_TYPE_FILTER_KEYS)[number]['value'];

function SmsItem({
  row,
  multiColumn,
  columnStyle,
  onPress,
}: {
  row: MemberSmsRow;
  multiColumn?: boolean;
  columnStyle?: object;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles((c) => ({
    card: {
      padding: 14,
      marginBottom: 12,
    },
    cardColumn: { marginBottom: 0 },
    cardHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 8 },
    member: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: c.text },
    time: { fontSize: 11, color: c.dim },
    type: { marginTop: 6, fontSize: 13, color: c.muted },
    phone: { marginTop: 4, fontSize: 13, color: c.text },
    branch: { marginTop: 4, fontSize: 12, color: c.dim },
  }));

  return (
    <SoftSurface
      onPress={onPress}
      style={[styles.card, multiColumn && styles.cardColumn, multiColumn && columnStyle]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.member}>{row.member_name}</Text>
        <Text style={styles.time}>{formatDisplayDateTime(row.sent_at)}</Text>
      </View>
      <Text style={styles.type}>{formatSmsType(row.message_type, t)}</Text>
      <Text style={styles.phone}>{row.recipient_phone || row.member_phone || '—'}</Text>
      {row.branch_name ? <Text style={styles.branch}>{branchDisplayName(row.branch_name)}</Text> : null}
    </SoftSurface>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { selectedBranchId } = useBranchScope();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { pagePadding, listColumnItemStyle } = useResponsiveLayout();
  const listColumns = 1;
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    filters: { paddingTop: 12, paddingBottom: 4 },
    list: { paddingBottom: 24 },
    columnWrap: { gap: 10 },
    empty: { textAlign: 'center' as const, color: colors.dim, marginTop: 40, fontSize: 15 },
  }));

  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const [typeFilter, setTypeFilter] = useState<SmsFilter>('all');
  const canViewMessages = Boolean(user && isGymOwner(user.role));

  const query = useInfiniteQuery({
    queryKey: ['member-sms', typeFilter, branchKey],
    queryFn: ({ pageParam = 1 }) =>
      fetchMemberSms(token!, {
        page: pageParam,
        limit: 25,
        type: typeFilter,
        ...(selectedBranchId !== 'all' ? { branch_id: selectedBranchId } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: Boolean(token && canViewMessages),
  });

  const typeOptions = SMS_TYPE_FILTER_KEYS.map((f) => ({ value: f.value, label: t(f.labelKey) }));

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (!canViewMessages) {
    return <Redirect href="/(tabs)/more" />;
  }

  return (
    <TabScreenFrame>
    <View style={styles.container}>
      <BranchFilterBar horizontalPadding={pagePadding} />
      <View style={[styles.filters, { paddingHorizontal: pagePadding }]}>
        <FilterPickerButton
          label={t('messages.filterLabel')}
          sheetTitle={t('messages.filterLabel')}
          value={typeFilter}
          onChange={setTypeFilter}
          options={typeOptions}
        />
      </View>

      {query.isLoading ? (
        <PageSkeleton variant="list-cards" />
      ) : query.isError ? (
        <LoadError
          message={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          key={`sms-cols-${listColumns}`}
          data={items}
          numColumns={listColumns}
          columnWrapperStyle={listColumns > 1 ? styles.columnWrap : undefined}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <SmsItem
              row={item}
              multiColumn={listColumns > 1}
              columnStyle={listColumnItemStyle}
              onPress={() => router.push(`/member/${item.member_id}`)}
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
              icon="chatbubble-ellipses-outline"
              title={t('messages.emptyTitle')}
              body={t('messages.emptyBody')}
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
