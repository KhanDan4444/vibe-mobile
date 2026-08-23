import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View, type TextStyle } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { ListFooterSkeleton, PageSkeleton } from '@/src/components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/auth/AuthContext';
import { deletePayment, fetchPayments } from '@/src/api/payments';
import { ActionOverflowMenu } from '@/src/components/ActionOverflowMenu';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { RevenueFiltersSheet } from '@/src/components/RevenueFiltersSheet';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { EmptyState } from '@/src/components/EmptyState';
import { PAYMENT_METHODS, paymentMethodBadgeStyle, paymentMethodIcon, paymentMethodLabelKey, paymentMethodShortLabelKey } from '@/src/constants/payments';
import { useBranchScope } from '@/src/context/BranchContext';
import { useFlash } from '@/src/context/FlashContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useTabBarOverlayInset } from '@/src/theme/tabBar';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { appTextStyle } from '@/src/theme/typography';
import { formatDisplayDate } from '@/src/utils/date';
import { formatEtb } from '@/src/utils/formatMoney';
import { DEFAULT_REVENUE_SORT, type RevenueSortId } from '@/src/utils/listSort';
import { paymentSourceKey } from '@/src/utils/termPayments';
import { statusLabelKey } from '@/src/utils/statusLabels';
import { isGymOwner } from '@/src/utils/roles';
import { scheduleDeleteWithUndo } from '@/src/utils/scheduleWithUndo';
import { SecondaryButton } from '@/src/components/ui/Button';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { FilterChip } from '@/src/components/FilterChip';
import { SearchField } from '@/src/components/SearchField';
import { fieldRingStyle } from '@/src/theme/fieldChrome';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import {
  formatTrendForDisplay,
  trendCaptionKeyForPreset,
  trendThinBaselineKeyForPreset,
} from '@/src/utils/trendDisplay';
import type { PaymentListRow, UnpaidMemberSummary } from '@/src/types/api';
import type { ThemeColors } from '@/src/theme/tokens';

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
  onDelete,
}: {
  payment: PaymentListRow;
  token: string;
  owner: boolean;
  readOnly: boolean;
  multiColumn?: boolean;
  columnStyle?: object;
  onOpenMember: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { language } = usePreferences();
  const styles = useThemedStyles((colors) => ({
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    rowColumn: { marginBottom: 0 },
    avatar: { marginRight: 10 },
    rowBody: { flex: 1, minWidth: 0, marginRight: 8 },
    memberName: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
    rowSub: { marginTop: 2, fontSize: 12, color: colors.dim },
    methodBadge: {
      alignSelf: 'flex-start' as const,
      marginTop: 5,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
    },
    methodBadgeText: { fontSize: 11, fontWeight: '700' as const },
    rowAmountCol: { alignItems: 'flex-end' as const, justifyContent: 'center' as const },
    rowAmount: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: colors.accentText,
      fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    },
    rowCurrency: { fontSize: 10, fontWeight: '600' as const, color: colors.dim, marginTop: 1 },
  }));

  const badge = paymentMethodBadgeStyle(payment.method, c);
  const source = payment.source ? t(paymentSourceKey(payment.source)) : null;

  const menuItems =
    owner && !readOnly
      ? [
          {
            id: 'edit',
            label: t('revenue.editPayment'),
            icon: 'create-outline' as const,
            onPress: onEdit,
            accent: true,
          },
          {
            id: 'delete',
            label: t('revenue.deletePayment'),
            icon: 'trash-outline' as const,
            onPress: onDelete,
            destructive: true,
          },
        ]
      : [];

  return (
    <SoftSurface
      onPress={onOpenMember}
      style={[styles.row, multiColumn && styles.rowColumn, multiColumn && columnStyle]}
    >
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
        <Text listRow style={styles.memberName} numberOfLines={1}>
          {payment.member_name || 'Member'}
        </Text>
        <Text style={appTextStyle(language, styles.rowSub)}>
          {formatDisplayDate(payment.date)}
          {source ? ` · ${source}` : ''}
        </Text>
        <View style={[styles.methodBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Ionicons name={paymentMethodIcon(payment.method)} size={13} color={badge.text} />
          <Text style={appTextStyle(language, { ...styles.methodBadgeText, color: badge.text })}>
            {paymentMethodLabelKey(payment.method) ? t(paymentMethodLabelKey(payment.method)!) : payment.method}
          </Text>
        </View>
      </View>
      <View style={styles.rowAmountCol}>
        <Text style={styles.rowAmount}>{Number(payment.amount).toLocaleString()}</Text>
        <Text style={appTextStyle(language, styles.rowCurrency)}>ETB</Text>
      </View>
      {menuItems.length > 0 ? (
        <ActionOverflowMenu
          title={payment.member_name || t('common.actions')}
          items={menuItems}
        />
      ) : null}
    </SoftSurface>
  );
}

function MethodStat({ method, label, amount }: { method: string; label: string; amount: number }) {
  const { language } = usePreferences();
  const { colors: c } = useTheme();
  const styles = useThemedStyles((colors) => ({
    methodStat: { flex: 1, minWidth: 0, alignItems: 'center' as const },
    methodStatIcon: { marginBottom: 4 },
    methodStatValue: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: colors.text,
      fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    },
    methodStatLabel: {
      marginTop: 3,
      fontSize: 11,
      fontWeight: '500' as const,
      color: colors.dim,
      textAlign: 'center' as const,
    },
  }));

  if (!amount) return null;
  return (
    <View style={styles.methodStat} accessibilityLabel={`${label} ${amount.toLocaleString()}`}>
      <Ionicons name={paymentMethodIcon(method)} size={14} color={c.dim} style={styles.methodStatIcon} />
      <Text style={styles.methodStatValue}>{amount.toLocaleString()}</Text>
      <Text style={appTextStyle(language, styles.methodStatLabel)} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function attentionColor(status: string, c: ThemeColors) {
  const s = status.toLowerCase();
  if (s === 'expired') return c.statusExpired;
  if (s === 'due soon') return c.warning;
  return c.statusUnpaid;
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
      padding: 12,
      marginRight: 10,
    },
    attentionCardWide: {
      width: undefined,
      flexGrow: 1,
      flexBasis: '30%',
      maxWidth: '32%',
      marginRight: 0,
      marginBottom: 10,
    },
    attentionName: { color: c.text, fontSize: 14, fontWeight: '600' as const },
    attentionMeta: { marginTop: 6, color: c.dim, fontSize: 12 },
    attentionStatus: { marginTop: 8, fontSize: 11, fontWeight: '500' as const },
  }));
  const { language } = usePreferences();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();

  return (
    <SoftSurface
      onPress={onPress}
      style={[styles.attentionCard, wide && styles.attentionCardWide]}
    >
      <Text listRow style={styles.attentionName} numberOfLines={1}>{member.name}</Text>
      <Text style={appTextStyle(language, styles.attentionMeta)}>{formatDisplayDate(member.end_date)}</Text>
      <Text style={appTextStyle(language, { ...styles.attentionStatus, color: attentionColor(member.status, themeColors) })}>
        {t(statusLabelKey(member.status))}
      </Text>
    </SoftSurface>
  );
}

