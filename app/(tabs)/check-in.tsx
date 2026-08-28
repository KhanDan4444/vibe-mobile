import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  unstable_batchedUpdates,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppText as Text } from '@/src/components/AppText';
import { AttendanceHistorySheet } from '@/src/components/AttendanceHistorySheet';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { CheckInMemberCard } from '@/src/components/CheckInMemberCard';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { EmptyState } from '@/src/components/EmptyState';
import { LoadError } from '@/src/components/LoadError';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { ScanQrDockButton, SCAN_QR_DOCK_BOTTOM } from '@/src/components/ScanQrDockButton';
import { ScanMemberQrSheet } from '@/src/components/ScanMemberQrSheet';
import { SearchField } from '@/src/components/SearchField';
import { CheckInSearchSkeleton, PageSkeleton } from '@/src/components/Skeleton';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
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
import { useTabBarOverlayInset } from '@/src/theme/tabBar';
import { timings } from '@/src/theme/motion';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { metricDisplayStyle } from '@/src/theme/typography';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { todayString, formatDisplayDate, formatDisplayTime } from '@/src/utils/date';
import { isGymOwner } from '@/src/utils/roles';

const CAP_OPTIONS: { value: number | null; labelKey: string }[] = [
  { value: null, labelKey: 'checkIn.capUnlimited' },
  { value: 4, labelKey: 'checkIn.capDays' },
  { value: 5, labelKey: 'checkIn.capDays' },
  { value: 6, labelKey: 'checkIn.capDays' },
];

const TODAY_LIST_LIMIT = 200;
const TODAY_PREVIEW = 10;
const EMPTY_LIST: never[] = [];

/** Match web desk hero — brand→raised (light) / brand→surface (dark). */
function DeskHeroAtmosphere({ isLight }: { isLight: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          {isLight ? (
            <LinearGradient id="deskHeroFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#D8E9E8" />
              <Stop offset="42%" stopColor="#F3F8F8" />
              <Stop offset="100%" stopColor="#FFFFFF" />
            </LinearGradient>
          ) : (
            <LinearGradient id="deskHeroFill" x1="0%" y1="0%" x2="85%" y2="100%">
              <Stop offset="0%" stopColor="#1B2C32" />
              <Stop offset="55%" stopColor="#1A1E26" />
              <Stop offset="100%" stopColor="#1A1E26" />
            </LinearGradient>
          )}
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#deskHeroFill)" />
      </Svg>
      <View
        style={[
          stylesAtmosphere.orbPrimary,
          isLight ? stylesAtmosphere.orbPrimaryLight : stylesAtmosphere.orbPrimaryDark,
        ]}
      />
      {isLight ? <View style={stylesAtmosphere.orbSecondaryLight} /> : null}
    </View>
  );
}

const stylesAtmosphere = StyleSheet.create({
  orbPrimary: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPrimaryLight: {
    top: -64,
    right: -48,
    width: 224,
    height: 224,
    backgroundColor: 'rgba(15,118,110,0.16)',
  },
  orbPrimaryDark: {
    top: -80,
    right: -64,
    width: 192,
    height: 192,
    backgroundColor: 'rgba(45,212,191,0.05)',
  },
  orbSecondaryLight: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 144,
    height: 144,
    borderRadius: 999,
    backgroundColor: 'rgba(15,118,110,0.07)',
  },
});

type CardError = { code: string; message: string };
type SearchCache = { members: CheckInMember[]; settings: AttendanceSettings };

function isExpiredStatus(status: string) {
  return (status || '').toLowerCase() === 'expired';
}

