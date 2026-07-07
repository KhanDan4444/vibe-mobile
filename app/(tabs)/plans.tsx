import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/src/auth/AuthContext';
import { deletePlan, fetchPlans } from '@/src/api/plans';
import { useTheme } from '@/src/context/PreferencesContext';
import { ActionOverflowMenu } from '@/src/components/ActionOverflowMenu';
import { ReadOnlyBanner } from '@/src/components/ReadOnlyBanner';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';
import { formatPlanDuration } from '@/src/utils/planFormat';
import type { PlanRow } from '@/src/types/api';

function PlanCard({
  plan,
  owner,
  readOnly,
  onEdit,
  onDelete,
  multiColumn,
}: {
  plan: PlanRow;
  owner: boolean;
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
  multiColumn?: boolean;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles((c) => ({
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardColumn: {
      flex: 1,
      marginBottom: 0,
    },
    headerRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8 },
    cardMain: { flex: 1 },
    name: { fontSize: 17, fontWeight: '700' as const, color: c.text },
    meta: { marginTop: 6, fontSize: 14, color: c.muted },
    activeCount: { marginTop: 6, fontSize: 12, color: c.success },
    inactiveCount: { marginTop: 6, fontSize: 12, color: c.dim },
  }));

  const activeCount = plan.active_member_count ?? 0;
  const menuItems =
    owner && !readOnly
      ? [
          { id: 'edit', label: t('screens.editPlan'), onPress: onEdit },
          { id: 'delete', label: t('member.delete'), onPress: onDelete, destructive: true },
        ]
      : [];

  return (
    <View style={[styles.card, multiColumn && styles.cardColumn]}>
      <View style={styles.headerRow}>
        <View style={styles.cardMain}>
          <Text style={styles.name}>{plan.name}</Text>
          <Text style={styles.meta}>
            {formatPlanDuration(plan.duration, t)} · {Number(plan.price).toLocaleString()} ETB
          </Text>
          {activeCount > 0 ? (
            <Text style={styles.activeCount}>
              {t('plans.activeMembers', { count: activeCount })}
            </Text>
          ) : (
            <Text style={styles.inactiveCount}>{t('plans.noActiveMembers')}</Text>
          )}
        </View>
        <ActionOverflowMenu items={menuItems} />
      </View>
    </View>
  );
}

export default function PlansScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { colors: c } = useTheme();
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
    empty: { textAlign: 'center' as const, color: colors.dim, marginTop: 40, fontSize: 15 },
    fab: {
      position: 'absolute' as const,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      elevation: 4,
    },
    fabText: { color: '#fff', fontSize: 28, fontWeight: '300' as const, marginTop: -2 },
  }));

  const { readOnly } = useGymReadOnly();
  const { listColumns, pagePadding, contentMaxWidth, width, isTablet } = useResponsiveLayout();
  const fabRight = isTablet ? Math.max(pagePadding, (width - contentMaxWidth) / 2 + pagePadding) : 20;
  const owner = isGymOwner(user?.role);
  const canAccessPlans = Boolean(user && hasGymPortalAccess(user.role));

  const query = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token && canAccessPlans),
  });

  if (!user || !hasGymPortalAccess(user.role)) {
    return <Redirect href="/login" />;
  }

  const confirmDelete = (plan: PlanRow) => {
    const activeCount = plan.active_member_count ?? 0;
    if (activeCount > 0) {
      Alert.alert(
        t('plans.cannotDeleteTitle'),
        t('plans.cannotDeleteBody', { name: plan.name, count: activeCount })
      );
      return;
    }

    Alert.alert(t('plans.deleteTitle'), t('plans.deleteBody', { name: plan.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('member.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePlan(token!, plan.id);
            query.refetch();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete plan.');
          }
        },
      },
    ]);
  };

  const plans = query.data ?? [];

  return (
    <TabScreenFrame>
    <View style={styles.container}>
      <ReadOnlyBanner />

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.accentText} />
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
              onEdit={() => router.push(`/plan/${item.id}/edit`)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingHorizontal: pagePadding }]}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.accentText} />
          }
          ListEmptyComponent={<Text style={styles.empty}>{t('plans.empty')}</Text>}
        />
      )}

      {owner && !readOnly ? (
        <Pressable style={[styles.fab, { right: fabRight }]} onPress={() => router.push('/plan/new')}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      ) : null}
    </View>
    </TabScreenFrame>
  );
}
