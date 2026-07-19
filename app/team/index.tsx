import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchTeam, updateStaff } from '@/src/api/team';
import { ActionOverflowMenu } from '@/src/components/ActionOverflowMenu';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isGymOwner } from '@/src/utils/roles';
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
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
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
    { id: 'edit', label: t('team.edit'), onPress: onEdit },
    {
      id: 'toggle',
      label: member.is_active ? t('team.disable') : t('team.enable'),
      onPress: onToggle,
      destructive: !member.is_active,
    },
  ];

  return (
    <View style={[styles.card, multiColumn && styles.cardColumn, multiColumn && columnStyle]}>
      <View style={styles.headerRow}>
        <View style={styles.cardMain}>
          <Text style={styles.name}>{member.name}</Text>
          <Text style={styles.meta}>{member.username || member.email || '—'}</Text>
          <Text style={styles.meta}>{member.branch_name || t('team.noBranch')}</Text>
          <Text style={[styles.badge, member.is_active ? styles.active : styles.inactive]}>
            {member.is_active ? t('team.active') : t('team.disabled')}
          </Text>
        </View>
        <ActionOverflowMenu items={menuItems} />
      </View>
    </View>
  );
}

export default function TeamScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { listColumns, pagePadding, fabRight, listColumnItemStyle } = useResponsiveLayout();
  const fabBottom = 24 + insets.bottom;
  const styles = useThemedStyles((colors) => ({
    container: { flex: 1, backgroundColor: colors.bg },
    banner: {
      marginTop: 16,
      marginBottom: 0,
      backgroundColor: 'rgba(251,191,36,0.12)',
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: 'rgba(251,191,36,0.35)',
    },
    bannerText: { color: '#fcd34d', fontSize: 13 },
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
      elevation: 2,
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
      {readOnly ? (
        <View style={[styles.banner, { marginHorizontal: pagePadding }]}>
          <Text style={styles.bannerText}>{t('common.readOnly')}</Text>
        </View>
      ) : null}

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.accentText} />
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
          ListEmptyComponent={<Text style={styles.empty}>{t('team.empty')}</Text>}
        />
      )}

      {!readOnly ? (
        <Pressable style={[styles.fab, { right: fabRight, bottom: fabBottom }]} onPress={() => router.push('/team/new')}>
          <Text style={styles.fabText}>+</Text>
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
