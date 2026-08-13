import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchTeam, updateStaff } from '@/src/api/team';
import { ActionOverflowMenu } from '@/src/components/ActionOverflowMenu';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { EmptyState } from '@/src/components/EmptyState';
import { useTheme } from '@/src/context/PreferencesContext';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { fabElevation } from '@/src/theme/elevation';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isGymOwner } from '@/src/utils/roles';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import type { StaffRow } from '@/src/types/api';

function StaffCard({
  member,
  multiColumn,
  columnStyle,
  onEdit,
  onToggle,
}: {
  member: StaffRow;
  multiColumn?: boolean;
  columnStyle?: object;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles((c) => ({
    card: {
      padding: 16,
      marginBottom: 12,
    },
    cardColumn: { marginBottom: 0 },
    headerRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8 },
    cardMain: { flex: 1, marginBottom: 0 },
    name: { fontSize: 17, fontWeight: '700' as const, color: c.text },
    meta: { marginTop: 4, fontSize: 13, color: c.muted },
    badge: {
      marginTop: 8,
      alignSelf: 'flex-start' as const,
      fontSize: 11,
      fontWeight: '700' as const,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      overflow: 'hidden' as const,
    },
    active: { color: c.success, backgroundColor: 'rgba(52,211,153,0.15)' },
    inactive: { color: '#f87171', backgroundColor: 'rgba(248,113,113,0.15)' },
  }));

  const menuItems = [
    { id: 'edit', label: t('team.edit'), icon: 'create-outline' as const, onPress: onEdit, accent: true },
    {
      id: 'toggle',
      label: member.is_active ? t('team.disable') : t('team.enable'),
      icon: member.is_active ? ('ban-outline' as const) : ('checkmark-circle-outline' as const),
      onPress: onToggle,
      destructive: member.is_active,
    },
  ];

  return (
    <SoftSurface variant="panel" style={[styles.card, multiColumn && styles.cardColumn, multiColumn && columnStyle]}>
      <View style={styles.headerRow}>
        <View style={styles.cardMain}>
          <Text listRow style={styles.name}>{member.name}</Text>
          <Text style={styles.meta}>{member.username || member.email || '—'}</Text>
          <Text style={styles.meta}>
            {member.branch_name ? branchDisplayName(member.branch_name) : t('team.noBranch')}
          </Text>
          <Text style={[styles.badge, member.is_active ? styles.active : styles.inactive]}>
            {member.is_active ? t('team.active') : t('team.disabled')}
          </Text>
        </View>
        <ActionOverflowMenu title={member.name} items={menuItems} />
      </View>
    </SoftSurface>
  );
}

export default function TeamScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();
  const { colors: c, theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { pagePadding, fabRight, fabSize, fabRadius, fabFontSize, listColumnItemStyle } = useResponsiveLayout();
  const listColumns = 1;
  const fabBottom = 24 + insets.bottom;
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    list: { paddingBottom: 88 },
    columnWrap: { gap: 10 },
    empty: { textAlign: 'center' as const, color: colors.dim, marginTop: 40, fontSize: 15 },
    fab: {
      position: 'absolute' as const,
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    fabText: { color: '#fff', fontSize: 26, fontWeight: '300' as const, marginTop: -2 },
  }));

  const readOnly = Boolean(subscription?.readOnly);
  const canManageTeam = Boolean(user && isGymOwner(user.role));
  const [toggleTarget, setToggleTarget] = useState<StaffRow | null>(null);
  const [errorNotice, setErrorNotice] = useState('');

  const query = useQuery({
    queryKey: ['team'],
    queryFn: () => fetchTeam(token!),
    enabled: Boolean(token && canManageTeam),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateStaff(token!, id, { is_active }),
    onSuccess: () => {
      setToggleTarget(null);
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (e: Error) => {
      setToggleTarget(null);
      setErrorNotice(e.message);
    },
  });

  const staff = query.data?.staff ?? [];

  if (!canManageTeam) {
    return <Redirect href="/(tabs)/more" />;
  }

  const requestToggle = (member: StaffRow) => setToggleTarget(member);
  const toggleNextActive = toggleTarget ? !toggleTarget.is_active : false;

  return (
    <TabScreenFrame>
    <View style={styles.container}>
      {query.isLoading ? (
        <PageSkeleton variant="list-cards" />
      ) : query.isError ? (
        <LoadError
          message={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          key={`team-cols-${listColumns}`}
          data={staff}
          numColumns={listColumns}
          columnWrapperStyle={listColumns > 1 ? styles.columnWrap : undefined}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <StaffCard
              member={item}
              multiColumn={listColumns > 1}
              columnStyle={listColumnItemStyle}
              onEdit={() => router.push(`/team/${item.id}/edit`)}
              onToggle={() => requestToggle(item)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingHorizontal: pagePadding }]}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.accentText} />
          }
          ListEmptyComponent={
            <EmptyState icon="people-outline" title={t('team.emptyTitle')} body={t('team.emptyBody')} />
          }
        />
      )}

      {!readOnly ? (
        <Pressable
          style={[styles.fab, fabElevation(theme), { right: fabRight, bottom: fabBottom, width: fabSize, height: fabSize, borderRadius: fabRadius }]}
          onPress={() => router.push('/team/new')}
        >
          <Text style={[styles.fabText, { fontSize: fabFontSize }]}>+</Text>
        </Pressable>
      ) : null}

      <ConfirmDialog
        visible={Boolean(toggleTarget)}
        title={toggleNextActive ? t('team.enableTitle') : t('team.disableTitle')}
        message={
          toggleNextActive
            ? t('team.enableBody', { name: toggleTarget?.name ?? '' })
            : t('team.disableBody', { name: toggleTarget?.name ?? '' })
        }
        confirmLabel={toggleNextActive ? t('team.enable') : t('team.disable')}
        destructive={!toggleNextActive}
        confirmLoading={toggleMutation.isPending}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() => {
          if (!toggleTarget) return;
          toggleMutation.mutate({ id: toggleTarget.id, is_active: !toggleTarget.is_active });
        }}
      />
      <ConfirmDialog
        visible={Boolean(errorNotice)}
        title={t('common.error')}
        message={errorNotice}
        alertOnly
        destructive={false}
        onConfirm={() => setErrorNotice('')}
      />
    </View>
    </TabScreenFrame>
  );
}
