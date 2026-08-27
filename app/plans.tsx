import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { PageSkeleton } from '@/src/components/Skeleton';
import { useAuth } from '@/src/auth/AuthContext';
import { deletePlan, fetchPlans } from '@/src/api/plans';
import { useTheme } from '@/src/context/PreferencesContext';
import { ActionOverflowMenu } from '@/src/components/ActionOverflowMenu';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { SortPicker } from '@/src/components/SortPicker';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { EmptyState } from '@/src/components/EmptyState';
import { LoadError } from '@/src/components/LoadError';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useDeleteFlash } from '@/src/hooks/useSaveFlash';
import { FLASH_PLAN_DELETED_MS } from '@/src/components/FlashBanner';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';
import { runInBackground } from '@/src/utils/runInBackground';
import { formatPlanDuration, formatPlanDisplayName } from '@/src/utils/planFormat';
import { formatEtb } from '@/src/utils/formatMoney';
import { pullRefreshing } from '@/src/query/useQueryScreenLoading';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import type { PlanRow } from '@/src/types/api';
import { fabElevation } from '@/src/theme/elevation';
import { statusWashOpaque } from '@/src/utils/statusWash';

type PlanSort =
  | 'price_asc'
  | 'price_desc'
  | 'duration_asc'
  | 'duration_desc'
  | 'members_desc'
  | 'name_asc';

const PLAN_SORT_OPTIONS: { id: PlanSort; labelKey: string }[] = [
  { id: 'price_asc', labelKey: 'plans.sortPriceAsc' },
  { id: 'price_desc', labelKey: 'plans.sortPriceDesc' },
  { id: 'duration_asc', labelKey: 'plans.sortDurationAsc' },
  { id: 'duration_desc', labelKey: 'plans.sortDurationDesc' },
  { id: 'members_desc', labelKey: 'plans.sortMembersDesc' },
  { id: 'name_asc', labelKey: 'plans.sortNameAsc' },
];

function sortPlans(plans: PlanRow[], sort: PlanSort): PlanRow[] {
  const list = [...plans];
  const price = (p: PlanRow) => Number(p.price) || 0;
  switch (sort) {
    case 'price_desc':
      return list.sort((a, b) => price(b) - price(a) || a.name.localeCompare(b.name));
    case 'duration_asc':
      return list.sort((a, b) => a.duration - b.duration || price(a) - price(b));
    case 'duration_desc':
      return list.sort((a, b) => b.duration - a.duration || price(a) - price(b));
    case 'members_desc':
      return list.sort(
        (a, b) => (b.active_member_count ?? 0) - (a.active_member_count ?? 0) || price(a) - price(b),
      );
    case 'name_asc':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'price_asc':
    default:
      return list.sort((a, b) => price(a) - price(b) || a.name.localeCompare(b.name));
  }
}

function monthlyRate(plan: PlanRow): number | null {
  const duration = Number(plan.duration) || 1;
  if (duration <= 1) return null;
  return Number(plan.price) / duration;
}

