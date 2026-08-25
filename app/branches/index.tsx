import { Redirect, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
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
import { statusWashOpaque } from '@/src/utils/statusWash';
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
    cardMain: { flex: 1, minWidth: 0 },
    nameRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    name: { fontSize: 16, fontWeight: '600' as const, color: c.text, flexShrink: 1 },
    defaultPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: statusWashOpaque(c.accentText, c.card, 0.14),
    },
    defaultText: { fontSize: 11, fontWeight: '700' as const, color: c.accentText },
    inactivePill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: c.errorBg,
    },
    inactiveText: { fontSize: 11, fontWeight: '700' as const, color: c.statusExpired },
    meta: { marginTop: 6, fontSize: 13, lineHeight: 18, color: c.muted },
    stats: { marginTop: 10, fontSize: 12, lineHeight: 16, color: c.dim },
  }));

  const phone = branch.phone?.trim() || '';
  const address = branch.address?.trim() || '';
  const contactParts = [phone, address].filter(Boolean);
  const metaLine = contactParts.join(' · ');
  const statsLine = [
    t('branches.membersCount', { count: branch.member_count ?? 0 }),
    t('branches.staffCount', { count: branch.staff_count ?? 0 }),
  ].join(' · ');

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
            <Text style={styles.name} numberOfLines={1}>
              {branchDisplayName(branch.name)}
            </Text>
            {branch.is_default ? (
              <View style={styles.defaultPill}>
                <Text style={styles.defaultText}>{t('common.defaultBranch')}</Text>
              </View>
            ) : null}
            {branch.is_active === false ? (
              <View style={styles.inactivePill}>
                <Text style={styles.inactiveText}>{t('branchEdit.statusInactive')}</Text>
              </View>
            ) : null}
          </View>
          {metaLine ? (
            <Text latin style={styles.meta} numberOfLines={1}>
              {metaLine}
            </Text>
          ) : null}
          <Text style={styles.stats}>{statsLine}</Text>
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
    list: { paddingBottom: 88, paddingTop: 6 },
    columnWrap: { gap: 10 },
    statusLine: { fontSize: 13, color: colors.dim, marginBottom: 8, lineHeight: 18 },
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
  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => {
      if (Boolean(a.is_default) !== Boolean(b.is_default)) return a.is_default ? -1 : 1;
      return branchDisplayName(a.name).localeCompare(branchDisplayName(b.name));
    });
  }, [branches]);

  const memberTotal = useMemo(
    () => branches.reduce((sum, b) => sum + (b.member_count ?? 0), 0),
    [branches],
  );
  const staffTotal = useMemo(
    () => branches.reduce((sum, b) => sum + (b.staff_count ?? 0), 0),
    [branches],
  );
  const statusLine =
    branches.length > 0
      ? t('branches.statusLine', {
          count: branches.length,
          members: memberTotal,
          staff: staffTotal,
        })
      : null;

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
          <PageSkeleton variant="branches" />
        ) : query.isError ? (
          <LoadError
            message={query.error instanceof Error ? query.error.message : undefined}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <FlatList
            key={`branches-cols-${listColumns}`}
            data={sortedBranches}
            numColumns={listColumns}
            columnWrapperStyle={listColumns > 1 ? styles.columnWrap : undefined}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={
              statusLine ? <Text style={styles.statusLine}>{statusLine}</Text> : null
            }
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
            style={[
              styles.fab,
              fabElevation(theme),
              {
                right: fabRight,
                bottom: fabBottom,
                width: fabSize,
                height: fabSize,
                borderRadius: fabRadius,
              },
            ]}
            onPress={() => router.push('/branch/new')}
          >
            <Text style={[styles.fabText, { fontSize: fabFontSize }]}>+</Text>
          </Pressable>
        ) : null}
      </View>
    </TabScreenFrame>
  );
}
