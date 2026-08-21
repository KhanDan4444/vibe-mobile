import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText as Text } from '@/src/components/AppText';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { CheckInMemberCard } from '@/src/components/CheckInMemberCard';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { EmptyState } from '@/src/components/EmptyState';
import { LoadError } from '@/src/components/LoadError';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { SearchField } from '@/src/components/SearchField';
import { CheckInSearchSkeleton, PageSkeleton } from '@/src/components/Skeleton';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { SecondaryButton } from '@/src/components/ui/Button';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useAuth } from '@/src/auth/AuthContext';
import {
  createCheckIn,
  fetchAttendanceSettings,
  listCheckIns,
  searchCheckInMembers,
  updateAttendanceSettings,
  type AttendanceSettings,
  type CheckInMember,
  type CheckInRow,
} from '@/src/api/checkIns';
import { ApiError } from '@/src/api/client';
import { useBranchScope } from '@/src/context/BranchContext';
import { useFlash } from '@/src/context/FlashContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { formatDisplayDate } from '@/src/utils/date';
import { isGymOwner } from '@/src/utils/roles';

const CAP_OPTIONS: { value: number | null; labelKey: string }[] = [
  { value: null, labelKey: 'checkIn.capUnlimited' },
  { value: 4, labelKey: 'checkIn.capDays' },
  { value: 5, labelKey: 'checkIn.capDays' },
  { value: 6, labelKey: 'checkIn.capDays' },
];

const TODAY_PAGE_SIZE = 40;
const TODAY_MAX = 100;

type CardError = { code: string; message: string };
type SearchCache = { members: CheckInMember[]; settings: AttendanceSettings };