function PlanCard({
  plan,
  owner,
  readOnly,
  popular,
  multiColumn,
  columnStyle,
  onEdit,
  onDelete,
}: {
  plan: PlanRow;
  owner: boolean;
  readOnly: boolean;
  popular?: boolean;
  multiColumn?: boolean;
  columnStyle?: object;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles((colors) => ({
    wrap: {
      position: 'relative' as const,
      marginBottom: 12,
      overflow: 'visible' as const,
    },
    wrapPopular: {
      marginTop: 12,
      paddingTop: 2,
    },
    wrapColumn: {
      marginBottom: 0,
    },
    card: {
      padding: 16,
    },
    cardPopular: {
      borderColor: statusWashOpaque(colors.accentText, colors.cardEdge, 0.5),
      borderWidth: 2,
    },
    topRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8 },
    priceBlock: { flex: 1, minWidth: 0 },
    price: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4, color: colors.text },
    priceHint: { marginTop: 4, fontSize: 12, color: colors.dim },
    popularPill: {
      position: 'absolute' as const,
      top: -2,
      left: 16,
      zIndex: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      // Match web `bg-teal-800` / `dark:bg-teal-900`
      backgroundColor: '#115e59',
    },
    popularText: {
      fontSize: 10,
      fontWeight: '600' as const,
      letterSpacing: 0.7,
      color: '#f0fdfa',
    },
    name: { marginTop: 12, fontSize: 16, fontWeight: '600' as const, color: colors.text },
    metaRow: {
      marginTop: 12,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    durationBadge: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    durationText: { fontSize: 12, fontWeight: '600' as const, color: colors.muted },
    members: { fontSize: 12, fontWeight: '600' as const, color: colors.success },
    membersQuiet: { fontSize: 12, color: colors.dim },
  }));

  const activeCount = plan.active_member_count ?? 0;
  const displayName = formatPlanDisplayName(plan.name);
  const perMonth = monthlyRate(plan);
  const menuItems =
    owner && !readOnly
      ? [
          {
            id: 'edit',
            label: t('screens.editPlan'),
            icon: 'create-outline' as const,
            onPress: onEdit,
            accent: true,
          },
          {
            id: 'delete',
            label: t('plans.delete'),
            icon: 'trash-outline' as const,
            onPress: onDelete,
            destructive: true,
          },
        ]
      : [];

  return (
    <View
      style={[
        styles.wrap,
        popular ? styles.wrapPopular : null,
        multiColumn && styles.wrapColumn,
        multiColumn && columnStyle,
      ]}
    >
      {popular ? (
        <View style={styles.popularPill} accessibilityRole="text">
          <Text style={styles.popularText}>{t('plans.popular').toLocaleUpperCase()}</Text>
        </View>
      ) : null}
      <SoftSurface
        variant="panel"
        style={[styles.card, popular ? styles.cardPopular : null]}
      >
        <View style={styles.topRow}>
          <View style={styles.priceBlock}>
            <Text listRow style={styles.price}>
              {formatEtb(Number(plan.price) || 0, { forceCompact: false })}
            </Text>
            <Text style={styles.priceHint}>
              {perMonth != null
                ? t('plans.perMonth', { amount: formatEtb(perMonth, { forceCompact: false }) })
                : formatPlanDuration(plan.duration, t)}
            </Text>
          </View>
          <ActionOverflowMenu title={displayName} items={menuItems} />
        </View>
        <Text listRow style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatPlanDuration(plan.duration, t)}</Text>
          </View>
          <Text style={activeCount > 0 ? styles.members : styles.membersQuiet}>
            {activeCount > 0
              ? t('plans.activeMembers', { count: activeCount })
              : t('plans.noActiveMembers')}
          </Text>
        </View>
      </SoftSurface>
    </View>
  );
}

