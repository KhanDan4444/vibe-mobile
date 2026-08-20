import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppText as Text } from '@/src/components/AppText';
import { ListFooterSkeleton, PageSkeleton } from '@/src/components/Skeleton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchDashboard } from '@/src/api/dashboard';
import { fetchArchivedMembers, fetchMembers, restoreMember, deleteMember, type MemberListParams } from '@/src/api/members';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { SortPicker } from '@/src/components/SortPicker';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { EmptyState } from '@/src/components/EmptyState';
import { useBranchScope } from '@/src/context/BranchContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useFlash } from '@/src/context/FlashContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { restoreWithUndoFlash } from '@/src/utils/scheduleWithUndo';
import { adjustMemberFilterCounts } from '@/src/utils/memberFilterCounts';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import StatusBadge from '@/src/components/StatusBadge';
import { RowActionLink } from '@/src/components/RowActionLink';
import { SecondaryButton } from '@/src/components/ui/Button';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { FilterChip } from '@/src/components/FilterChip';
import { SearchField } from '@/src/components/SearchField';
import { type ThemeColors } from '@/src/theme/tokens';
import { fabElevation } from '@/src/theme/elevation';
import { DEFAULT_MEMBER_SORT, MEMBER_SORT_OPTIONS, type MemberSortId } from '@/src/utils/listSort';
import { isGymOwner } from '@/src/utils/roles';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import { formatDisplayDate } from '@/src/utils/date';
import type { MemberRow } from '@/src/types/api';

type MemberFilter = 'all' | 'active' | 'due_soon' | 'expired' | 'unpaid' | 'former';

const FILTER_OPTIONS: MemberFilter[] = ['all', 'active', 'unpaid', 'due_soon', 'expired', 'former'];
const MEMBER_FILTER_STORAGE_KEY = 'vibe.members.statusFilter';

const FILTER_LABEL_KEYS: Record<MemberFilter, string> = {
  all: 'members.filterAll',
  active: 'members.filterActive',
  due_soon: 'members.filterDueSoon',
  expired: 'members.filterExpired',
  unpaid: 'members.filterUnpaid',
  former: 'members.filterFormer',
};

function filterDotColor(c: ThemeColors, option: MemberFilter) {
  const dots: Record<MemberFilter, string> = {
    all: c.dim,
    active: c.statusActive,
    unpaid: c.statusUnpaid,
    due_soon: c.statusDueSoon,
    expired: c.statusExpired,
    former: c.statusFormer,
  };
  return dots[option];
}

function parseFilter(value: string | string[] | undefined): MemberFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'active' || raw === 'due_soon' || raw === 'expired' || raw === 'unpaid' || raw === 'former') {
    return raw;
  }
  return 'all';
}

function RestoreAction({
  label,
  colors,
  busy,
  onPress,
}: {
  label: string;
  colors: ThemeColors;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <RowActionLink
      label={label}
      icon="arrow-undo-outline"
      color={colors.statusActive}
      busy={busy}
      onPress={onPress}
    />
  );
}

function MemberRowItem({
  member,
  onPress,
  styles,
  showBranch,
  token,
  multiColumn,
  colors,
  columnStyle,
  canRestore,
  restoreBusy,
  onRestore,
}: {
  member: MemberRow;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  showBranch?: boolean;
  token: string;
  multiColumn?: boolean;
  colors: ThemeColors;
  columnStyle?: object;
  canRestore?: boolean;
  restoreBusy?: boolean;
  onRestore?: () => void;
}) {
  const { t } = useTranslation();
  const isFormer = Boolean(member.deleted_at);
  return (
    <SoftSurface
      onPress={onPress}
      style={[styles.row, multiColumn && styles.rowColumn, multiColumn && columnStyle, multiColumn && styles.rowStacked]}
    >
      <View style={styles.rowTop}>
        <MemberPhoto
          memberId={member.id}
          name={member.name}
          token={token}
          size={multiColumn ? 40 : 44}
          hasPhoto={Boolean(member.photo_url)}
        />
        <View style={styles.rowMain}>
          <Text listRow style={styles.name} numberOfLines={1}>
            {member.name}
          </Text>
          <Text style={styles.phone} numberOfLines={1}>
            {member.phone || '—'}
          </Text>
          {isFormer ? (
            <Text style={styles.removed} numberOfLines={1}>
              {t('members.removedOnDate', { date: formatDisplayDate(member.deleted_at) })}
            </Text>
          ) : null}
          {showBranch && member.branch_name ? (
            <Text style={styles.branch} numberOfLines={1}>
              {branchDisplayName(member.branch_name)}
            </Text>
          ) : null}
        </View>
        {!multiColumn ? (
          <View style={styles.rowMeta}>
            <StatusBadge status={isFormer ? 'Former' : member.status} />
            {member.is_unpaid && !isFormer ? <Text style={styles.unpaid}>{t('members.unpaidBadge')}</Text> : null}
            {isFormer && canRestore && onRestore ? (
              <RestoreAction
                label={t('members.restore')}
                colors={colors}
                busy={restoreBusy}
                onPress={onRestore}
              />
            ) : null}
          </View>
        ) : null}
      </View>
      {multiColumn ? (
        <View style={styles.rowMetaStacked}>
          <StatusBadge status={isFormer ? 'Former' : member.status} />
          <Text style={[styles.plan, styles.planStacked]} numberOfLines={1}>
            {member.plan_name || t('members.noPlan')}
            {member.trainer_name ? ` · ${member.trainer_name}` : ''}
          </Text>
          {member.is_unpaid && !isFormer ? <Text style={styles.unpaid}>{t('members.unpaidBadge')}</Text> : null}
          {isFormer && canRestore && onRestore ? (
            <RestoreAction
              label={t('members.restore')}
              colors={colors}
              busy={restoreBusy}
              onPress={onRestore}
            />
          ) : null}
        </View>
      ) : null}
    </SoftSurface>
  );
}