function isExpiredStatus(status: string) {
  return (status || '').toLowerCase() === 'expired';
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CheckInScreen() {
  const { t } = useTranslation();
  const { token, user } = useAuth();
  const { colors: c, theme } = useTheme();
  const isLight = theme === 'light';
  const { showFlash } = useFlash();
  const { readOnly } = useGymReadOnly();
  const { selectedBranchId, showBranchFilter } = useBranchScope();
  const { pagePadding, listColumns, listColumnItemStyle } = useResponsiveLayout();
  const queryClient = useQueryClient();
  const owner = isGymOwner(user?.role);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [todayLimit, setTodayLimit] = useState(TODAY_PAGE_SIZE);
  const [cardErrors, setCardErrors] = useState<Record<number, CardError>>({});
  const [successIds, setSuccessIds] = useState<Record<number, boolean>>({});
  const [forceTarget, setForceTarget] = useState<{
    member: CheckInMember;
    visits: number;
    limit: number | null;
  } | null>(null);

  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const showBranchOnToday = showBranchFilter;
  const searchKey = ['check-ins-search', debounced, branchKey] as const;

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    setCardErrors({});
    setSuccessIds({});
  }, [debounced, branchKey]);

  useEffect(() => {
    setTodayLimit(TODAY_PAGE_SIZE);
  }, [branchKey]);

  const settingsQuery = useQuery({
    queryKey: ['check-in-settings'],
    queryFn: () => fetchAttendanceSettings(token!),
    enabled: Boolean(token),
  });

  const todayQuery = useQuery({
    queryKey: ['check-ins', 'today', branchKey, todayLimit],
    queryFn: () => listCheckIns(token!, { limit: todayLimit, branchId: selectedBranchId }),
    enabled: Boolean(token),
  });

  const searchQuery = useQuery({
    queryKey: searchKey,
    queryFn: () =>
      searchCheckInMembers(token!, { q: debounced, limit: 20, branchId: selectedBranchId }),
    enabled: Boolean(token) && debounced.length > 0,
  });

  const settings = settingsQuery.data?.settings ?? searchQuery.data?.settings ?? null;
  const canManage = Boolean(settingsQuery.data?.canManage && owner);
  const members = searchQuery.data?.members ?? [];
  const todayRows = todayQuery.data?.checkIns ?? [];
  const todayTotal = todayQuery.data?.total ?? 0;
  const todayDate = todayQuery.data?.date ?? '';
  const alreadyTodayIds = useMemo(
    () => new Set(todayRows.map((row) => row.member_id)),
    [todayRows]
  );

  const capChipLabel = useMemo(() => {
    if (!settings) return null;
    if (settings.visits_per_week == null) return t('checkIn.capChipUnlimited');
    return t('checkIn.capChipDays', { count: settings.visits_per_week });
  }, [settings, t]);

  const invalidateCheckIns = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['check-ins'] }),
      queryClient.invalidateQueries({ queryKey: ['check-ins-search'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  }, [queryClient]);

  const checkInMutation = useMutation({
    mutationFn: (payload: { member: CheckInMember; force?: boolean }) =>
      createCheckIn(token!, { member_id: payload.member.id, force: payload.force }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: [...searchKey] });
      const previous = queryClient.getQueryData<SearchCache>([...searchKey]);
      queryClient.setQueryData<SearchCache>([...searchKey], (old) => {
        if (!old) return old;
        return {
          ...old,
          members: old.members.map((m) =>
            m.id === vars.member.id
              ? { ...m, visits_this_week: (m.visits_this_week || 0) + 1 }
              : m
          ),
        };
      });
      return { previous };
    },
    onSuccess: async (data, vars) => {
      setCardErrors((prev) => ({
        ...prev,
        [vars.member.id]: { code: 'ALREADY_TODAY', message: t('checkIn.alreadyToday') },
      }));
      setSuccessIds((prev) => ({ ...prev, [vars.member.id]: true }));
      setTimeout(() => {
        setSuccessIds((prev) => {
          const next = { ...prev };
          delete next[vars.member.id];
          return next;
        });
      }, 900);
      queryClient.setQueryData<SearchCache>([...searchKey], (old) => {
        if (!old) return old;
        return {
          ...old,
          members: old.members.map((m) =>
            m.id === vars.member.id
              ? { ...m, visits_this_week: data.visits_this_week, visits_limit: data.visits_limit }
              : m
          ),
        };
      });
      await invalidateCheckIns();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showFlash({
        title: t('checkIn.checkedInTitle'),
        subtitle: t('checkIn.checkedInSub', {
          name: vars.member.name,
          progress:
            data.visits_limit != null
              ? `${data.visits_this_week}/${data.visits_limit}`
              : String(data.visits_this_week),
        }),
        variant: 'success',
      });
    },
    onError: (err, vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData([...searchKey], ctx.previous);
      }
      const apiErr = err instanceof ApiError ? err : null;
      const code = apiErr?.code || '';
      const details = (apiErr?.details || {}) as Record<string, unknown>;
      if (code === 'WEEKLY_LIMIT' && details.can_force && apiErr?.status === 409) {
        setForceTarget({
          member: vars.member,
          visits: Number(details.visits_this_week) || vars.member.visits_this_week,
          limit:
            details.visits_limit == null
              ? vars.member.visits_limit
              : Number(details.visits_limit),
        });
        return;
      }
      if (code === 'ALREADY_TODAY' || code === 'WEEKLY_LIMIT') {
        const message =
          code === 'ALREADY_TODAY'
            ? t('checkIn.alreadyToday')
            : t('checkIn.weeklyLimitReached');
        setCardErrors((prev) => ({ ...prev, [vars.member.id]: { code, message } }));
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      showFlash({
        title: userFacingApiMessage(err, t('checkIn.checkInFailed'), t('checkIn.checkInFailed')),
        variant: 'danger',
      });
    },
  });

  const saveCapMutation = useMutation({
    mutationFn: (visits_per_week: number | null) =>
      updateAttendanceSettings(token!, { visits_per_week }),
    onSuccess: async (data) => {
      queryClient.setQueryData(['check-in-settings'], {
        settings: data.settings,
        canManage: true,
      });
      setSettingsOpen(false);
      showFlash({ title: t('checkIn.settingsSaved'), variant: 'success' });
      if (debounced) {
        await queryClient.invalidateQueries({ queryKey: ['check-ins-search'] });
      }
    },
    onError: (err) => {
      showFlash({
        title: userFacingApiMessage(err, t('checkIn.settingsFailed'), t('checkIn.settingsFailed')),
        variant: 'danger',
      });
    },
  });

  const runCheckIn = (member: CheckInMember, force = false) => {
    if (readOnly || isExpiredStatus(member.status)) return;
    if (checkInMutation.isPending) return;
    if (
      alreadyTodayIds.has(member.id) ||
      cardErrors[member.id]?.code === 'ALREADY_TODAY' ||
      successIds[member.id]
    ) {
      return;
    }
    checkInMutation.mutate({ member, force });
  };

  const refreshing = todayQuery.isRefetching || settingsQuery.isRefetching;
  const onRefresh = () => {
    void todayQuery.refetch();
    void settingsQuery.refetch();
    if (debounced) void searchQuery.refetch();
  };

  const styles = useThemedStyles((theme) => ({
    scroll: { flex: 1, backgroundColor: theme.bg },
    content: { paddingBottom: 48, paddingHorizontal: pagePadding, gap: 16 },
    hero: {
      padding: 18,
      gap: 16,
      overflow: 'hidden' as const,
      // Light only: teal-tinted panel so it isn’t a flat white slab
      ...(isLight ? { backgroundColor: 'rgba(204, 251, 241, 0.72)' } : null),
    },
    heroWash: {
      position: 'absolute' as const,
      top: isLight ? -56 : -48,
      right: isLight ? -40 : -36,
      width: isLight ? 168 : 140,
      height: isLight ? 168 : 140,
      borderRadius: 999,
      backgroundColor: isLight ? 'rgba(15,118,110,0.22)' : theme.accentSoft,
      opacity: isLight ? 1 : 0.75,
    },
    heroWashSecondary: {
      position: 'absolute' as const,
      bottom: -28,
      left: -32,
      width: 120,
      height: 120,
      borderRadius: 999,
      backgroundColor: 'rgba(15,118,110,0.1)',
      // Light-only second orb (dark keeps the original single wash)
      display: isLight ? ('flex' as const) : ('none' as const),
    },
    heroTop: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 12,
    },
    deskRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    deskLabel: {
      fontSize: 22,
      fontWeight: '700' as const,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
      color: theme.text,
    },
    capChip: {
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.accentText,
      backgroundColor: theme.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    capChipText: { fontSize: 10, fontWeight: '700' as const, color: theme.accentText },
    todayStat: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    todayCount: {
      fontSize: 56,
      fontWeight: '700' as const,
      fontVariant: ['tabular-nums' as const],
      color: theme.text,
      lineHeight: 56,
      letterSpacing: -1.5,
    },
    todayLabelCol: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    todayLabel: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 0.7,
      textTransform: 'uppercase' as const,
      color: theme.dim,
      textAlign: 'center' as const,
    },
    todayUnder: {
      marginTop: 2,
      fontSize: 10,
      fontWeight: '700' as const,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      color: theme.dim,
      textAlign: 'center' as const,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700' as const,
      color: theme.text,
      letterSpacing: -0.2,
      marginBottom: 2,
    },
    sectionMeta: { fontSize: 12, color: theme.dim, marginBottom: 10 },
    todayHeader: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      justifyContent: 'space-between' as const,
      gap: 10,
      marginTop: 4,
      marginBottom: 4,
    },
    todayChip: {
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.accentText,
      backgroundColor: theme.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    todayChipText: { fontSize: 11, fontWeight: '700' as const, color: theme.accentText },
    todayPanel: { paddingVertical: 4, paddingHorizontal: 4, overflow: 'hidden' as const },
    todayRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 10,
      borderRadius: 14,
    },
    todayRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      marginHorizontal: 8,
    },
    todayName: {
      fontSize: 15,
      fontWeight: '700' as const,
      color: theme.text,
      letterSpacing: -0.15,
    },
    todayBranch: { marginTop: 2, fontSize: 11, color: theme.dim },
    todayTime: {
      fontSize: 15,
      fontWeight: '700' as const,
      fontVariant: ['tabular-nums' as const],
      letterSpacing: -0.15,
      color: theme.text,
    },
    showMoreWrap: { marginTop: 4, paddingHorizontal: 8, paddingBottom: 8, gap: 8 },
    showMoreMeta: { fontSize: 11, textAlign: 'center' as const, color: theme.dim },
    resultsGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 10,
    },
    resultItem: {
      marginBottom: 0,
    },
    idleWrap: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 16 },
    idleCopy: { alignItems: 'center' as const, marginBottom: 14, gap: 4 },
    idleTitle: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: theme.text,
      textAlign: 'center' as const,
      letterSpacing: -0.15,
    },
    idleBody: {
      fontSize: 12,
      lineHeight: 17,
      color: theme.muted,
      textAlign: 'center' as const,
      maxWidth: 280,
    },
    idleHint: {
      marginTop: 12,
      fontSize: 11,
      color: theme.dim,
      textAlign: 'center' as const,
    },
    ghostRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 8,
      opacity: 0.35,
    },
    ghostAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.border,
    },
    ghostLines: { flex: 1, gap: 8 },
    ghostLine: {
      height: 10,
      borderRadius: 999,
      backgroundColor: theme.border,
    },
    ghostTime: {
      width: 36,
      height: 10,
      borderRadius: 999,
      backgroundColor: theme.border,
    },
    sheetBody: { fontSize: 13, lineHeight: 19, color: theme.muted, marginBottom: 10 },
  }));

  if (!token) return null;

  if (todayQuery.isLoading && settingsQuery.isLoading) {
    return (
      <TabScreenFrame>
        <PageSkeleton />
      </TabScreenFrame>
    );
  }

  if (todayQuery.isError && !todayQuery.data) {
    return (
      <TabScreenFrame>
        <LoadError
          message={userFacingApiMessage(todayQuery.error, t('checkIn.loadFailed'), t('checkIn.loadFailed'))}
          onRetry={() => void todayQuery.refetch()}
        />
      </TabScreenFrame>
    );
  }

  return (
    <TabScreenFrame>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
        }
      >
        <BranchFilterBar />

        <Animated.View entering={FadeIn.duration(280)}>
          <SoftSurface variant="panel" style={styles.hero}>
            <View style={styles.heroWash} pointerEvents="none" />
            <View style={styles.heroWashSecondary} pointerEvents="none" />
            <View style={styles.heroTop}>
              <View style={styles.deskRow}>
                <Text display style={styles.deskLabel}>
                  {t('checkIn.deskLabel')}
                </Text>
                {capChipLabel ? (
                  <Pressable
                    disabled={!canManage || readOnly}
                    onPress={() => canManage && setSettingsOpen(true)}
                    style={styles.capChip}
                  >
                    <Text style={styles.capChipText}>{capChipLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.todayStat}>
                <Text display style={styles.todayCount}>
                  {todayQuery.isLoading ? '—' : todayTotal}
                </Text>
                <View style={styles.todayLabelCol}>
                  <Text style={styles.todayLabel}>
                    {t('checkIn.todayMembersShort', { count: todayTotal })}
                  </Text>
                  <Text style={styles.todayUnder}>{t('checkIn.todayCount')}</Text>
                </View>
              </View>
            </View>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={t('checkIn.searchPlaceholder')}
            />
          </SoftSurface>
        </Animated.View>

        {debounced ? (
          <View>
            <Text style={styles.sectionTitle}>{t('checkIn.resultsTitle')}</Text>
            {searchQuery.isLoading ? (
              <CheckInSearchSkeleton count={listColumns > 1 ? 4 : 2} columns={listColumns} />
            ) : searchQuery.isError ? (
              <LoadError
                message={userFacingApiMessage(
                  searchQuery.error,
                  t('checkIn.searchFailed'),
                  t('checkIn.searchFailed')
                )}
                onRetry={() => void searchQuery.refetch()}
              />
            ) : members.length === 0 ? (
              <EmptyState
                tone="quiet"
                compact
                icon="search-outline"
                title={t('checkIn.noMatchesTitle')}
                body={t('checkIn.noMatchesBody')}
              />
            ) : (
              <View style={listColumns > 1 ? styles.resultsGrid : undefined}>
                {members.map((member, index) => (
                  <View
                    key={member.id}
                    style={[
                      listColumns > 1 ? listColumnItemStyle : null,
                      listColumns === 1 ? { marginBottom: 10 } : styles.resultItem,
                    ]}
                  >
                    <CheckInMemberCard
                      member={member}
                      token={token}
                      settings={settings}
                      cardError={cardErrors[member.id]}
                      busy={
                        checkInMutation.isPending &&
                        checkInMutation.variables?.member.id === member.id
                      }
                      success={Boolean(successIds[member.id])}
                      alreadyToday={
                        alreadyTodayIds.has(member.id) ||
                        Boolean(successIds[member.id]) ||
                        cardErrors[member.id]?.code === 'ALREADY_TODAY'
                      }
                      readOnly={readOnly}
                      index={index}
                      onCheckIn={() => runCheckIn(member)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <View>
          <View style={styles.todayHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.sectionTitle}>{t('checkIn.todayTitle')}</Text>
              <Text style={styles.sectionMeta}>
                {todayDate ? formatDisplayDate(todayDate) : '—'}
              </Text>
            </View>
            {todayTotal > 0 ? (
              <View style={styles.todayChip}>
                <Text style={styles.todayChipText}>
                  {t('checkIn.todayMembers', { count: todayTotal })}
                </Text>
              </View>
            ) : null}
          </View>

          {todayRows.length === 0 ? (
            <SoftSurface variant="panel" style={styles.idleWrap}>
              <View style={styles.idleCopy}>
                <Text display style={styles.idleTitle}>
                  {t('checkIn.todayEmptyTitle')}
                </Text>
                <Text style={styles.idleBody}>{t('checkIn.todayEmpty')}</Text>
              </View>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.ghostRow} accessibilityElementsHidden>
                  <View style={styles.ghostAvatar} />
                  <View style={styles.ghostLines}>
                    <View style={[styles.ghostLine, { width: '42%' }]} />
                    <View style={[styles.ghostLine, { width: '28%', height: 8 }]} />
                  </View>
                  <View style={styles.ghostTime} />
                </View>
              ))}
              <Text style={styles.idleHint}>{t('checkIn.todayEmptyHint')}</Text>
            </SoftSurface>
          ) : (
            <SoftSurface variant="panel" style={styles.todayPanel}>
              {todayRows.map((row: CheckInRow, index: number) => (
                <View key={row.id}>
                  {index > 0 ? <View style={styles.todayRowDivider} /> : null}
                  <View style={styles.todayRow}>
                    <MemberPhoto
                      memberId={row.member_id}
                      name={row.member_name || '?'}
                      token={token}
                      size={42}
                      hasPhoto={Boolean(row.member_photo_url)}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text display style={styles.todayName} numberOfLines={1}>
                        {row.member_name || '—'}
                      </Text>
                      {showBranchOnToday && row.branch_name ? (
                        <Text style={styles.todayBranch} numberOfLines={1}>
                          {row.branch_name}
                        </Text>
                      ) : null}
                    </View>
                    <Text display style={styles.todayTime}>
                      {formatTime(row.checked_in_at)}
                    </Text>
                  </View>
                </View>
              ))}
              {todayTotal > todayRows.length ? (
                <View style={styles.showMoreWrap}>
                  <Text style={styles.showMoreMeta}>
                    {t('checkIn.showingOf', { shown: todayRows.length, total: todayTotal })}
                  </Text>
                  {todayRows.length < TODAY_MAX ? (
                    <SecondaryButton
                      label={t('checkIn.showMore')}
                      onPress={() =>
                        setTodayLimit((n) => Math.min(TODAY_MAX, n + TODAY_PAGE_SIZE))
                      }
                    />
                  ) : null}
                </View>
              ) : null}
            </SoftSurface>
          )}
        </View>
      </ScrollView>

      <BottomSheet
        visible={settingsOpen && canManage}
        title={t('checkIn.visitRulesTitle')}
        onClose={() => setSettingsOpen(false)}
        showCloseButton
      >
        <Text style={styles.sheetBody}>{t('checkIn.visitRulesBody')}</Text>
        {CAP_OPTIONS.map((opt) => {
          const active = (settings?.visits_per_week ?? null) === opt.value;
          return (
            <SheetOption
              key={String(opt.value)}
              label={
                opt.value == null ? t(opt.labelKey) : t(opt.labelKey, { count: opt.value })
              }
              selected={active}
              onPress={() => {
                if (readOnly || saveCapMutation.isPending) return;
                saveCapMutation.mutate(opt.value);
              }}
            />
          );
        })}
        {saveCapMutation.isPending ? (
          <ActivityIndicator color={c.accent} style={{ marginTop: 8 }} />
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        visible={Boolean(forceTarget)}
        title={t('checkIn.forceTitle')}
        message={t('checkIn.forceMessage', {
          name: forceTarget?.member.name,
          count: forceTarget?.visits,
          limit: forceTarget?.limit,
        })}
        confirmLabel={t('checkIn.forceConfirm')}
        destructive={false}
        confirmLoading={checkInMutation.isPending}
        onCancel={() => setForceTarget(null)}
        onConfirm={() => {
          const member = forceTarget?.member;
          setForceTarget(null);
          if (member) runCheckIn(member, true);
        }}
      />
    </TabScreenFrame>
  );
}
