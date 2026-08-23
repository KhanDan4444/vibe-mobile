import { Redirect, useNavigation, useRouter, type Href } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchTeam, updateStaff } from '@/src/api/team';
import { archiveTrainer, fetchTrainers, restoreTrainer } from '@/src/api/trainers';
import { ActionOverflowMenu } from '@/src/components/ActionOverflowMenu';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { FilterChip } from '@/src/components/FilterChip';
import { InitialsAvatar } from '@/src/components/InitialsAvatar';
import { SearchField } from '@/src/components/SearchField';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { EmptyState } from '@/src/components/EmptyState';
import { useBranchScope } from '@/src/context/BranchContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { RowActionLink } from '@/src/components/RowActionLink';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { fabElevation } from '@/src/theme/elevation';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isGymOwner } from '@/src/utils/roles';
import { branchDisplayName } from '@/src/utils/branchDisplayName';
import { trainerMutationErrorMessage } from '@/src/utils/trainerErrors';
import type { StaffRow, TrainerRow } from '@/src/types/api';

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
    headerRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12 },
    cardMain: { flex: 1, marginBottom: 0, minWidth: 0 },
    titleRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      flexWrap: 'wrap' as const,
    },
    name: { flexShrink: 1, fontSize: 16, fontWeight: '700' as const, color: c.text },
    meta: { marginTop: 4, fontSize: 13, color: c.muted },
    badge: {
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

  const login = member.username || member.email || '—';
  const { activeBranches } = useBranchScope();
  const defaultBranch =
    activeBranches.find((b) => b.is_default)?.name || activeBranches[0]?.name || 'Main';
  const branch = branchDisplayName(member.branch_name || defaultBranch);

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
        <InitialsAvatar name={member.name} size={44} />
        <View style={styles.cardMain}>
          <View style={styles.titleRow}>
            <Text listRow style={styles.name} numberOfLines={1}>
              {member.name}
            </Text>
            <Text style={[styles.badge, member.is_active ? styles.active : styles.inactive]}>
              {member.is_active ? t('team.active') : t('team.disabled')}
            </Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {`${login} · ${branch}`}
          </Text>
        </View>
        <ActionOverflowMenu title={member.name} items={menuItems} />
      </View>
    </SoftSurface>
  );
}

