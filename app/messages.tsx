import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import { ListFooterSkeleton, PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchMemberSms } from '@/src/api/memberSms';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { FilterPickerButton } from '@/src/components/FilterPickerButton';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { EmptyState } from '@/src/components/EmptyState';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useBranchScope } from '@/src/context/BranchContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { formatDisplayDateTime } from '@/src/utils/date';
import {
  SMS_TYPE_FILTER_KEYS,
  formatSmsPreview,
  formatSmsType,
  smsTypeAccent,
} from '@/src/utils/smsLabels';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import { statusWashOpaque } from '@/src/utils/statusWash';
import { useTranslation } from 'react-i18next';
import { isGymOwner } from '@/src/utils/roles';
import type { MemberSmsRow } from '@/src/types/api';

type SmsFilter = (typeof SMS_TYPE_FILTER_KEYS)[number]['value'];

function SmsItem({
  row,
  token,
  multiColumn,
  columnStyle,
  showBranch,
  typeFiltered,
  onPress,
}: {
  row: MemberSmsRow;
  token: string;
  multiColumn?: boolean;
  columnStyle?: object;
  showBranch?: boolean;
  typeFiltered?: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const accent = smsTypeAccent(row.message_type, c);
  const preview = typeFiltered ? '' : formatSmsPreview(row.message_type, t);
  const phone = row.recipient_phone || row.member_phone || '—';
  const branch = row.branch_name ? branchDisplayName(row.branch_name) : null;

  const styles = useThemedStyles((colors) => ({
    card: {
      paddingVertical: 13,
      paddingHorizontal: 14,
      marginBottom: 10,
    },
    cardColumn: { marginBottom: 0 },
    row: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12 },
    body: { flex: 1, minWidth: 0 },
    header: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8 },
    member: { flex: 1, fontSize: 15, fontWeight: '600' as const, color: colors.text },
    time: { fontSize: 11, color: colors.dim, marginTop: 2 },
    badge: {
      alignSelf: 'flex-start' as const,
      marginTop: 7,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: statusWashOpaque(accent, colors.card, 0.14),
      borderColor: statusWashOpaque(accent, colors.cardEdge, 0.4),
    },
    badgeText: { fontSize: 12, fontWeight: '600' as const, color: accent },
    preview: { marginTop: 6, fontSize: 12, lineHeight: 16, color: colors.muted },
    meta: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 16,
      color: colors.dim,
    },
    chevron: { marginTop: 10 },
  }));

  const metaParts = [phone];
  if (showBranch && branch) metaParts.push(branch);
  const metaLine = metaParts.join(' · ');

  return (
    <SoftSurface
      onPress={onPress}
      style={[styles.card, multiColumn && styles.cardColumn, multiColumn && columnStyle]}
      accessibilityRole="button"
      accessibilityLabel={`${row.member_name}, ${formatSmsType(row.message_type, t)}`}
    >
      <View style={styles.row}>
        <MemberPhoto
          memberId={row.member_id}
          name={row.member_name || '?'}
          token={token}
          size={40}
          hasPhoto={Boolean(row.member_photo_url)}
        />
        <View style={styles.body}>
          <View style={styles.header}>
            <Text listRow style={styles.member} numberOfLines={1}>
              {row.member_name}
            </Text>
            <Text style={styles.time}>{formatDisplayDateTime(row.sent_at)}</Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formatSmsType(row.message_type, t)}</Text>
          </View>

          {preview ? <Text style={styles.preview}>{preview}</Text> : null}

          <Text latin style={styles.meta} numberOfLines={1}>
            {metaLine}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={c.dim} style={styles.chevron} />
      </View>
    </SoftSurface>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { selectedBranchId, showBranchFilter } = useBranchScope();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { pagePadding, listColumnItemStyle } = useResponsiveLayout();
  const listColumns = 1;
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    filters: { paddingTop: 10, paddingBottom: 6, gap: 8 },
    list: { paddingBottom: 24, paddingTop: 6 },
    columnWrap: { gap: 10 },
    statusLine: { fontSize: 13, color: colors.dim, marginBottom: 8 },
  }));

  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const [typeFilter, setTypeFilter] = useState<SmsFilter>('all');
  const canViewMessages = Boolean(user && isGymOwner(user.role));
  const typeFiltered = typeFilter !== 'all';

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

  const typeOptions = useMemo(
    () =>
      SMS_TYPE_FILTER_KEYS.map((f) => ({
        value: f.value,
        label: t(f.labelKey),
        color: f.value === 'all' ? c.statusNeutral : smsTypeAccent(f.value, c),
      })),
    [t, c],
  );

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total;

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
          <PageSkeleton variant="messages" />
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
            ListHeaderComponent={
              items.length > 0 && total != null ? (
                <Text style={styles.statusLine}>
                  {t('messages.statusLine', { count: total })}
                </Text>
              ) : null
            }
            renderItem={({ item }) => (
              <SmsItem
                row={item}
                token={token!}
                multiColumn={listColumns > 1}
                columnStyle={listColumnItemStyle}
                showBranch={showBranchFilter && selectedBranchId === 'all'}
                typeFiltered={typeFiltered}
                onPress={() => router.push(`/member/${item.member_id}`)}
              />
            )}
            contentContainerStyle={[styles.list, { paddingHorizontal: pagePadding }]}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => query.refetch()}
                tintColor={c.accentText}
              />
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
            ListFooterComponent={query.isFetchingNextPage ? <ListFooterSkeleton /> : null}
          />
        )}
      </View>
    </TabScreenFrame>
  );
}
