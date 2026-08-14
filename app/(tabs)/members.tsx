import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { UNDO_DELAY_MS } from '@/src/utils/scheduleWithUndo';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import StatusBadge from '@/src/components/StatusBadge';
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

const FILTER_OPTIONS: MemberFilter[] = ['all', 'active', 'unpaid', 'due_soon', 'expired'];

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
    all: c.statusNeutral,
    active: c.statusActive,
    unpaid: c.statusUnpaid,
    due_soon: c.statusDueSoon,
    expired: c.statusExpired,
    former: c.statusNeutral,
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
              <Pressable
                onPress={onRestore}
                disabled={restoreBusy}
                hitSlop={8}
                style={styles.restoreHit}
              >
                <Text style={styles.restore}>{t('members.restore')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {multiColumn ? (
        <View style={styles.rowMetaStacked}>
          <StatusBadge status={isFormer ? 'Former' : member.status} />
          <Text style={[styles.plan, styles.planStacked]} numberOfLines={1}>
            {member.plan_name || t('members.noPlan')}
          </Text>
          {member.is_unpaid && !isFormer ? <Text style={styles.unpaid}>{t('members.unpaidBadge')}</Text> : null}
          {isFormer && canRestore && onRestore ? (
            <Pressable onPress={onRestore} disabled={restoreBusy} hitSlop={8}>
              <Text style={styles.restore}>{t('members.restore')}</Text>
            </Pressable>
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
  const [filter, setFilter] = useState<MemberFilter>(() => parseFilter(params.filter));
  const [sort, setSort] = useState<MemberSortId>(DEFAULT_MEMBER_SORT);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [restoreBusyId, setRestoreBusyId] = useState<number | null>(null);
  const filterScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setFilter(parseFilter(params.filter));
  }, [params.filter, params.focus]);

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

  const members = query.data?.pages.flatMap((p) => p.items) ?? [];
  const counts = countsQuery.data;

  useEffect(() => {
    const first = query.data?.pages[0];
    if (!first) return;
    if (filter !== 'former' && first.archivedTotal != null) {
      setArchivedTotal(first.archivedTotal);
    } else if (filter === 'former' && !debouncedSearch) {
      setArchivedTotal(first.total);
    }
  }, [query.data, filter, debouncedSearch]);

  const showingFormer = filter === 'former';
  const showFormerChip = archivedTotal > 0 || showingFormer;
  const filterOptions: MemberFilter[] = showFormerChip ? [...FILTER_OPTIONS, 'former'] : FILTER_OPTIONS;

  const filterCounts: Record<MemberFilter, number> = {
    all: counts?.totalMembers ?? 0,
    active: counts?.activeMembers ?? 0,
    due_soon: counts?.dueSoonMembers ?? 0,
    expired: counts?.expiredMembers ?? 0,
    unpaid: counts?.unpaidCount ?? 0,
    former: archivedTotal,
  };

  const canRestoreMembers = owner && !readOnly;

  const runRestore = async (member: MemberRow) => {
    if (!token) return;
    setRestoreBusyId(member.id);
    try {
      await restoreMember(token, member.id);
      setFilter('all');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['member', member.id] }),
      ]);
      showFlash({
        title: t('flash.memberRestored.title'),
        subtitle: t('flash.memberRestored.subtitle', { name: member.name }),
        durationMs: UNDO_DELAY_MS,
        urgent: true,
        actionHint: t('flash.undoHint'),
        action: {
          label: t('common.undo'),
          onPress: () => {
            void (async () => {
              try {
                await deleteMember(token, member.id);
                setFilter('former');
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['members'] }),
                  queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
                  queryClient.invalidateQueries({ queryKey: ['member', member.id] }),
                ]);
                showFlash({
                  title: t('flash.memberRestoreUndone.title'),
                  subtitle: t('flash.memberRestoreUndone.subtitle', { name: member.name }),
                });
              } catch (err) {
                showFlash({
                  title: err instanceof Error ? err.message : t('member.restoreFailed'),
                  variant: 'danger',
                });
              }
            })();
          },
        },
      });
    } catch (err) {
      showFlash({
        title: err instanceof Error ? err.message : t('member.restoreFailed'),
        variant: 'danger',
      });
    } finally {
      setRestoreBusyId(null);
    }
  };

  const renderStatusChip = (option: MemberFilter) => (
    <FilterChip
      key={option}
      label={t(FILTER_LABEL_KEYS[option])}
      selected={filter === option}
      onPress={() => setFilter(option)}
      dotColor={filterDotColor(c, option)}
      count={filterCounts[option]}
    />
  );

  const statusChips = (
    <>
      {FILTER_OPTIONS.map(renderStatusChip)}
      {showFormerChip ? (
        <>
          <View style={styles.chipDivider} />
          {renderStatusChip('former')}
        </>
      ) : null}
    </>
  );

  useEffect(() => {
    const index = filterOptions.indexOf(filter);
    if (index < 0) return;
    requestAnimationFrame(() => {
      if (index >= filterOptions.length - 2) {
        filterScrollRef.current?.scrollToEnd({ animated: true });
        return;
      }
      filterScrollRef.current?.scrollTo({
        x: Math.max(0, index * 72 - 16),
        animated: true,
      });
    });
  }, [filter, showFormerChip]);

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
              restoreBusy={restoreBusyId === item.id}
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
      alignItems: 'center' as const,
      gap: 12,
    },
    rowMain: { flex: 1, marginRight: 8, minWidth: 0 },
    name: { fontSize: 16, fontWeight: '600' as const, color: c.text },
    phone: { marginTop: 4, fontSize: 13, color: c.muted },
    branch: { marginTop: 2, fontSize: 12, color: c.dim },
    rowMeta: { alignItems: 'flex-end' as const },
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
    restoreHit: { marginTop: 8 },
    restore: { marginTop: 2, fontSize: 13, fontWeight: '700' as const, color: c.accentText },
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