export default function RevenueScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { colors: c } = useTheme();
  const { language } = usePreferences();
  const queryClient = useQueryClient();
  const { showFlash } = useFlash();
  const [deleteTarget, setDeleteTarget] = useState<PaymentListRow | null>(null);
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    headerBlock: { paddingTop: 0 },
    hero: {
      paddingVertical: 18,
      paddingHorizontal: 16,
    },
    heroLabel: { fontSize: 13, fontWeight: '600' as const, color: colors.muted },
    heroTotal: {
      marginTop: 6,
      fontSize: 30,
      fontWeight: '700' as const,
      color: colors.text,
      letterSpacing: -0.8,
      fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    },
    heroMeta: { flexDirection: 'row' as const, alignItems: 'center' as const, marginTop: 6, flexWrap: 'wrap' as const },
    heroMetaText: { fontSize: 13, color: colors.dim },
    heroDot: { marginHorizontal: 6, color: colors.border },
    heroTrend: { fontWeight: '600' as const },
    heroTrendHint: { marginTop: 4, fontSize: 12, color: colors.dim, lineHeight: 17 },
    methodStats: {
      flexDirection: 'row' as const,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: 8,
    },
    periodRow: { gap: 6, paddingTop: 10, paddingBottom: 8 },
    searchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 8 },
    searchWrap: { flex: 1 },
    filterBtn: {
      width: 44,
      height: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    filterBtnActive: { backgroundColor: colors.accentSoft },
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
    listHeadingText: { fontSize: 15, fontWeight: '600' as const, letterSpacing: -0.15, color: colors.text },
    listHeadingCount: { fontSize: 12, color: colors.dim },
    hint: { fontSize: 13, color: colors.dim, marginBottom: 8 },
    attentionSection: { marginTop: 16 },
    attentionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 10 },
    attentionTitle: { color: colors.text, fontSize: 15, fontWeight: '600' as const, letterSpacing: -0.15 },
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
  const tabOverlayInset = useTabBarOverlayInset();
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
  const trendRaw = query.data?.pages[0]?.trendPercent;
  const trendPreset = customRangeReady ? 'custom' : preset;
  const trendDisplay = formatTrendForDisplay(trendRaw);
  const trendNegative = (() => {
    if (!trendDisplay.label) return false;
    return trendDisplay.label.startsWith('-');
  })();
  const trendCaption = trendDisplay.extreme
    ? t(trendThinBaselineKeyForPreset(trendPreset))
    : trendDisplay.label
      ? t(trendCaptionKeyForPreset(trendPreset))
      : null;
  const byMethod = summary?.byMethod ?? {};
  const methodEntries = PAYMENT_METHODS.filter((m) => Number(byMethod[m] || 0) > 0);
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

  const confirmDeletePayment = () => {
    const payment = deleteTarget;
    setDeleteTarget(null);
    if (!payment || !token) return;
    scheduleDeleteWithUndo({
      showFlash,
      t,
      pendingKey: 'flash.paymentDeletePending',
      cancelledKey: 'flash.paymentDeleteCancelled',
      committedKey: 'flash.paymentDeleted',
      onUndo: () => {},
      onCommit: async () => {
        await deletePayment(token, payment.id);
        await queryClient.invalidateQueries({ queryKey: ['payments'] });
        await queryClient.invalidateQueries({ queryKey: ['member-payments', payment.member_id] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      },
    });
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <SoftSurface variant="panel" style={styles.hero}>
        <Text style={appTextStyle(language, styles.heroLabel)}>
          {periodLabel}
        </Text>
        <Text style={styles.heroTotal}>
          {formatEtb(Number(summary?.total || 0), { forceCompact: false })}
        </Text>
        <View style={styles.heroMeta}>
          <Text style={appTextStyle(language, styles.heroMetaText)}>
            {t('revenue.paymentsCount', { count: summary?.count ?? 0 })}
          </Text>
          {trendDisplay.label ? (
            <>
              <Text style={styles.heroDot}>·</Text>
              <Text
                style={appTextStyle(language, {
                  ...styles.heroMetaText,
                  ...styles.heroTrend,
                  color: trendNegative ? c.statusExpired : c.success,
                })}
              >
                {trendDisplay.label}
              </Text>
              {trendCaption ? (
                <>
                  <Text style={styles.heroDot}>·</Text>
                  <Text style={appTextStyle(language, styles.heroMetaText)}>{trendCaption}</Text>
                </>
              ) : null}
            </>
          ) : null}
        </View>
        {trendDisplay.extreme && trendCaption ? (
          <Text style={appTextStyle(language, styles.heroTrendHint)}>{trendCaption}</Text>
        ) : null}
        {methodEntries.length > 0 ? (
          <View style={styles.methodStats}>
            {methodEntries.map((m) => (
              <MethodStat
                key={m}
                method={m}
                label={t(paymentMethodShortLabelKey(m)!)}
                amount={Number(byMethod[m] || 0)}
              />
            ))}
          </View>
        ) : null}
      </SoftSurface>

      {attentionMembers.length ? (
        <View style={styles.attentionSection}>
          <View style={styles.attentionHeader}>
            <Text display style={styles.attentionTitle}>{t('revenue.attentionTitle')}</Text>
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
            <FilterChip
              key={p.value}
              label={t(p.labelKey)}
              selected={active}
              onPress={() => selectPreset(p.value)}
            />
          );
        })}
        <FilterChip
          label={t('revenue.periodMore')}
          selected={useCustomRange}
          onPress={openMorePeriods}
        />
      </ScrollView>

      <View style={styles.searchRow}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder={t('revenue.search')}
          style={styles.searchWrap}
        />
        <Pressable
          onPress={() => setFiltersOpen(true)}
          style={[
            styles.filterBtn,
            fieldRingStyle(c, { open: filtersOpen || filtersActive }),
            filtersActive && styles.filterBtnActive,
          ]}
          accessibilityRole="button"
          android_ripple={null}
        >
          <Ionicons name="options-outline" size={22} color={filtersActive ? c.accentText : c.muted} />
          {filtersActive ? <View style={styles.filterDot} /> : null}
        </Pressable>
      </View>

      <View style={styles.listHeading}>
        <Text display style={styles.listHeadingText}>{t('revenue.transactions')}</Text>
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
              onDelete={() => setDeleteTarget(item)}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingHorizontal: pagePadding, paddingBottom: 28 + tabOverlayInset },
          ]}
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

      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title={t('paymentEdit.deleteTitle')}
        message={t('paymentEdit.deleteBody')}
        confirmLabel={t('revenue.deletePayment')}
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeletePayment}
      />

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

      <BottomSheet visible={morePeriodsOpen} title={t('revenue.periodMoreTitle')} onClose={() => setMorePeriodsOpen(false)} compact>
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
