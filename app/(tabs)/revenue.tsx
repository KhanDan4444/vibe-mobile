import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/src/components/AppText';
import { ListFooterSkeleton, PageSkeleton } from '@/src/components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchPayments } from '@/src/api/payments';
import { ActionOverflowMenu } from '@/src/components/ActionOverflowMenu';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { RevenueFiltersSheet } from '@/src/components/RevenueFiltersSheet';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { EmptyState } from '@/src/components/EmptyState';
import { PAYMENT_METHODS, paymentMethodBadgeStyle } from '@/src/constants/payments';
import { useBranchScope } from '@/src/context/BranchContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { appTextStyle } from '@/src/theme/typography';
import { formatDisplayDate } from '@/src/utils/date';
import { DEFAULT_REVENUE_SORT, type RevenueSortId } from '@/src/utils/listSort';
import { paymentSourceLabel } from '@/src/utils/paymentSources';
import { isGymOwner } from '@/src/utils/roles';
import { SecondaryButton } from '@/src/components/ui/Button';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import type { PaymentListRow, UnpaidMemberSummary } from '@/src/types/api';

type PaymentPreset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'last_30_days' | 'this_year';

const QUICK_PERIODS: { value: PaymentPreset; labelKey: string }[] = [
  { value: 'this_month', labelKey: 'revenue.periodThisMonth' },
  { value: 'today', labelKey: 'revenue.periodToday' },
  { value: 'this_week', labelKey: 'revenue.periodThisWeek' },
  { value: 'last_month', labelKey: 'revenue.periodLastMonth' },
];

const MORE_PERIODS: { value: PaymentPreset; labelKey: string }[] = [
  { value: 'last_30_days', labelKey: 'revenue.periodLast30Days' },
  { value: 'this_year', labelKey: 'revenue.periodThisYear' },
];

type MethodFilter = 'All methods' | (typeof PAYMENT_METHODS)[number];

function isValidDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function PaymentRowItem({
  payment,
  token,
  owner,
  readOnly,
  multiColumn,
  columnStyle,
  onOpenMember,
  onEdit,
}: {
  payment: PaymentListRow;
  token: string;
  owner: boolean;
  readOnly: boolean;
  multiColumn?: boolean;
  columnStyle?: object;
  onOpenMember: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { language } = usePreferences();
  const styles = useThemedStyles((colors) => ({
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    rowColumn: { marginBottom: 0 },
    avatar: { marginRight: 12 },
    rowBody: { flex: 1, minWidth: 0, marginRight: 8 },
    memberName: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
    rowSub: { marginTop: 3, fontSize: 12, color: colors.dim },
    methodBadge: { alignSelf: 'flex-start' as const, marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    methodBadgeText: { fontSize: 11, fontWeight: '600' as const },
    rowAmountCol: { alignItems: 'flex-end' as const, justifyContent: 'center' as const },
    rowAmount: { fontSize: 16, fontWeight: '700' as const, color: colors.accentText },
    rowCurrency: { fontSize: 10, fontWeight: '600' as const, color: colors.dim, marginTop: 2 },
  }));

  const badge = paymentMethodBadgeStyle(payment.method, c);
  const source = payment.source ? paymentSourceLabel(payment.source) : null;

  const menuItems =
    owner && !readOnly
      ? [
          { id: 'member', label: t('revenue.viewMember'), onPress: onOpenMember },
          { id: 'edit', label: t('revenue.editPayment'), onPress: onEdit },
        ]
      : [];

  return (
    <Pressable style={[styles.row, multiColumn && styles.rowColumn, multiColumn && columnStyle]} onPress={onOpenMember}>
      <View style={styles.avatar}>
        <MemberPhoto
          memberId={payment.member_id}
          name={payment.member_name || 'Member'}
          token={token}
          size={42}
          hasPhoto={Boolean(payment.member_photo_url)}
        />
      </View>
      <View style={styles.rowBody}>
        <Text style={appTextStyle(language, styles.memberName)} numberOfLines={1}>
          {payment.member_name || 'Member'}
        </Text>
        <Text style={appTextStyle(language, styles.rowSub)}>
          {formatDisplayDate(payment.date)}
          {source ? ` · ${source}` : ''}
        </Text>
        <View style={[styles.methodBadge, { backgroundColor: badge.bg }]}>
          <Text style={appTextStyle(language, { ...styles.methodBadgeText, color: badge.text })}>{payment.method}</Text>
        </View>
      </View>
      <View style={styles.rowAmountCol}>
        <Text style={appTextStyle(language, styles.rowAmount)}>{Number(payment.amount).toLocaleString()}</Text>
        <Text style={appTextStyle(language, styles.rowCurrency)}>ETB</Text>
      </View>
      {menuItems.length > 0 ? <ActionOverflowMenu items={menuItems} /> : null}
    </Pressable>
  );
}

function MethodStat({ label, amount }: { label: string; amount: number }) {
  const { language } = usePreferences();
  const styles = useThemedStyles((c) => ({
    methodStat: { flex: 1, minWidth: 0 },
    methodStatLabel: { fontSize: 11, color: c.dim },
    methodStatValue: { marginTop: 4, fontSize: 15, fontWeight: '700' as const, color: c.muted },
  }));

  if (!amount) return null;
  return (
    <View style={styles.methodStat}>
      <Text style={appTextStyle(language, styles.methodStatLabel)} numberOfLines={1}>
        {label}
      </Text>
      <Text style={appTextStyle(language, styles.methodStatValue)}>{amount.toLocaleString()}</Text>
    </View>
  );
}

function attentionColor(status: string) {
  const s = status.toLowerCase();
  if (s === 'expired') return '#f87171';
  if (s === 'due soon') return '#fbbf24';
  return '#fb923c';
}

function AttentionCard({
  member,
  onPress,
  wide,
}: {
  member: UnpaidMemberSummary;
  onPress: () => void;
  wide?: boolean;
}) {
  const styles = useThemedStyles((c) => ({
    attentionCard: {
      width: 170,
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      marginRight: 8,
    },
    attentionCardWide: {
      width: undefined,
      flexGrow: 1,
      flexBasis: '30%',
      maxWidth: '32%',
      marginRight: 0,
      marginBottom: 8,
    },
    attentionName: { color: c.text, fontSize: 14, fontWeight: '700' as const },
    attentionMeta: { marginTop: 6, color: c.dim, fontSize: 12 },
    attentionStatus: { marginTop: 8, fontSize: 11, fontWeight: '700' as const },
  }));
  const { language } = usePreferences();

  return (
    <Pressable style={[styles.attentionCard, wide && styles.attentionCardWide]} onPress={onPress}>
      <Text style={appTextStyle(language, styles.attentionName)} numberOfLines={1}>{member.name}</Text>
      <Text style={appTextStyle(language, styles.attentionMeta)}>{formatDisplayDate(member.end_date)}</Text>
      <Text style={appTextStyle(language, { ...styles.attentionStatus, color: attentionColor(member.status) })}>{member.status}</Text>
    </Pressable>
  );
}

export default function RevenueScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { colors: c } = useTheme();
  const { language } = usePreferences();
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    headerBlock: { paddingTop: 0 },
    hero: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    heroLabel: { fontSize: 13, fontWeight: '600' as const, color: colors.muted },
    heroTotal: { marginTop: 8, fontSize: 36, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.5 },
    heroMeta: { flexDirection: 'row' as const, alignItems: 'center' as const, marginTop: 8, flexWrap: 'wrap' as const },
    heroMetaText: { fontSize: 14, color: colors.dim },
    heroDot: { marginHorizontal: 6, color: colors.border },
    heroTrend: { color: colors.success, fontWeight: '600' as const },
    methodStats: {
      flexDirection: 'row' as const,
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: 8,
    },
    periodRow: { gap: 8, paddingVertical: 16 },
    periodPill: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    periodPillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentText },
    periodPillText: { fontSize: 13, fontWeight: '600' as const, color: colors.muted },
    periodPillTextActive: { color: colors.accentText },
    searchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 8 },
    searchWrap: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, paddingVertical: 11, color: colors.text, fontSize: 15 },
    filterBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    filterBtnActive: { borderColor: colors.accentText, backgroundColor: colors.accentSoft },
    filterDot: {
      position: 'absolute' as const,
      top: 8,
      right: 8,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.accentText,
    },
    listHeading: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'baseline' as const,
      marginBottom: 10,
      marginTop: 4,
    },
    listHeadingText: { fontSize: 15, fontWeight: '700' as const, color: colors.text },
    listHeadingCount: { fontSize: 12, color: colors.dim },
    hint: { fontSize: 13, color: colors.dim, marginBottom: 8 },
    attentionSection: { marginTop: 16 },
    attentionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 10 },
    attentionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' as const },
    attentionLink: { color: colors.accentText, fontSize: 13, fontWeight: '600' as const },
    attentionList: { paddingRight: 8 },
    list: { paddingBottom: 28 },
    emptyWrap: { alignItems: 'center' as const, paddingTop: 48, gap: 12, alignSelf: 'center' as const, maxWidth: 360 },
    empty: { textAlign: 'center' as const, color: colors.dim, fontSize: 15 },
    errorWrap: { alignItems: 'center' as const, paddingTop: 48, gap: 12, paddingHorizontal: 24 },
    errorText: { textAlign: 'center' as const, color: colors.error, fontSize: 15 },
  }));
  const owner = isGymOwner(user?.role);
  const { readOnly } = useGymReadOnly();
  const { pagePadding, isTablet, listColumnItemStyle } = useResponsiveLayout();
  const listColumns = 1;
  const { selectedBranchId, showBranchFilter } = useBranchScope();
  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;

  const [preset, setPreset] = useState<PaymentPreset>('this_month');
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('All methods');
  const [sort, setSort] = useState<RevenueSortId>(DEFAULT_REVENUE_SORT);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [morePeriodsOpen, setMorePeriodsOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const customRangeReady = useCustomRange && isValidDate(customFrom) && isValidDate(customTo);

  const queryParams = useMemo(() => {
    const base = {
      limit: 30,
      search: debouncedSearch || undefined,
      sort,
      method: methodFilter === 'All methods' ? undefined : methodFilter,
      ...(selectedBranchId !== 'all' ? { branch_id: selectedBranchId } : {}),
    };
    if (customRangeReady) return { ...base, from: customFrom, to: customTo };
    return { ...base, preset };
  }, [debouncedSearch, sort, methodFilter, selectedBranchId, customRangeReady, customFrom, customTo, preset]);

  const query = useInfiniteQuery({
    queryKey: ['payments', queryParams, branchKey],
    queryFn: ({ pageParam = 1 }) => fetchPayments(token!, { ...queryParams, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: Boolean(token) && (!useCustomRange || customRangeReady),
  });

  const payments = query.data?.pages.flatMap((p) => p.items) ?? [];
  const summary = query.data?.pages[0]?.summary;
  const trendPercent = query.data?.pages[0]?.trendPercent;
  const byMethod = summary?.byMethod ?? {};
  const unpaidMembers = query.data?.pages[0]?.unpaidMembers ?? [];
  const attentionMembers = unpaidMembers
    .filter((m) => ['expired', 'due soon'].includes(m.status.toLowerCase()))
    .slice(0, 8);

  const periodLabel = customRangeReady
    ? `${formatDisplayDate(customFrom)} – ${formatDisplayDate(customTo)}`
    : t([...QUICK_PERIODS, ...MORE_PERIODS].find((p) => p.value === preset)?.labelKey ?? 'revenue.period');

  const filtersActive =
    methodFilter !== 'All methods' ||
    sort !== DEFAULT_REVENUE_SORT ||
    useCustomRange ||
    debouncedSearch.length > 0;

  const selectPreset = (value: PaymentPreset) => {
    setUseCustomRange(false);
    setPreset(value);
  };

  const openMorePeriods = () => setMorePeriodsOpen(true);

  const openEdit = (payment: PaymentListRow) => {
    router.push({
      pathname: '/payment/edit/[id]',
      params: {
        id: String(payment.id),
        amount: String(payment.amount),
        date: payment.date,
        method: payment.method,
        member_id: String(payment.member_id),
        member_name: payment.member_name || '',
      },
    });
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.hero}>
        <Text style={appTextStyle(language, styles.heroLabel)}>
          {periodLabel}
        </Text>
        <Text style={appTextStyle(language, styles.heroTotal)}>{Number(summary?.total || 0).toLocaleString()} ETB</Text>
        <View style={styles.heroMeta}>
          <Text style={appTextStyle(language, styles.heroMetaText)}>
            {t('revenue.paymentsCount', { count: summary?.count ?? 0 })}
          </Text>
          {trendPercent ? (
            <>
              <Text style={styles.heroDot}>·</Text>
              <Text style={appTextStyle(language, { ...styles.heroMetaText, ...styles.heroTrend })}>{trendPercent}</Text>
            </>
          ) : null}
        </View>
        {Object.keys(byMethod).length > 0 ? (
          <View style={styles.methodStats}>
            {PAYMENT_METHODS.map((m) => (
              <MethodStat key={m} label={m} amount={Number(byMethod[m] || 0)} />
            ))}
          </View>
        ) : null}
      </View>

      {attentionMembers.length ? (
        <View style={styles.attentionSection}>
          <View style={styles.attentionHeader}>
            <Text style={appTextStyle(language, styles.attentionTitle)}>{t('revenue.attentionTitle')}</Text>
            <Pressable onPress={() => router.push('/(tabs)/members?filter=unpaid')}>
              <Text style={appTextStyle(language, styles.attentionLink)}>{t('revenue.viewUnpaid')}</Text>
            </Pressable>
          </View>
          {isTablet ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {attentionMembers.map((member) => (
                <AttentionCard
                  key={member.id}
                  member={member}
                  wide
                  onPress={() => router.push(`/member/${member.id}`)}
                />
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attentionList}>
              {attentionMembers.map((member) => (
                <AttentionCard
                  key={member.id}
                  member={member}
                  onPress={() => router.push(`/member/${member.id}`)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
        {QUICK_PERIODS.map((p) => {
          const active = !useCustomRange && preset === p.value;
          return (
            <Pressable
              key={p.value}
              style={[styles.periodPill, active && styles.periodPillActive]}
              onPress={() => selectPreset(p.value)}
            >
              <Text
                style={appTextStyle(language, {
                  ...styles.periodPillText,
                  ...(active ? styles.periodPillTextActive : {}),
                })}
              >
                {t(p.labelKey)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.periodPill, useCustomRange && styles.periodPillActive]}
          onPress={openMorePeriods}
        >
          <Text
            style={appTextStyle(language, {
              ...styles.periodPillText,
              ...(useCustomRange ? styles.periodPillTextActive : {}),
            })}
          >
            {t('revenue.periodMore')}
          </Text>
        </Pressable>
      </ScrollView>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={c.dim} style={styles.searchIcon} />
          <TextInput
            style={appTextStyle(language, styles.searchInput)}
            placeholder={t('revenue.search')}
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
        <Pressable style={[styles.filterBtn, filtersActive && styles.filterBtnActive]} onPress={() => setFiltersOpen(true)}>
          <Ionicons name="options-outline" size={22} color={filtersActive ? c.accentText : c.muted} />
          {filtersActive ? <View style={styles.filterDot} /> : null}
        </Pressable>
      </View>

      <View style={styles.listHeading}>
        <Text style={appTextStyle(language, styles.listHeadingText)}>{t('revenue.transactions')}</Text>
        {!query.isLoading ? (
          <Text style={appTextStyle(language, styles.listHeadingCount)}>
            {t('revenue.shown', { count: payments.length })}
          </Text>
        ) : null}
      </View>

      {useCustomRange && !customRangeReady ? (
        <Text style={appTextStyle(language, styles.hint)}>{t('revenue.customRangeHint')}</Text>
      ) : null}
    </View>
  );

  return (
    <TabScreenFrame>
    <View style={styles.container}>
      <BranchFilterBar horizontalPadding={pagePadding} />

      {query.isLoading && !query.data ? (
        <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
          {listHeader}
          <PageSkeleton variant="list-rows" padded={false} />
        </View>
      ) : query.isError ? (
        <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
          {listHeader}
          <View style={styles.errorWrap}>
            <Text style={appTextStyle(language, styles.errorText)}>
              {userFacingApiMessage(query.error, t('gymBoot.errorBody'), t('gymBoot.errorBody'))}
            </Text>
            <SecondaryButton label={t('gymBoot.retry')} onPress={() => void query.refetch()} />
          </View>
        </View>
      ) : (
        <FlatList
          key={`revenue-cols-${listColumns}`}
          data={payments}
          numColumns={listColumns}
          columnWrapperStyle={listColumns > 1 ? { gap: 10 } : undefined}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <PaymentRowItem
              payment={item}
              token={token!}
              owner={owner}
              readOnly={readOnly}
              multiColumn={listColumns > 1}
              columnStyle={listColumnItemStyle}
              onOpenMember={() => router.push(`/member/${item.member_id}`)}
              onEdit={() => openEdit(item)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingHorizontal: pagePadding }]}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.accentText} />}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            !useCustomRange || customRangeReady ? (
              <EmptyState
                icon="receipt-outline"
                title={t('revenue.emptyTitle')}
                body={t('revenue.emptyBody')}
              />
            ) : null
          }
          ListFooterComponent={
            query.isFetchingNextPage ? <ListFooterSkeleton /> : null
          }
        />
      )}

      <RevenueFiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        sort={sort}
        onSortChange={setSort}
        methodFilter={methodFilter}
        onMethodChange={setMethodFilter}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        useCustomRange={useCustomRange}
        onUseCustomRange={setUseCustomRange}
      />

      <BottomSheet visible={morePeriodsOpen} title={t('revenue.periodMoreTitle')} onClose={() => setMorePeriodsOpen(false)}>
        {MORE_PERIODS.map((p) => (
          <SheetOption
            key={p.value}
            label={t(p.labelKey)}
            selected={!useCustomRange && preset === p.value}
            onPress={() => {
              selectPreset(p.value);
              setMorePeriodsOpen(false);
            }}
          />
        ))}
        <SheetOption
          label={t('revenue.customRange')}
          selected={useCustomRange}
          onPress={() => {
            setUseCustomRange(true);
            setMorePeriodsOpen(false);
            setFiltersOpen(true);
          }}
        />
      </BottomSheet>
    </View>
    </TabScreenFrame>
  );
}