function filterToParams(filter: MemberFilter): Pick<MemberListParams, 'filter' | 'status'> {
  if (filter === 'active') return { status: 'active' };
  if (filter === 'all' || filter === 'former') return {};
  return { filter };
}

export default function MembersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string; focus?: string }>();
  const { token, user } = useAuth();
  const { selectedBranchId } = useBranchScope();
  const { readOnly } = useGymReadOnly();
  const { showFlash } = useFlash();
  const queryClient = useQueryClient();
  const owner = isGymOwner(user?.role);
  const showBranchColumn = owner && selectedBranchId === 'all';
  const { colors: c, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { pagePadding, isTablet, fabRight, fabSize, fabRadius, fabFontSize, listColumnItemStyle } = useResponsiveLayout();
  // Members read better as a full-width list (photo + status row), not a 2-col grid.
  const listColumns = 1;
  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const paramFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const [filter, setFilter] = useState<MemberFilter>(() => parseFilter(paramFilter));
  const [filterReady, setFilterReady] = useState(() => Boolean(paramFilter));
  const [sort, setSort] = useState<MemberSortId>(DEFAULT_MEMBER_SORT);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [pendingRestoreIds, setPendingRestoreIds] = useState<Set<number>>(() => new Set());
  const filterScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (paramFilter) {
      setFilter(parseFilter(paramFilter));
      setFilterReady(true);
      return;
    }
    let cancelled = false;
    AsyncStorage.getItem(MEMBER_FILTER_STORAGE_KEY)
      .then((saved) => {
        if (!cancelled && saved) setFilter(parseFilter(saved));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFilterReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [paramFilter, params.focus]);

  useEffect(() => {
    if (!filterReady) return;
    AsyncStorage.setItem(MEMBER_FILTER_STORAGE_KEY, filter).catch(() => {});
  }, [filter, filterReady]);

  useEffect(() => {
    if (!params.focus) return;
    setSearch('');
    setDebouncedSearch('');
  }, [params.focus]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const listParams: MemberListParams = {
    page: 1,
    limit: 30,
    search: debouncedSearch || undefined,
    sort,
    ...filterToParams(filter),
    ...(selectedBranchId !== 'all' ? { branch_id: selectedBranchId } : {}),
  };

  const query = useInfiniteQuery({
    queryKey: ['members', debouncedSearch, filter, sort, branchKey],
    queryFn: ({ pageParam = 1 }) => {
      const pageParams = { ...listParams, page: pageParam };
      if (filter === 'former') {
        return fetchArchivedMembers(token!, {
          page: pageParam,
          limit: listParams.limit,
          search: listParams.search,
          branch_id: listParams.branch_id,
        });
      }
      return fetchMembers(token!, pageParams);
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: Boolean(token),
  });

  const countsQuery = useQuery({
    queryKey: ['dashboard', branchKey],
    queryFn: () => fetchDashboard(token!, selectedBranchId),
    enabled: Boolean(token),
  });

  const listedMembers = query.data?.pages.flatMap((p) => p.items) ?? [];
  const members = listedMembers.filter((m) => !(filter === 'former' && pendingRestoreIds.has(m.id)));
  const counts = countsQuery.data;

  useEffect(() => {
    const first = query.data?.pages[0];
    if (!first) return;
    if (filter === 'former') {
      if (!debouncedSearch) setArchivedTotal(first.total);
      return;
    }
    if (first.archivedTotal != null) {
      setArchivedTotal(first.archivedTotal);
      return;
    }
    if (!token) return;
    let cancelled = false;
    fetchArchivedMembers(token, {
      page: 1,
      limit: 1,
      ...(selectedBranchId !== 'all' ? { branch_id: selectedBranchId } : {}),
    })
      .then((data) => {
        if (!cancelled) setArchivedTotal(data.total ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [query.data, filter, debouncedSearch, token, selectedBranchId]);

  const showingFormer = filter === 'former';
  const adjustedCounts = adjustMemberFilterCounts(
    {
      all: counts?.totalMembers ?? 0,
      active: counts?.activeMembers ?? 0,
      unpaid: counts?.unpaidCount ?? 0,
      dueSoon: counts?.dueSoonMembers ?? 0,
      expired: counts?.expiredMembers ?? 0,
      former: archivedTotal,
    },
    {
      pendingRestores: showingFormer
        ? listedMembers.filter((m) => pendingRestoreIds.has(m.id))
        : [],
    },
  );
  const filterCounts: Record<MemberFilter, number> = {
    all: adjustedCounts.all,
    active: adjustedCounts.active,
    due_soon: adjustedCounts.dueSoon,
    expired: adjustedCounts.expired,
    unpaid: adjustedCounts.unpaid,
    former: adjustedCounts.former,
  };

  const canRestoreMembers = owner && !readOnly;

  const runRestore = (member: MemberRow) => {
    if (!token || pendingRestoreIds.has(member.id)) return;
    setPendingRestoreIds((prev) => new Set(prev).add(member.id));
    const refresh = () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['member', member.id] }),
      ]);
    restoreWithUndoFlash({
      showFlash,
      t,
      name: member.name,
      restore: () => restoreMember(token, member.id),
      rearchive: () => deleteMember(token, member.id),
      onRestored: () => {
        void refresh();
      },
      onRearchived: () => {
        setPendingRestoreIds((prev) => {
          const next = new Set(prev);
          next.delete(member.id);
          return next;
        });
        void refresh();
      },
      onFailed: () => {
        setPendingRestoreIds((prev) => {
          const next = new Set(prev);
          next.delete(member.id);
          return next;
        });
      },
    });
  };

  const renderStatusChip = (option: MemberFilter) => (
    <FilterChip
      key={option}
      label={t(FILTER_LABEL_KEYS[option])}
      selected={filter === option}
      onPress={() => {
        setFilter(option);
        router.setParams({ filter: option });
      }}
      dotColor={filterDotColor(c, option)}
      selectedColor={option === 'former' ? c.statusFormer : undefined}
      count={filterCounts[option]}
    />
  );

  const statusChips = (
    <>
      {FILTER_OPTIONS.filter((option) => option !== 'former').map(renderStatusChip)}
      <View style={styles.chipDivider} />
      {renderStatusChip('former')}
    </>
  );

  useEffect(() => {
    const index = FILTER_OPTIONS.indexOf(filter);
    if (index < 0) return;
    requestAnimationFrame(() => {
      if (index >= FILTER_OPTIONS.length - 2) {
        filterScrollRef.current?.scrollToEnd({ animated: true });
        return;
      }
      filterScrollRef.current?.scrollTo({
        x: Math.max(0, index * 72 - 16),
        animated: true,
      });
    });
  }, [filter]);

  return (
    <TabScreenFrame>
    <View style={styles.container}>
      <BranchFilterBar horizontalPadding={pagePadding} />
      <View style={[styles.toolbar, { paddingHorizontal: pagePadding }]}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder={showingFormer ? t('members.searchFormer') : t('members.search')}
        />

        {isTablet ? (
          <View style={[styles.filters, styles.filtersWrap]}>
            {statusChips}
          </View>
        ) : (
          <ScrollView
            ref={filterScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.filterScroll, { marginHorizontal: -pagePadding }]}
            contentContainerStyle={[styles.filters, { paddingHorizontal: pagePadding }]}
          >
            {statusChips}
          </ScrollView>
        )}

        {!showingFormer ? (
        <View style={styles.sortRow}>
          <SortPicker label={t('members.sort')} options={MEMBER_SORT_OPTIONS} value={sort} onChange={setSort} />
        </View>
        ) : null}
      </View>

      {query.isLoading ? (
        <PageSkeleton variant="list-rows" />
      ) : query.isError ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>
            {userFacingApiMessage(query.error, t('gymBoot.errorBody'), t('gymBoot.errorBody'))}
          </Text>
          <SecondaryButton label={t('gymBoot.retry')} onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          key={`members-cols-${listColumns}`}
          data={members}
          numColumns={listColumns}
          columnWrapperStyle={listColumns > 1 ? styles.columnWrap : undefined}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <MemberRowItem
              member={item}
              styles={styles}
              showBranch={showBranchColumn}
              token={token!}
              multiColumn={listColumns > 1}
              columnStyle={listColumnItemStyle}
              colors={c}
              canRestore={canRestoreMembers}
              restoreBusy={pendingRestoreIds.has(item.id)}
              onRestore={
                canRestoreMembers && item.deleted_at
                  ? () => void runRestore(item)
                  : undefined
              }
              onPress={() => router.push(`/member/${item.id}`)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingHorizontal: pagePadding }]}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={
                showingFormer
                  ? t('members.emptyFormer')
                  : filter !== 'all' || debouncedSearch
                    ? t('members.emptyFiltered')
                    : t('members.emptyTitle')
              }
              body={
                showingFormer
                  ? t('members.emptyFormerBody')
                  : filter !== 'all' || debouncedSearch
                    ? t('members.emptyFilteredBody')
                    : t('members.emptyBody')
              }
            />
          }
          ListFooterComponent={query.isFetchingNextPage ? <ListFooterSkeleton /> : null}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
        />
      )}

      {!readOnly && !showingFormer ? (
        <Pressable
          style={[styles.fab, fabElevation(theme), { right: fabRight, width: fabSize, height: fabSize, borderRadius: fabRadius }]}
          onPress={() => router.push('/enroll')}
        >
          <Text style={[styles.fabText, { fontSize: fabFontSize }]}>+</Text>
        </Pressable>
      ) : null}
    </View>
    </TabScreenFrame>
  );
}

