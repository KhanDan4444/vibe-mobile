import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/src/components/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchDashboard } from '@/src/api/dashboard';
import { fetchMembers, type MemberListParams } from '@/src/api/members';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { ReadOnlyBanner } from '@/src/components/ReadOnlyBanner';
import { SortPicker } from '@/src/components/SortPicker';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { useBranchScope } from '@/src/context/BranchContext';
import { useTheme, usePreferences } from '@/src/context/PreferencesContext';
import { appTextStyle } from '@/src/theme/typography';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import type { ThemeColors } from '@/src/theme/tokens';
import { lightTheme } from '@/src/theme/tokens';
import { DEFAULT_MEMBER_SORT, MEMBER_SORT_OPTIONS, type MemberSortId } from '@/src/utils/listSort';
import { isGymOwner } from '@/src/utils/roles';
import type { MemberRow } from '@/src/types/api';

type MemberFilter = 'all' | 'active' | 'due_soon' | 'expired' | 'unpaid';

const FILTER_OPTIONS: MemberFilter[] = ['all', 'active', 'unpaid', 'due_soon', 'expired'];

const FILTER_LABEL_KEYS: Record<MemberFilter, string> = {
  all: 'members.filterAll',
  active: 'members.filterActive',
  due_soon: 'members.filterDueSoon',
  expired: 'members.filterExpired',
  unpaid: 'members.filterUnpaid',
};

const FILTER_COLORS: Record<
  MemberFilter,
  { dot: string; activeBg: string; activeBorder: string; activeText: string }
> = {
  all: {
    dot: lightTheme.statusNeutral,
    activeBg: 'rgba(100,116,139,0.16)',
    activeBorder: lightTheme.statusNeutral,
    activeText: lightTheme.statusNeutral,
  },
  active: {
    dot: lightTheme.statusActive,
    activeBg: 'rgba(5,150,105,0.15)',
    activeBorder: lightTheme.statusActive,
    activeText: lightTheme.statusActive,
  },
  unpaid: {
    dot: lightTheme.statusUnpaid,
    activeBg: 'rgba(234,88,12,0.16)',
    activeBorder: lightTheme.statusUnpaid,
    activeText: lightTheme.statusUnpaid,
  },
  due_soon: {
    dot: lightTheme.statusDueSoon,
    activeBg: 'rgba(217,119,6,0.16)',
    activeBorder: lightTheme.statusDueSoon,
    activeText: lightTheme.statusDueSoon,
  },
  expired: {
    dot: lightTheme.statusExpired,
    activeBg: 'rgba(225,29,72,0.16)',
    activeBorder: lightTheme.statusExpired,
    activeText: lightTheme.statusExpired,
  },
};

function parseFilter(value: string | string[] | undefined): MemberFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'active' || raw === 'due_soon' || raw === 'expired' || raw === 'unpaid') return raw;
  return 'all';
}