export default function PlansScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { colors: c, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    list: { paddingBottom: 88, paddingTop: 6, overflow: 'visible' as const },
    listHeader: { marginBottom: 10, gap: 10 },
    statusLine: { fontSize: 13, color: colors.dim, lineHeight: 18 },
    sortRow: { alignItems: 'flex-start' as const },
    fab: {
      position: 'absolute' as const,
      bottom: 24,
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    fabText: { color: '#fff', fontSize: 26, fontWeight: '300' as const, marginTop: -2 },
  }));

  const { readOnly } = useGymReadOnly();
  const flashDeleted = useDeleteFlash();
  const { pagePadding, fabRight, fabSize, fabRadius, fabFontSize, listColumnItemStyle } = useResponsiveLayout();
  const listColumns = 1;
  const owner = isGymOwner(user?.role);
  const canAccessPlans = Boolean(user && hasGymPortalAccess(user.role));
  const [planToDelete, setPlanToDelete] = useState<PlanRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [sort, setSort] = useState<PlanSort>('price_asc');

  const query = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token && canAccessPlans),
  });

  const plans = query.data ?? [];
  const sortedPlans = useMemo(() => sortPlans(plans, sort), [plans, sort]);

  const popularPlanId = useMemo(() => {
    if (plans.length < 2) return null;
    let best: number | null = null;
    let bestCount = 0;
    for (const plan of plans) {
      const count = plan.active_member_count ?? 0;
      if (count > bestCount) {
        best = plan.id;
        bestCount = count;
      }
    }
    return bestCount > 0 ? best : null;
  }, [plans]);

  const priceMin = useMemo(
    () => (plans.length ? Math.min(...plans.map((p) => Number(p.price) || 0)) : 0),
    [plans],
  );
  const priceMax = useMemo(
    () => (plans.length ? Math.max(...plans.map((p) => Number(p.price) || 0)) : 0),
    [plans],
  );
  const membersOnPlans = useMemo(
    () => plans.reduce((sum, p) => sum + (p.active_member_count ?? 0), 0),
    [plans],
  );

  const statusLine =
    plans.length > 0
      ? priceMin === priceMax
        ? t('plans.statusLineSingle', {
            count: plans.length,
            price: formatEtb(priceMin, { forceCompact: false }),
            members: membersOnPlans,
          })
        : t('plans.statusLine', {
            count: plans.length,
            from: formatEtb(priceMin, { forceCompact: false }),
            to: formatEtb(priceMax, { forceCompact: false }),
            members: membersOnPlans,
          })
      : null;

  if (!user || !hasGymPortalAccess(user.role)) {
    return <Redirect href="/login" />;
  }

  const requestDelete = (plan: PlanRow) => {
    const activeCount = plan.active_member_count ?? 0;
    const displayName = formatPlanDisplayName(plan.name);
    if (activeCount > 0) {
      setNotice({
        title: t('plans.cannotDeleteTitle'),
        message: t('plans.cannotDeleteBody', { name: displayName, count: activeCount }),
      });
      return;
    }
    setPlanToDelete(plan);
  };

  const runDelete = async () => {
    if (!planToDelete || !token) return;
    setDeleting(true);
    try {
      await deletePlan(token, planToDelete.id);
      setPlanToDelete(null);
      flashDeleted('flash.planDeleted', { durationMs: FLASH_PLAN_DELETED_MS });
      runInBackground(query.refetch());
    } catch (e) {
      setPlanToDelete(null);
      setNotice({
        title: t('common.error'),
        message: e instanceof Error ? e.message : t('plans.deleteFailed'),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <TabScreenFrame>
      <View style={styles.container}>
        {query.isLoading ? (
          <PageSkeleton variant="plans" />
        ) : query.isError ? (
          <LoadError error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <FlatList
            key={`plans-cols-${listColumns}`}
            data={sortedPlans}
            numColumns={listColumns}
            columnWrapperStyle={listColumns > 1 ? { gap: 10 } : undefined}
            keyExtractor={(item) => String(item.id)}
            removeClippedSubviews={false}
            ListHeaderComponent={
              plans.length > 0 ? (
                <View style={styles.listHeader}>
                  {statusLine ? <Text style={styles.statusLine}>{statusLine}</Text> : null}
                  <View style={styles.sortRow}>
                    <SortPicker
                      label={t('plans.sortLabel')}
                      options={PLAN_SORT_OPTIONS}
                      value={sort}
                      onChange={setSort}
                    />
                  </View>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <PlanCard
                plan={item}
                owner={owner}
                readOnly={readOnly}
                popular={item.id === popularPlanId}
                multiColumn={listColumns > 1}
                columnStyle={listColumnItemStyle}
                onEdit={() => router.push(`/plan/${item.id}/edit`)}
                onDelete={() => requestDelete(item)}
              />
            )}
            contentContainerStyle={[styles.list, { paddingHorizontal: pagePadding }]}
            refreshControl={
              <RefreshControl
                refreshing={pullRefreshing(query.isRefetching)}
                onRefresh={() => query.refetch()}
                tintColor={c.accentText}
              />
            }
            ListEmptyComponent={
              <EmptyState icon="pricetag-outline" title={t('plans.emptyTitle')} body={t('plans.emptyBody')} />
            }
          />
        )}

        {owner && !readOnly ? (
          <Pressable
            style={[
              styles.fab,
              fabElevation(theme),
              { right: fabRight, width: fabSize, height: fabSize, borderRadius: fabRadius },
            ]}
            onPress={() => router.push('/plan/new')}
          >
            <Text style={[styles.fabText, { fontSize: fabFontSize }]}>+</Text>
          </Pressable>
        ) : null}

        <ConfirmDialog
          visible={Boolean(planToDelete)}
          title={t('plans.deleteTitle')}
          message={t('plans.deleteBody', {
            name: planToDelete ? formatPlanDisplayName(planToDelete.name) : '',
          })}
          confirmLabel={t('plans.delete')}
          destructive
          confirmLoading={deleting}
          onCancel={() => setPlanToDelete(null)}
          onConfirm={() => void runDelete()}
        />
        <ConfirmDialog
          visible={Boolean(notice)}
          title={notice?.title ?? ''}
          message={notice?.message ?? ''}
          alertOnly
          destructive={false}
          onConfirm={() => setNotice(null)}
        />
      </View>
    </TabScreenFrame>
  );
}