export default function CheckInScreen() {
  const { t, i18n } = useTranslation();
  const { token, user } = useAuth();
  const { colors: c, theme } = useTheme();
  const isLight = theme === 'light';
  const { showFlash } = useFlash();
  const { readOnly } = useGymReadOnly();
  const { selectedBranchId, showBranchFilter } = useBranchScope();
  const { pagePadding, listColumns, listColumnItemStyle } = useResponsiveLayout();
  const tabOverlayInset = useTabBarOverlayInset();
  const queryClient = useQueryClient();
  const owner = isGymOwner(user?.role);
  const seedParams = useLocalSearchParams<{ q?: string; memberId?: string }>();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [todayExpanded, setTodayExpanded] = useState(false);
  const [cardErrors, setCardErrors] = useState<Record<number, CardError>>({});
  const [successIds, setSuccessIds] = useState<Record<number, boolean>>({});
  const [forceTarget, setForceTarget] = useState<{
    member: CheckInMember;
    visits: number;
    limit: number | null;
    passToken?: string;
  } | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const router = useRouter();

  const branchKey = selectedBranchId === 'all' ? 'all' : selectedBranchId;
  const showBranchOnToday = showBranchFilter && selectedBranchId === 'all';
  const searchKey = ['check-ins-search', debounced, branchKey] as const;

  // Re-apply whenever member detail pushes new q/memberId (tab stays mounted).
  useEffect(() => {
    const seedQ = typeof seedParams.q === 'string' ? seedParams.q.trim() : '';
    const rawId = seedParams.memberId;
    const seedMember = Array.isArray(rawId) ? rawId[0] : rawId;
    const hasMember =
      seedMember != null && String(seedMember).trim().length > 0;
    if (!seedQ && !hasMember) return;

    if (seedQ) {
      setQuery(seedQ);
      setDebounced(seedQ);
    }
    // Clear so the same member can seed again on a later visit.
    router.setParams({ q: '', memberId: '' });
  }, [seedParams.q, seedParams.memberId, router]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    setCardErrors({});
    setSuccessIds({});
  }, [debounced, branchKey]);

  useEffect(() => {
    setTodayExpanded(false);
  }, [branchKey]);

  const settingsQuery = useQuery({
    queryKey: ['check-in-settings'],
    queryFn: () => fetchAttendanceSettings(token!),
    enabled: Boolean(token),
  });

  const weekStartsOn = settingsQuery.data?.settings?.week_starts_on || 'monday';

  const todaySnapQuery = useQuery({
    queryKey: ['check-ins', 'today-snap', branchKey],
    queryFn: () =>
      listCheckIns(token!, {
        date: todayString(),
        limit: TODAY_LIST_LIMIT,
        branchId: selectedBranchId,
      }),
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
  const todayRows = todaySnapQuery.data?.checkIns ?? [];
  const todayTotal = todaySnapQuery.data?.total ?? 0;
  const todayHasMore = todayRows.length > TODAY_PREVIEW;
  const visibleTodayRows =
    todayExpanded || !todayHasMore ? todayRows : todayRows.slice(0, TODAY_PREVIEW);
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
    onSuccess: (data, vars) => {
      // One paint: toast + ring tick + visit count (refetch stays background).
      unstable_batchedUpdates(() => {
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
        setCardErrors((prev) => ({
          ...prev,
          [vars.member.id]: { code: 'ALREADY_TODAY', message: t('checkIn.alreadyToday') },
        }));
        setSuccessIds((prev) => ({ ...prev, [vars.member.id]: true }));
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
      });
      setTimeout(() => {
        setSuccessIds((prev) => {
          const next = { ...prev };
          delete next[vars.member.id];
          return next;
        });
      }, 700);
      void invalidateCheckIns();
    },
    onError: (err, vars) => {
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

  const runCheckInFromPass = async (passToken: string, force = false) => {
    if (readOnly || !token || !passToken) return;
    setScanBusy(true);
    try {
      const data = await createCheckIn(token, { member_pass_token: passToken, force });
      const memberId = data.member?.id ?? data.checkIn?.member_id;
      unstable_batchedUpdates(() => {
        showFlash({
          title: t('checkIn.checkedInTitle'),
          subtitle: t('checkIn.checkedInSub', {
            name: data.member?.name || '—',
            progress:
              data.visits_limit != null
                ? `${data.visits_this_week}/${data.visits_limit}`
                : String(data.visits_this_week),
          }),
          variant: 'success',
        });
        setScanOpen(false);
        if (memberId != null) {
          setCardErrors((prev) => ({
            ...prev,
            [memberId]: { code: 'ALREADY_TODAY', message: t('checkIn.alreadyToday') },
          }));
          setSuccessIds((prev) => ({ ...prev, [memberId]: true }));
        }
      });
      if (memberId != null) {
        setTimeout(() => {
          setSuccessIds((prev) => {
            const next = { ...prev };
            delete next[memberId];
            return next;
          });
        }, 900);
      }
      void invalidateCheckIns();
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const code = apiErr?.code || '';
      const details = (apiErr?.details || {}) as Record<string, unknown>;
      if (code === 'WEEKLY_LIMIT' && details.can_force && apiErr?.status === 409) {
        setForceTarget({
          member: {
            id: Number(details.member_id) || 0,
            name: String(details.member_name || t('checkIn.scanTitle')),
            phone: null,
            photo_url: null,
            plan_name: null,
            branch_id: null,
            branch_name: null,
            status: 'active',
            end_date: null,
            is_unpaid: false,
            trainer_name: null,
            visits_this_week: Number(details.visits_this_week) || 0,
            visits_limit:
              details.visits_limit == null ? null : Number(details.visits_limit),
          },
          visits: Number(details.visits_this_week) || 0,
          limit: details.visits_limit == null ? null : Number(details.visits_limit),
          passToken,
        });
        setScanOpen(false);
        return;
      }
      if (code === 'ALREADY_TODAY') {
        const memberId = Number(details.member_id);
        const memberName = String(details.member_name || '').trim();
        if (Number.isFinite(memberId) && memberId > 0) {
          setCardErrors((prev) => ({
            ...prev,
            [memberId]: { code: 'ALREADY_TODAY', message: t('checkIn.alreadyToday') },
          }));
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showFlash({
          title: t('checkIn.alreadyToday'),
          subtitle: memberName || undefined,
          variant: 'warning',
        });
        setScanOpen(false);
        return;
      }
      if (code === 'WEEKLY_LIMIT') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showFlash({
          title: t('checkIn.weeklyLimitReached'),
          subtitle: details.member_name ? String(details.member_name) : undefined,
          variant: 'warning',
        });
        setScanOpen(false);
        return;
      }
      showFlash({
        title: userFacingApiMessage(err, t('checkIn.checkInFailed'), t('checkIn.checkInFailed')),
        variant: 'danger',
      });
    } finally {
      setScanBusy(false);
    }
  };

  const refreshing = todaySnapQuery.isRefetching || settingsQuery.isRefetching;
  const onRefresh = () => {
    void todaySnapQuery.refetch();
    void settingsQuery.refetch();
    if (debounced) void searchQuery.refetch();
  };

  const styles = useThemedStyles((theme) => ({
    scroll: { flex: 1, backgroundColor: theme.bg },
    content: { paddingBottom: 48, paddingHorizontal: pagePadding, gap: 16 },
    hero: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 14,
      overflow: 'hidden' as const,
      backgroundColor: 'transparent',
    },
    heroTop: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 12,
      marginBottom: 14,
    },
    deskCol: {
      flex: 1,
      minWidth: 0,
      gap: 5,
    },
    deskLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      letterSpacing: 1.1,
      textTransform: 'uppercase' as const,
      color: theme.muted,
    },
    capChip: {
      alignSelf: 'flex-start' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 4,
      marginTop: 2,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
    capChipAction: {
      borderColor: isLight ? 'rgba(15,118,110,0.22)' : 'rgba(45,212,191,0.28)',
      backgroundColor: isLight ? 'rgba(15,118,110,0.08)' : 'rgba(45,212,191,0.12)',
    },
    capChipIdle: {
      borderColor: isLight ? 'rgba(15,118,110,0.12)' : theme.border,
      backgroundColor: isLight ? 'rgba(255,255,255,0.45)' : theme.inputBg,
    },
    capChipText: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 0.15,
      color: theme.muted,
    },
    capChipTextAction: {
      color: isLight ? '#0f766e' : '#99f6e4',
    },
    todayCount: {
      fontSize: 56,
      lineHeight: 56,
      letterSpacing: -1.6,
      color: isLight ? '#0f172a' : '#e4e7ee',
    },
    deskTools: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isLight ? 'rgba(15,118,110,0.14)' : theme.border,
    },
    deskSearch: {
      flex: 1,
      minWidth: 0,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
      color: theme.text,
      letterSpacing: -0.25,
      marginBottom: 2,
    },
    todayHeader: {
      marginTop: 2,
      marginBottom: 6,
      paddingVertical: 2,
      paddingHorizontal: 2,
      marginHorizontal: -2,
      borderRadius: 12,
    },
    todayHeaderTop: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 10,
    },
    todayHeaderCopy: { flex: 1, minWidth: 0 },
    todayDate: {
      marginTop: 3,
      fontSize: 12.5,
      fontWeight: '500' as const,
      fontVariant: ['tabular-nums' as const],
      color: theme.dim,
      letterSpacing: -0.1,
    },
    historyBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 11,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(228,231,238,0.12)',
      backgroundColor: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(228,231,238,0.06)',
    },
    historyBtnLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      letterSpacing: -0.1,
      color: theme.muted,
    },
    todayPanel: { paddingVertical: 2, paddingHorizontal: 4, overflow: 'hidden' as const },
    todayCard: {
      paddingVertical: 4,
      paddingHorizontal: 0,
      overflow: 'hidden' as const,
    },
    todayRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 14,
    },
    todayRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(228,231,238,0.08)',
      marginHorizontal: 14,
    },
    todayName: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: theme.text,
      letterSpacing: -0.2,
    },
    todayBranch: { marginTop: 2, fontSize: 12, color: theme.dim },
    todayTime: {
      fontSize: 13,
      letterSpacing: -0.15,
      color: theme.muted,
    },
    showMoreWrap: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(228,231,238,0.08)',
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 12,
      marginTop: 2,
    },
    showMoreBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 6,
      minHeight: 42,
      borderRadius: 12,
      backgroundColor: isLight ? 'rgba(15,23,42,0.04)' : 'rgba(228,231,238,0.06)',
      paddingHorizontal: 14,
    },
    showMoreLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      letterSpacing: -0.1,
      color: theme.muted,
    },
    showMoreMeta: {
      marginTop: 6,
      textAlign: 'center' as const,
      fontSize: 11,
      fontWeight: '500' as const,
      color: theme.dim,
    },
    resultsGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 10,
    },
    resultItem: {
      marginBottom: 0,
    },
    idleWrap: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 12 },
    sheetBody: { fontSize: 13, lineHeight: 19, color: theme.muted, marginBottom: 10 },
  }));

  if (!token) return null;

  if (todaySnapQuery.isLoading && settingsQuery.isLoading) {
    return (
      <TabScreenFrame>
        <PageSkeleton variant="check-in" />
      </TabScreenFrame>
    );
  }

  if (todaySnapQuery.isError && !todaySnapQuery.data) {
    return (
      <TabScreenFrame>
        <LoadError
          message={userFacingApiMessage(
            todaySnapQuery.error,
            t('checkIn.loadFailed'),
            t('checkIn.loadFailed')
          )}
          onRetry={() => void todaySnapQuery.refetch()}
        />
      </TabScreenFrame>
    );
  }

  return (
    <TabScreenFrame>
      <FlatList
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: SCAN_QR_DOCK_BOTTOM + 46 + 36 + tabOverlayInset },
        ]}
        data={EMPTY_LIST}
        keyExtractor={() => 'check-in-shell'}
        renderItem={() => null}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
        }
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <BranchFilterBar horizontalPadding={0} />

            <Animated.View entering={FadeIn.duration(280)}>
              <SoftSurface variant="panel" flat style={styles.hero}>
                <DeskHeroAtmosphere isLight={isLight} />
                <View style={styles.heroTop}>
                  <View style={styles.deskCol}>
                    <Text style={styles.deskLabel}>{t('checkIn.deskLabel')}</Text>
                    {capChipLabel ? (
                      <Pressable
                        disabled={!canManage || readOnly}
                        onPress={() => canManage && setSettingsOpen(true)}
                        hitSlop={6}
                        accessibilityRole={canManage && !readOnly ? 'button' : undefined}
                        accessibilityLabel={
                          canManage && !readOnly ? t('checkIn.visitRulesTitle') : capChipLabel
                        }
                        style={({ pressed }) => [
                          styles.capChip,
                          canManage && !readOnly ? styles.capChipAction : styles.capChipIdle,
                          pressed && canManage && !readOnly ? { opacity: 0.75 } : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.capChipText,
                            canManage && !readOnly ? styles.capChipTextAction : null,
                          ]}
                        >
                          {capChipLabel}
                        </Text>
                        {canManage && !readOnly ? (
                          <Ionicons
                            name="chevron-down"
                            size={12}
                            color={isLight ? '#0f766e' : '#99f6e4'}
                          />
                        ) : null}
                      </Pressable>
                    ) : null}
                  </View>
                  <Text latin display style={metricDisplayStyle(styles.todayCount)}>
                    {todaySnapQuery.isLoading ? '—' : todayTotal}
                  </Text>
                </View>
                <View style={styles.deskTools}>
                  <SearchField
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t('checkIn.searchPlaceholder')}
                    tone="inset"
                    style={styles.deskSearch}
                  />
                </View>
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

            <View style={styles.todayHeader}>
              <View style={styles.todayHeaderTop}>
                <View style={styles.todayHeaderCopy}>
                  <Text display style={[styles.sectionTitle, { marginBottom: 0 }]}>
                    {t('checkIn.checkedInTodayTitle')}
                  </Text>
                  <Text style={styles.todayDate}>
                    {todayRows.length > 0
                      ? t('checkIn.todayMeta', {
                          date: formatDisplayDate(todayString()),
                          count: todayRows.length,
                        })
                      : formatDisplayDate(todayString())}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('checkIn.historyTitle')}
                  onPress={() => {
                    void Haptics.selectionAsync().catch(() => undefined);
                    setHistoryOpen(true);
                  }}
                  hitSlop={6}
                  style={({ pressed }) => [styles.historyBtn, { opacity: pressed ? 0.72 : 1 }]}
                >
                  <Ionicons name="time-outline" size={15} color={c.muted} />
                  <Text style={styles.historyBtnLabel}>{t('checkIn.historyTitle')}</Text>
                </Pressable>
              </View>
            </View>

            {todayRows.length === 0 && !todaySnapQuery.isLoading ? (
              <SoftSurface variant="panel" style={styles.idleWrap}>
                <EmptyState
                  tone="quiet"
                  compact
                  icon="scan-outline"
                  title={t('checkIn.todayEmptyTitle')}
                  body={t('checkIn.todayEmpty')}
                  action={null}
                />
              </SoftSurface>
            ) : null}

            {todayRows.length > 0 ? (
              <Animated.View entering={FadeInDown.duration(timings.enterMs).springify().damping(22)}>
                <SoftSurface variant="panel" style={styles.todayCard}>
                  {visibleTodayRows.map((row, index) => (
                    <View key={row.id}>
                      {index > 0 ? <View style={styles.todayRowDivider} /> : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={row.member_name || undefined}
                        onPress={() => {
                          void Haptics.selectionAsync().catch(() => undefined);
                          router.push(`/member/${row.member_id}` as never);
                        }}
                        style={({ pressed }) => [styles.todayRow, { opacity: pressed ? 0.72 : 1 }]}
                      >
                        <MemberPhoto
                          memberId={row.member_id}
                          name={row.member_name || '?'}
                          token={token}
                          size={36}
                          hasPhoto={Boolean(row.member_photo_url)}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text listRow style={styles.todayName} numberOfLines={1}>
                            {row.member_name || '—'}
                          </Text>
                          {showBranchOnToday && row.branch_name ? (
                            <Text style={styles.todayBranch} numberOfLines={1}>
                              {row.branch_name}
                            </Text>
                          ) : null}
                        </View>
                        <Text latin display style={metricDisplayStyle(styles.todayTime)}>
                          {formatDisplayTime(row.checked_in_at, i18n.language)}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                  {todayHasMore ? (
                    <View style={styles.showMoreWrap}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          todayExpanded ? t('checkIn.showLess') : t('checkIn.showMore')
                        }
                        onPress={() => {
                          void Haptics.selectionAsync().catch(() => undefined);
                          setTodayExpanded((v) => !v);
                        }}
                        style={({ pressed }) => [styles.showMoreBtn, { opacity: pressed ? 0.82 : 1 }]}
                      >
                        <Text style={styles.showMoreLabel}>
                          {todayExpanded ? t('checkIn.showLess') : t('checkIn.showMore')}
                        </Text>
                        <Ionicons
                          name={todayExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={c.muted}
                        />
                      </Pressable>
                      <Text style={styles.showMoreMeta}>
                        {t('checkIn.showingOf', {
                          shown: visibleTodayRows.length,
                          total: todayRows.length,
                        })}
                      </Text>
                    </View>
                  ) : null}
                </SoftSurface>
              </Animated.View>
            ) : null}
          </View>
        }
      />

      <AttendanceHistorySheet
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        token={token}
        branchId={selectedBranchId}
        weekStartsOn={weekStartsOn === 'sunday' ? 'sunday' : 'monday'}
        showBranch={showBranchOnToday}
      />

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
        confirmLoading={checkInMutation.isPending || scanBusy}
        onCancel={() => setForceTarget(null)}
        onConfirm={() => {
          const target = forceTarget;
          setForceTarget(null);
          if (target?.passToken) {
            void runCheckInFromPass(target.passToken, true);
            return;
          }
          if (target?.member) runCheckIn(target.member, true);
        }}
      />

      <ScanMemberQrSheet
        visible={scanOpen}
        busy={scanBusy}
        onClose={() => {
          if (!scanBusy) setScanOpen(false);
        }}
        onScan={(token) => runCheckInFromPass(token)}
      />

      {!readOnly ? (
        <ScanQrDockButton
          label={t('checkIn.scanAction')}
          bottom={SCAN_QR_DOCK_BOTTOM + tabOverlayInset}
          onPress={() => setScanOpen(true)}
        />
      ) : null}
    </TabScreenFrame>
  );
}