function TrainerCard({
  trainer,
  former,
  onEdit,
  onArchive,
  onRestore,
}: {
  trainer: TrainerRow;
  former: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const styles = useThemedStyles((colors) => ({
    card: { padding: 16, marginBottom: 12 },
    headerRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12 },
    cardMain: { flex: 1, minWidth: 0 },
    name: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
    meta: { marginTop: 4, fontSize: 13, color: colors.muted },
    sideCol: { alignItems: 'flex-end' as const, gap: 8 },
  }));

  const { activeBranches } = useBranchScope();
  const defaultBranch =
    activeBranches.find((b) => b.is_default)?.name || activeBranches[0]?.name || 'Main';
  const detailParts = [
    trainer.specialty || null,
    t('team.assignedMembers', { count: trainer.member_count ?? 0 }),
    branchDisplayName(trainer.branch_name || defaultBranch),
  ].filter(Boolean);
  const detailLine = detailParts.join(' · ');

  if (former) {
    return (
      <SoftSurface variant="panel" style={styles.card}>
        <View style={styles.headerRow}>
          <InitialsAvatar name={trainer.name} size={44} />
          <View style={styles.cardMain}>
            <Text listRow style={styles.name} numberOfLines={1}>
              {trainer.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {trainer.phone || '—'}
            </Text>
            <Text style={styles.meta} numberOfLines={2}>
              {detailLine}
            </Text>
          </View>
          <View style={styles.sideCol}>
            <RowActionLink
              label={t('team.restoreTrainer')}
              icon="arrow-undo-outline"
              color={c.statusActive}
              onPress={onRestore}
            />
          </View>
        </View>
      </SoftSurface>
    );
  }

  const menuItems = [
    { id: 'edit', label: t('team.edit'), icon: 'create-outline' as const, onPress: onEdit, accent: true },
    {
      id: 'archive',
      label: t('team.archiveTrainer'),
      icon: 'trash-outline' as const,
      onPress: onArchive,
      destructive: true,
    },
  ];

  return (
    <SoftSurface variant="panel" style={styles.card}>
      <View style={styles.headerRow}>
        <InitialsAvatar name={trainer.name} size={44} />
        <View style={styles.cardMain}>
          <Text listRow style={styles.name} numberOfLines={1}>
            {trainer.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {trainer.phone || '—'}
          </Text>
          <Text style={styles.meta} numberOfLines={2}>
            {detailLine}
          </Text>
        </View>
        <ActionOverflowMenu title={trainer.name} items={menuItems} />
      </View>
    </SoftSurface>
  );
}

function matchesBranch(branchId: number | null | undefined, selectedBranchId: string | number) {
  if (selectedBranchId === 'all') return true;
  return String(branchId ?? '') === String(selectedBranchId);
}

export default function TeamScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();
  const { selectedBranchId } = useBranchScope();
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
    toolbar: { paddingBottom: 6, gap: 6 },
    subtitle: {
      paddingHorizontal: 0,
      paddingBottom: 0,
      fontSize: 12,
      lineHeight: 16,
      color: colors.muted,
    },
    rosterRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flexWrap: 'wrap' as const,
      gap: 8,
    },
    segment: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      padding: 4,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      // Match web `.team-segment` (app-bg track + soft brand pill)
      backgroundColor: colors.bg,
    },
    archiveRule: {
      width: StyleSheet.hairlineWidth,
      height: 24,
      backgroundColor: colors.border,
      marginHorizontal: 2,
    },
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
  const [tab, setTab] = useState<'staff' | 'trainers'>('staff');
  const [formerTrainers, setFormerTrainers] = useState(false);
  const [search, setSearch] = useState('');
  const [toggleTarget, setToggleTarget] = useState<StaffRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<TrainerRow | null>(null);
  const [errorNotice, setErrorNotice] = useState('');
  const branchScoped = selectedBranchId !== 'all';

  const pageSubtitle =
    tab === 'trainers'
      ? formerTrainers
        ? t('team.formerTrainersSubtitle')
        : t('team.trainersSubtitle')
      : t('team.staffSubtitle');

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('screens.team') });
  }, [navigation, t]);

  const query = useQuery({
    queryKey: ['team'],
    queryFn: () => fetchTeam(token!),
    enabled: Boolean(token && canManageTeam),
  });

  const liveTrainersQuery = useQuery({
    queryKey: ['trainers', false],
    queryFn: () => fetchTrainers(token!, false),
    enabled: Boolean(token && canManageTeam),
  });

  const formerTrainersQuery = useQuery({
    queryKey: ['trainers', true],
    queryFn: () => fetchTrainers(token!, true),
    enabled: Boolean(token && canManageTeam && formerTrainers),
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

  const archiveMutation = useMutation({
    mutationFn: (id: number) => archiveTrainer(token!, id),
    onSuccess: () => {
      setArchiveTarget(null);
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
    },
    onError: (e: unknown) => {
      setArchiveTarget(null);
      setErrorNotice(
        trainerMutationErrorMessage(e, t('team.trainersUnavailable'), t('common.error'))
      );
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => restoreTrainer(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
    },
    onError: (e: unknown) =>
      setErrorNotice(
        trainerMutationErrorMessage(e, t('team.trainersUnavailable'), t('common.error'))
      ),
  });

  const staffAll = query.data?.staff ?? [];
  const liveTrainersAll = liveTrainersQuery.data?.trainers ?? [];
  const formerTrainersAll = formerTrainersQuery.data?.trainers ?? [];
  const archivedTrainerTotal =
    liveTrainersQuery.data?.archivedTotal ?? formerTrainersQuery.data?.archivedTotal ?? 0;

  const staff = useMemo(
    () => staffAll.filter((row) => matchesBranch(row.branch_id, selectedBranchId)),
    [staffAll, selectedBranchId]
  );
  const liveTrainers = useMemo(
    () => liveTrainersAll.filter((row) => matchesBranch(row.branch_id, selectedBranchId)),
    [liveTrainersAll, selectedBranchId]
  );
  const trainers = useMemo(() => {
    const source = formerTrainers ? formerTrainersAll : liveTrainersAll;
    return source.filter((row) => matchesBranch(row.branch_id, selectedBranchId));
  }, [formerTrainers, formerTrainersAll, liveTrainersAll, selectedBranchId]);

  const liveTrainerTotal = liveTrainers.length;
  const searchNeedle = search.trim().toLowerCase();
  const displayedStaff = useMemo(() => {
    if (!searchNeedle) return staff;
    return staff.filter((member) =>
      [member.name, member.email, member.username, member.branch_name]
        .some((value) => String(value || '').toLowerCase().includes(searchNeedle))
    );
  }, [staff, searchNeedle]);
  const displayedTrainers = useMemo(() => {
    if (!searchNeedle) return trainers;
    return trainers.filter((row) =>
      [row.name, row.phone, row.specialty, row.branch_name]
        .some((value) => String(value || '').toLowerCase().includes(searchNeedle))
    );
  }, [trainers, searchNeedle]);

  if (!canManageTeam) {
    return <Redirect href="/(tabs)/more" />;
  }

  const requestToggle = (member: StaffRow) => setToggleTarget(member);
  const toggleNextActive = toggleTarget ? !toggleTarget.is_active : false;

  const showFormerChip = tab === 'trainers' && (archivedTrainerTotal > 0 || formerTrainers);

  const toolbar = (
    <View style={[styles.toolbar, { paddingHorizontal: pagePadding }]}>
      <View style={styles.rosterRow}>
        <View style={styles.segment}>
          <FilterChip
            pill
            label={t('team.tabStaff')}
            selected={tab === 'staff'}
            count={staff.length}
            onPress={() => {
              setTab('staff');
              setFormerTrainers(false);
              setSearch('');
            }}
          />
          <FilterChip
            pill
            label={t('team.tabTrainers')}
            selected={tab === 'trainers' && !formerTrainers}
            count={liveTrainerTotal}
            onPress={() => {
              setTab('trainers');
              setFormerTrainers(false);
              setSearch('');
            }}
          />
        </View>
        {showFormerChip ? (
          <>
            <View style={styles.archiveRule} />
            <FilterChip
              label={t('team.formerTrainers')}
              selected={formerTrainers}
              count={archivedTrainerTotal}
              selectedColor={c.statusFormer}
              onPress={() => {
                setFormerTrainers((current) => !current);
                setSearch('');
              }}
            />
          </>
        ) : null}
      </View>
      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder={
          tab === 'trainers'
            ? formerTrainers
              ? t('team.searchFormer')
              : t('team.searchTrainers')
            : t('team.searchStaff')
        }
      />
      <Text style={styles.subtitle}>{pageSubtitle}</Text>
    </View>
  );

  const loading =
    tab === 'staff'
      ? query.isLoading
      : formerTrainers
        ? formerTrainersQuery.isLoading
        : liveTrainersQuery.isLoading;
  const loadError =
    tab === 'staff'
      ? query.isError
      : formerTrainers
        ? formerTrainersQuery.isError
        : liveTrainersQuery.isError;
  const retry =
    tab === 'staff'
      ? query.refetch
      : formerTrainers
        ? formerTrainersQuery.refetch
        : liveTrainersQuery.refetch;
  const errMsg =
    tab === 'staff'
      ? (query.error instanceof Error ? query.error.message : undefined)
      : formerTrainers
        ? (formerTrainersQuery.error instanceof Error ? formerTrainersQuery.error.message : undefined)
        : (liveTrainersQuery.error instanceof Error ? liveTrainersQuery.error.message : undefined);

  const staffEmptyTitle = searchNeedle
    ? t('team.emptySearchTitle')
    : branchScoped
      ? t('team.emptyBranchTitle')
      : t('team.emptyTitle');
  const staffEmptyBody = searchNeedle
    ? t('team.emptySearchBody')
    : branchScoped
      ? t('team.emptyBranchBody')
      : t('team.emptyBody');

  const trainersEmptyTitle = searchNeedle
    ? t('team.emptySearchTitle')
    : formerTrainers
      ? t('team.emptyFormerTrainers')
      : branchScoped
        ? t('team.emptyBranchTrainers')
        : t('team.emptyTrainersTitle');
  const trainersEmptyBody = searchNeedle
    ? t('team.emptySearchBody')
    : formerTrainers
      ? t('team.emptyFormerTrainersBody')
      : branchScoped
        ? t('team.emptyBranchTrainersBody')
        : t('team.emptyTrainersBody');

  return (
    <TabScreenFrame>
    <View style={styles.container}>
      <BranchFilterBar horizontalPadding={pagePadding} />
      <View style={{ paddingTop: 4 }}>{toolbar}</View>
      {loading ? (
        <PageSkeleton variant="list-cards" />
      ) : loadError ? (
        <LoadError message={errMsg} onRetry={() => void retry()} />
      ) : tab === 'staff' ? (
        <FlatList
          key={`team-cols-${listColumns}`}
          data={displayedStaff}
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
            <EmptyState icon="people-outline" title={staffEmptyTitle} body={staffEmptyBody} />
          }
        />
      ) : (
        <FlatList
          data={displayedTrainers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TrainerCard
              trainer={item}
              former={formerTrainers}
              onEdit={() => router.push(`/team/trainers/${item.id}/edit` as Href)}
              onArchive={() => setArchiveTarget(item)}
              onRestore={() => restoreMutation.mutate(item.id)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingHorizontal: pagePadding }]}
          refreshControl={
            <RefreshControl
              refreshing={
                formerTrainers ? formerTrainersQuery.isRefetching : liveTrainersQuery.isRefetching
              }
              onRefresh={() => {
                void liveTrainersQuery.refetch();
                if (formerTrainers) void formerTrainersQuery.refetch();
              }}
              tintColor={c.accentText}
            />
          }
          ListEmptyComponent={
            <EmptyState icon="barbell-outline" title={trainersEmptyTitle} body={trainersEmptyBody} />
          }
        />
      )}

      {!readOnly && !(tab === 'trainers' && formerTrainers) ? (
        <Pressable
          style={[styles.fab, fabElevation(theme), { right: fabRight, bottom: fabBottom, width: fabSize, height: fabSize, borderRadius: fabRadius }]}
          onPress={() => {
            if (tab === 'trainers') router.push('/team/trainers/new' as Href);
            else router.push('/team/new');
          }}
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
        visible={Boolean(archiveTarget)}
        title={t('team.archiveTrainerTitle')}
        message={t('team.archiveTrainerBody', { name: archiveTarget?.name ?? '' })}
        confirmLabel={t('team.archiveTrainer')}
        destructive
        confirmLoading={archiveMutation.isPending}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (!archiveTarget) return;
          archiveMutation.mutate(archiveTarget.id);
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
