import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { PageSkeleton } from '@/src/components/Skeleton';
import { useAuth } from '@/src/auth/AuthContext';
import { deletePlan, fetchPlans } from '@/src/api/plans';
import { useTheme } from '@/src/context/PreferencesContext';
import { ActionOverflowMenu } from '@/src/components/ActionOverflowMenu';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ReadOnlyBanner } from '@/src/components/ReadOnlyBanner';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { EmptyState } from '@/src/components/EmptyState';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useDeleteFlash } from '@/src/hooks/useSaveFlash';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';
import { runInBackground } from '@/src/utils/runInBackground';
import { formatPlanDuration } from '@/src/utils/planFormat';
import { SecondaryButton } from '@/src/components/ui/Button';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import type { PlanRow } from '@/src/types/api';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { fabElevation } from '@/src/theme/elevation';

function PlanCard({
  plan,
  owner,
  readOnly,
  onEdit,
  onDelete,
  multiColumn,
  columnStyle,
}: {
  plan: PlanRow;
  owner: boolean;
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
  multiColumn?: boolean;
  columnStyle?: object;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles((c) => ({
    card: {
      padding: 16,
      marginBottom: 12,
    },
    cardColumn: {
      marginBottom: 0,
    },
    headerRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8 },
    cardMain: { flex: 1 },
    name: { fontSize: 17, fontWeight: '700' as const, color: c.text },
    footer: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 10,
    },
    price: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3, color: c.text, flexShrink: 1 },
    durationBadge: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.inputBg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    durationText: { fontSize: 12, fontWeight: '600' as const, color: c.muted },
    activeCount: { marginTop: 6, fontSize: 12, color: c.success },
    inactiveCount: { marginTop: 6, fontSize: 12, color: c.dim },
  }));

  const activeCount = plan.active_member_count ?? 0;
  const menuItems =
    owner && !readOnly
      ? [
          {
            id: 'edit',
            label: t('screens.editPlan'),
            icon: 'create-outline' as const,
            onPress: onEdit,
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
    <SoftSurface variant="panel" style={[styles.card, multiColumn && styles.cardColumn, multiColumn && columnStyle]}>
      <View style={styles.headerRow}>
        <View style={styles.cardMain}>
          <Text listRow style={styles.name}>{plan.name}</Text>
          {activeCount > 0 ? (
            <Text style={styles.activeCount}>
              {t('plans.activeMembers', { count: activeCount })}
            </Text>
          ) : (
            <Text style={styles.inactiveCount}>{t('plans.noActiveMembers')}</Text>
          )}
        </View>
        <ActionOverflowMenu title={plan.name} items={menuItems} />
      </View>
      <View style={styles.footer}>
        <Text display style={styles.price}>{Number(plan.price).toLocaleString()} ETB</Text>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatPlanDuration(plan.duration, t)}</Text>
        </View>
      </View>
    </SoftSurface>
  );
}

export default function PlansScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { colors: c, theme } = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    banner: {
      margin: 16,
      marginBottom: 0,
      backgroundColor: 'rgba(251,191,36,0.12)',
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: 'rgba(251,191,36,0.35)',
    },
    bannerText: { color: '#fcd34d', fontSize: 13 },
    list: { paddingBottom: 88 },
    empty: {
      textAlign: 'center' as const,
      color: colors.dim,
      marginTop: 40,
      fontSize: 15,
      alignSelf: 'center' as const,
      maxWidth: 360,
    },
    errorWrap: { alignItems: 'center' as const, paddingTop: 48, gap: 12, paddingHorizontal: 24 },
    errorText: { textAlign: 'center' as const, color: colors.error, fontSize: 15 },
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

  const query = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token && canAccessPlans),
  });

  if (!user || !hasGymPortalAccess(user.role)) {
    return <Redirect href="/login" />;
  }

  const requestDelete = (plan: PlanRow) => {
    const activeCount = plan.active_member_count ?? 0;
    if (activeCount > 0) {
      setNotice({
        title: t('plans.cannotDeleteTitle'),
        message: t('plans.cannotDeleteBody', { name: plan.name, count: activeCount }),
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
      flashDeleted('flash.planDeleted');
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

  const plans = query.data ?? [];

  return (
    <TabScreenFrame>
    <View style={styles.container}>
      <ReadOnlyBanner />

      {query.isLoading ? (
        <PageSkeleton variant="list-cards" />
      ) : query.isError ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>
            {userFacingApiMessage(query.error, t('gymBoot.errorBody'), t('gymBoot.errorBody'))}
          </Text>
          <SecondaryButton label={t('gymBoot.retry')} onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          key={`plans-cols-${listColumns}`}
          data={plans}
          numColumns={listColumns}
          columnWrapperStyle={listColumns > 1 ? { gap: 10 } : undefined}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PlanCard
              plan={item}
              owner={owner}
              readOnly={readOnly}
              multiColumn={listColumns > 1}
              columnStyle={listColumnItemStyle}
              onEdit={() => router.push(`/plan/${item.id}/edit`)}
              onDelete={() => requestDelete(item)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingHorizontal: pagePadding }]}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.accentText} />
          }
          ListEmptyComponent={
            <EmptyState icon="pricetag-outline" title={t('plans.emptyTitle')} body={t('plans.emptyBody')} />
          }
        />
      )}

      {owner && !readOnly ? (
        <Pressable
          style={[styles.fab, fabElevation(theme), { right: fabRight, width: fabSize, height: fabSize, borderRadius: fabRadius }]}
          onPress={() => router.push('/plan/new')}
        >
          <Text style={[styles.fabText, { fontSize: fabFontSize }]}>+</Text>
        </Pressable>
      ) : null}

      <ConfirmDialog
        visible={Boolean(planToDelete)}
        title={t('plans.deleteTitle')}
        message={t('plans.deleteBody', { name: planToDelete?.name ?? '' })}
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