function statusColor(status: string, c: ThemeColors) {
  const s = status.toLowerCase();
  if (s === 'active') return c.statusActive;
  if (s === 'due soon') return c.statusDueSoon;
  if (s === 'expired') return c.statusExpired;
  return c.statusNeutral;
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
}: {
  member: MemberRow;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  showBranch?: boolean;
  token: string;
  multiColumn?: boolean;
  colors: ThemeColors;
  columnStyle?: object;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      style={[styles.row, multiColumn && styles.rowColumn, multiColumn && columnStyle, multiColumn && styles.rowStacked]}
      onPress={onPress}
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
          <Text style={styles.name} numberOfLines={1}>
            {member.name}
          </Text>
          <Text style={styles.phone} numberOfLines={1}>
            {member.phone || '—'}
          </Text>
          {showBranch && member.branch_name ? (
            <Text style={styles.branch} numberOfLines={1}>
              {member.branch_name}
            </Text>
          ) : null}
        </View>
        {!multiColumn ? (
          <View style={styles.rowMeta}>
            <Text style={[styles.status, { color: statusColor(member.status, colors) }]}>{member.status}</Text>
            <Text style={styles.plan}>{member.plan_name || t('members.noPlan')}</Text>
            {member.is_unpaid ? <Text style={styles.unpaid}>{t('members.unpaidBadge')}</Text> : null}
          </View>
        ) : null}
      </View>
      {multiColumn ? (
        <View style={styles.rowMetaStacked}>
          <Text style={[styles.status, { color: statusColor(member.status, colors) }]}>{member.status}</Text>
          <Text style={[styles.plan, styles.planStacked]} numberOfLines={1}>
            {member.plan_name || t('members.noPlan')}
          </Text>
          {member.is_unpaid ? <Text style={styles.unpaid}>{t('members.unpaidBadge')}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function filterToParams(filter: MemberFilter): Pick<MemberListParams, 'filter' | 'status'> {
  if (filter === 'active') return { status: 'active' };
  if (filter === 'all') return {};
  return { filter };
}

export default function MembersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string; focus?: string }>();
  const { token, user } = useAuth();
  const { selectedBranchId } = useBranchScope();
  const { readOnly } = useGymReadOnly();
  const owner = isGymOwner(user?.role);
  const showBranchColumn = owner && selectedBranchId === 'all';
  const { colors: c } = useTheme();
  const { language } = usePreferences();
  const { t } = useTranslation();
  const styles = createStyles(c);
  const { listColumns, pagePadding, isTablet, fabRight, listColumnItemStyle } = useResponsiveLayout();
  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<MemberFilter>(() => parseFilter(params.filter));
  const [sort, setSort] = useState<MemberSortId>(DEFAULT_MEMBER_SORT);
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
    queryFn: ({ pageParam = 1 }) => fetchMembers(token!, { ...listParams, page: pageParam }),
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
  const filterCounts: Record<MemberFilter, number> = {
    all: counts?.totalMembers ?? 0,
    active: counts?.activeMembers ?? 0,
    due_soon: counts?.dueSoonMembers ?? 0,
    expired: counts?.expiredMembers ?? 0,
    unpaid: counts?.unpaidCount ?? 0,
  };

  return (
    <TabScreenFrame>
    <View style={styles.container}>
      <BranchFilterBar horizontalPadding={pagePadding} />
      <ReadOnlyBanner />
      <View style={[styles.toolbar, { paddingHorizontal: pagePadding }]}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={c.dim} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('members.search')}
            placeholderTextColor={c.dim}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={c.dim} />
            </Pressable>
          ) : null}
        </View>

        {isTablet ? (
          <View style={[styles.filters, styles.filtersWrap]}>
            {FILTER_OPTIONS.map((option) => {
              const active = filter === option;
              const palette = FILTER_COLORS[option];
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.filterChip,
                    active
                      ? { backgroundColor: palette.activeBg, borderColor: palette.activeBorder }
                      : { backgroundColor: c.card, borderColor: c.border },
                  ]}
                  onPress={() => setFilter(option)}
                >
                  <View style={[styles.filterDot, { backgroundColor: palette.dot }]} />
                  <Text
                    style={appTextStyle(language, {
                      ...styles.filterLabel,
                      color: active ? palette.activeText : c.text,
                    })}
                  >
                    {t(FILTER_LABEL_KEYS[option])}
                  </Text>
                  <View
                    style={[
                      styles.filterCountBadge,
                      active
                        ? { backgroundColor: palette.activeBorder }
                        : { backgroundColor: c.border },
                    ]}
                  >
                    <Text
                      style={appTextStyle(language, {
                        ...styles.filterCount,
                        color: active ? '#fff' : c.muted,
                      })}
                    >
                      {filterCounts[option]}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <ScrollView
            ref={filterScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.filterScroll, { marginHorizontal: -pagePadding }]}
            contentContainerStyle={[styles.filters, { paddingHorizontal: pagePadding }]}
          >
            {FILTER_OPTIONS.map((option) => {
              const active = filter === option;
              const palette = FILTER_COLORS[option];
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.filterChip,
                    active
                      ? { backgroundColor: palette.activeBg, borderColor: palette.activeBorder }
                      : { backgroundColor: c.card, borderColor: c.border },
                  ]}
                  onPress={() => setFilter(option)}
                >
                  <View style={[styles.filterDot, { backgroundColor: palette.dot }]} />
                  <Text
                    style={appTextStyle(language, {
                      ...styles.filterLabel,
                      color: active ? palette.activeText : c.text,
                    })}
                  >
                    {t(FILTER_LABEL_KEYS[option])}
                  </Text>
                  <View
                    style={[
                      styles.filterCountBadge,
                      active
                        ? { backgroundColor: palette.activeBorder }
                        : { backgroundColor: c.border },
                    ]}
                  >
                    <Text
                      style={appTextStyle(language, {
                        ...styles.filterCount,
                        color: active ? '#fff' : c.muted,
                      })}
                    >
                      {filterCounts[option]}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.sortRow}>
          <SortPicker label={t('members.sort')} options={MEMBER_SORT_OPTIONS} value={sort} onChange={setSort} />
        </View>
      </View>

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.accentText} />
      ) : query.isError ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>
            {query.error instanceof Error ? query.error.message : t('gymBoot.errorBody')}
          </Text>
          <Pressable style={styles.retryBtn} onPress={() => void query.refetch()}>
            <Text style={styles.retryText}>{t('gymBoot.retry')}</Text>
          </Pressable>
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
              onPress={() => router.push(`/member/${item.id}`)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingHorizontal: pagePadding }]}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={styles.empty}>{t('members.empty')}</Text>}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator color={c.accentText} style={{ marginVertical: 16 }} />
            ) : null
          }
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
        />
      )}

      {!readOnly ? (
        <Pressable style={[styles.fab, { right: fabRight }]} onPress={() => router.push('/enroll')}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      ) : null}
    </View>
    </TabScreenFrame>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    toolbar: {
      paddingBottom: 10,
      gap: 10,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      minHeight: 48,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
      flex: 1,
      paddingVertical: 11,
      color: c.text,
      fontSize: 15,
    },
    filterScroll: {
      flexGrow: 0,
      marginHorizontal: -16,
    },
    filters: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 32,
      gap: 8,
    },
    filtersWrap: { flexWrap: 'wrap' },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 11,
      paddingRight: 8,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      flexShrink: 0,
      alignSelf: 'flex-start',
      minHeight: 36,
    },
    filterDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    filterLabel: {
      fontSize: 13,
      fontWeight: '700',
    },
    filterCountBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    filterCount: {
      fontSize: 12,
      fontWeight: '800',
    },
    sortRow: { alignSelf: 'flex-start' },
    list: { paddingBottom: 24 },
    columnWrap: { gap: 10 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      gap: 12,
    },
    rowColumn: {
      marginBottom: 0,
    },
    rowStacked: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 10,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowMain: { flex: 1, marginRight: 8, minWidth: 0 },
    name: { fontSize: 16, fontWeight: '600', color: c.text },
    phone: { marginTop: 4, fontSize: 13, color: c.muted },
    branch: { marginTop: 2, fontSize: 12, color: c.dim },
    rowMeta: { alignItems: 'flex-end' },
    rowMetaStacked: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      paddingTop: 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    status: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
    plan: { marginTop: 4, fontSize: 12, color: c.dim },
    planStacked: { marginTop: 0 },
    unpaid: { marginTop: 4, fontSize: 11, fontWeight: '700', color: c.statusUnpaid },
    empty: { textAlign: 'center', color: c.dim, marginTop: 40, fontSize: 15, alignSelf: 'center', maxWidth: 360 },
    errorWrap: { alignItems: 'center', paddingTop: 48, gap: 12, paddingHorizontal: 24 },
    errorText: { textAlign: 'center', color: c.error, fontSize: 15 },
    retryBtn: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: c.card,
    },
    retryText: { color: c.accentText, fontSize: 14, fontWeight: '600' },
    fab: {
      position: 'absolute',
      bottom: 24,
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 3,
    },
    fabText: { color: '#fff', fontSize: 26, fontWeight: '300', marginTop: -2 },
  });
}
