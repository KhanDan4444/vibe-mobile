import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchTeam, updateStaff } from '@/src/api/team';
import { ActionOverflowMenu } from '@/src/components/ActionOverflowMenu';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isGymOwner } from '@/src/utils/roles';
import type { StaffRow } from '@/src/types/api';

function StaffCard({
  member,
  onEdit,
  onToggle,
}: {
  member: StaffRow;
  onEdit: () => void;
  onToggle: () => void;
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
    <View style={styles.card}>
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
  const fabBottom = 24 + insets.bottom;
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
    list: { padding: 16, paddingBottom: 88 },
    empty: { textAlign: 'center' as const, color: colors.dim, marginTop: 40, fontSize: 15 },
    fab: {
      position: 'absolute' as const,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    fabText: { color: '#fff', fontSize: 28, fontWeight: '300' as const, marginTop: -2 },
  }));

  const readOnly = Boolean(subscription?.readOnly);
  const canManageTeam = Boolean(user && isGymOwner(user.role));

  const query = useQuery({
    queryKey: ['team'],
    queryFn: () => fetchTeam(token!),
    enabled: Boolean(token && canManageTeam),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateStaff(token!, id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
    onError: (e: Error) => Alert.alert(t('common.error'), e.message),
  });

  const staff = query.data?.staff ?? [];

  if (!canManageTeam) {
    return <Redirect href="/(tabs)/more" />;
  }

  const toggleActive = (member: StaffRow) => {
    const next = !member.is_active;
    Alert.alert(
      next ? t('team.enableTitle') : t('team.disableTitle'),
      next ? t('team.enableBody', { name: member.name }) : t('team.disableBody', { name: member.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: next ? t('team.enable') : t('team.disable'),
          style: next ? 'default' : 'destructive',
          onPress: () => toggleMutation.mutate({ id: member.id, is_active: next }),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {readOnly ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{t('common.readOnly')}</Text>
        </View>
      ) : null}

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.accentText} />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <StaffCard
              member={item}
              onEdit={() => router.push(`/team/${item.id}/edit`)}
              onToggle={() => toggleActive(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.accentText} />
          }
          ListEmptyComponent={<Text style={styles.empty}>{t('team.empty')}</Text>}
        />
      )}

      {!readOnly ? (
        <Pressable style={[styles.fab, { bottom: fabBottom }]} onPress={() => router.push('/team/new')}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
