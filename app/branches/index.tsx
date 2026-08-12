import { Redirect, useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchBranches } from '@/src/api/branches';
import { ActionOverflowMenu } from '@/src/components/ActionOverflowMenu';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { EmptyState } from '@/src/components/EmptyState';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { fabElevation } from '@/src/theme/elevation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isGymOwner } from '@/src/utils/roles';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import type { BranchRow } from '@/src/types/api';

function BranchCard({
  branch,
  owner,
  multiColumn,
  columnStyle,
  onEdit,
}: {
  branch: BranchRow;
  owner: boolean;
  multiColumn?: boolean;
  columnStyle?: object;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles((c) => ({
    card: {
      padding: 16,
      marginBottom: 12,
    },
    cardColumn: { marginBottom: 0 },
    headerRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8 },
    cardMain: { flex: 1 },
    nameRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, gap: 8 },
    name: { fontSize: 17, fontWeight: '700' as const, color: c.text, flexShrink: 1 },
    defaultBadge: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: c.accentText,
      backgroundColor: 'rgba(52,211,153,0.15)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      overflow: 'hidden' as const,
    },
    meta: { marginTop: 4, fontSize: 13, color: c.muted },
    footer: {
      marginTop: 12,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    countBadge: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: c.dim,
      backgroundColor: c.inputBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    inactive: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: c.statusExpired,
      backgroundColor: c.errorBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      overflow: 'hidden' as const,
    },
  }));

  const menuItems = owner
    ? [
        {
          id: 'edit',
          label: t('team.edit'),
          icon: 'create-outline' as const,
          onPress: onEdit,
          accent: true,
        },
      ]
    : [];

  return (
    <SoftSurface variant="panel" style={[styles.card, multiColumn && styles.cardColumn, multiColumn && columnStyle]}>
      <View style={styles.headerRow}>
        <View style={styles.cardMain}>
          <View style={styles.nameRow}>
            <Text listRow style={styles.name}>{branchDisplayName(branch.name)}</Text>
            {branch.is_default ? <Text style={styles.defaultBadge}>{t('common.defaultBranch')}</Text> : null}
          </View>
          {branch.phone ? <Text style={styles.meta}>{branch.phone}</Text> : null}
          {branch.address ? <Text style={styles.meta}>{branch.address}</Text> : null}
          <View style={styles.footer}>
            <Text style={styles.countBadge}>{t('branches.membersCount', { count: branch.member_count ?? 0 })}</Text>
            <Text style={styles.countBadge}>{t('branches.staffCount', { count: branch.staff_count ?? 0 })}</Text>
            {branch.is_active === false ? (
              <Text style={styles.inactive}>{t('branchEdit.statusInactive')}</Text>
            ) : null}
          </View>
        </View>
        {menuItems.length ? (
          <ActionOverflowMenu title={branchDisplayName(branch.name)} items={menuItems} />
        ) : null}
      </View>
    </SoftSurface>
  );
}

export default function BranchesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token, user, subscription } = useAuth();
  const { colors: c, theme } = useTheme();
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

  const owner = isGymOwner(user?.role);
  const readOnly = Boolean(subscription?.readOnly);

  const query = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && owner),
  });

  const branches = query.data?.branches ?? [];

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!owner) {
    return <Redirect href="/(tabs)/more" />;
  }

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
          key={`branches-cols-${listColumns}`}
          data={branches}
          numColumns={listColumns}
          columnWrapperStyle={listColumns > 1 ? styles.columnWrap : undefined}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <BranchCard
              branch={item}
              owner={owner && !readOnly}
              multiColumn={listColumns > 1}
              columnStyle={listColumnItemStyle}
              onEdit={() => router.push(`/branch/${item.id}/edit`)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingHorizontal: pagePadding }]}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.accentText} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              title={t('branches.emptyTitle')}
              body={t('branches.emptyBody')}
            />
          }
        />
      )}

      {owner && !readOnly ? (
        <Pressable
          style={[styles.fab, fabElevation(theme), { right: fabRight, bottom: fabBottom, width: fabSize, height: fabSize, borderRadius: fabRadius }]}
          onPress={() => router.push('/branch/new')}
        >
          <Text style={[styles.fabText, { fontSize: fabFontSize }]}>+</Text>
        </Pressable>
      ) : null}
    </View>
    </TabScreenFrame>
  );
}