function createStyles(c: ThemeColors) {
  return {
    container: { flex: 1, backgroundColor: c.bg },
    toolbar: {
      paddingBottom: 8,
      gap: 8,
    },
    filterScroll: {
      flexGrow: 0,
      marginHorizontal: -16,
    },
    filters: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingRight: 32,
      gap: 6,
    },
    filtersWrap: { flexWrap: 'wrap' as const, rowGap: 6 },
    chipDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'center' as const,
      height: 18,
      backgroundColor: c.border,
      marginHorizontal: 4,
    },
    sortRow: { alignSelf: 'flex-start' as const },
    list: { paddingBottom: 88 },
    columnWrap: { gap: 10 },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: 13,
      paddingHorizontal: 12,
      marginBottom: 10,
      gap: 10,
    },
    rowColumn: {
      marginBottom: 0,
    },
    rowStacked: {
      flexDirection: 'column' as const,
      alignItems: 'stretch' as const,
      gap: 10,
    },
    rowTop: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: 12,
    },
    rowMain: { flex: 1, marginRight: 8, minWidth: 0 },
    name: { fontSize: 16, fontWeight: '600' as const, color: c.text },
    phone: { marginTop: 4, fontSize: 13, color: c.muted },
    branch: { marginTop: 2, fontSize: 12, color: c.dim },
    rowMeta: { alignItems: 'flex-end' as const, gap: 8 },
    rowMetaStacked: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flexWrap: 'wrap' as const,
      gap: 8,
      paddingTop: 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    status: { fontSize: 12, fontWeight: '700' as const, textTransform: 'capitalize' as const },
    plan: { marginTop: 4, fontSize: 12, color: c.dim },
    planStacked: { marginTop: 0 },
    unpaid: { marginTop: 4, fontSize: 11, fontWeight: '700' as const, color: c.statusUnpaid },
    removed: { marginTop: 2, fontSize: 12, color: c.dim },
    empty: { textAlign: 'center' as const, color: c.dim, marginTop: 40, fontSize: 15, alignSelf: 'center' as const, maxWidth: 360 },
    errorWrap: { alignItems: 'center' as const, paddingTop: 48, gap: 12, paddingHorizontal: 24 },
    errorText: { textAlign: 'center' as const, color: c.error, fontSize: 15 },
    fab: {
      position: 'absolute' as const,
      bottom: 24,
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: c.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    fabText: { color: '#fff', fontSize: 26, fontWeight: '300' as const, marginTop: -2 },
  };
}
