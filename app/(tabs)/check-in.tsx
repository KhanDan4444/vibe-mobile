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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppText as Text } from '@/src/components/AppText';
import { BranchFilterBar } from '@/src/components/BranchFilterBar';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { CheckInMemberCard } from '@/src/components/CheckInMemberCard';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { EmptyState } from '@/src/components/EmptyState';
import { LoadError } from '@/src/components/LoadError';
import { MemberPhoto } from '@/src/components/MemberPhoto';
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
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useTabBarOverlayInset } from '@/src/theme/tabBar';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import {
  attendanceWeekRange,
  formatAttendanceDayLabel,
  formatDisplayDate,
  groupCheckInsByDay,
  todayString,
} from '@/src/utils/date';
import { isGymOwner } from '@/src/utils/roles';

const CAP_OPTIONS: { value: number | null; labelKey: string }[] = [
  { value: null, labelKey: 'checkIn.capUnlimited' },
  { value: 4, labelKey: 'checkIn.capDays' },
  { value: 5, labelKey: 'checkIn.capDays' },
  { value: 6, labelKey: 'checkIn.capDays' },
];

const HISTORY_PAGE_SIZE = 80;
const HISTORY_MAX = 200;
const HISTORY_PREVIEW_DAYS = 3;

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

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function CheckInScreen() {
  const { t, i18n } = useTranslation();
  const { token, user } = useAuth();
  const { colors: c, theme } = useTheme();
  const { language } = usePreferences();
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
  const [weekScope, setWeekScope] = useState<'this' | 'last'>('this');
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE);
  const [historyExpanded, setHistoryExpanded] = useState(false);
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
  const showBranchOnToday = showBranchFilter;
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
    setHistoryLimit(HISTORY_PAGE_SIZE);
    setHistoryExpanded(false);
  }, [branchKey, weekScope]);

  const settingsQuery = useQuery({
    queryKey: ['check-in-settings'],
    queryFn: () => fetchAttendanceSettings(token!),
    enabled: Boolean(token),
  });

  const weekStartsOn = settingsQuery.data?.settings?.week_starts_on || 'monday';
  const weekRange = useMemo(
    () => attendanceWeekRange(weekScope, weekStartsOn),
    [weekScope, weekStartsOn]
  );

  const historyQuery = useQuery({
    queryKey: ['check-ins', 'history', branchKey, weekScope, weekRange.from, weekRange.to, historyLimit],
    queryFn: () =>
      listCheckIns(token!, {
        from: weekRange.from,
        to: weekRange.to,
        limit: historyLimit,
        branchId: selectedBranchId,
      }),
    enabled: Boolean(token),
  });

  const todaySnapQuery = useQuery({
    queryKey: ['check-ins', 'today-snap', branchKey],
    queryFn: () =>
      listCheckIns(token!, {
        date: todayString(),
        limit: 100,
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
  const historyRows = historyQuery.data?.checkIns ?? [];
  const historyTotal = historyQuery.data?.total ?? 0;
  const historyFrom = historyQuery.data?.from ?? weekRange.from;
  const historyTo = historyQuery.data?.to ?? weekRange.to;
  const historyByDay = useMemo(() => groupCheckInsByDay(historyRows), [historyRows]);
  const visibleDayGroups = historyExpanded
    ? historyByDay
    : historyByDay.slice(0, HISTORY_PREVIEW_DAYS);
  const historyHasMoreDays = !historyExpanded && historyByDay.length > HISTORY_PREVIEW_DAYS;
  const historyCanLoadMore =
    historyExpanded && historyTotal > historyRows.length && historyRows.length < HISTORY_MAX;
  const todayTotal = todaySnapQuery.data?.total ?? 0;
  const alreadyTodayIds = useMemo(
    () => new Set((todaySnapQuery.data?.checkIns ?? []).map((row) => row.member_id)),
    [todaySnapQuery.data?.checkIns]
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
    onSuccess: async (data, vars) => {
      // One beat: status + celebrate + visit count (no optimistic ring jump first).
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
      }, 700);
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
      if (memberId != null) {
        setCardErrors((prev) => ({
          ...prev,
          [memberId]: { code: 'ALREADY_TODAY', message: t('checkIn.alreadyToday') },
        }));
        setSuccessIds((prev) => ({ ...prev, [memberId]: true }));
        setTimeout(() => {
          setSuccessIds((prev) => {
            const next = { ...prev };
            delete next[memberId];
            return next;
          });
        }, 900);
      }
      await invalidateCheckIns();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const refreshing =
    historyQuery.isRefetching || todaySnapQuery.isRefetching || settingsQuery.isRefetching;
  const onRefresh = () => {
    void historyQuery.refetch();
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
      fontSize: 44,
      fontWeight: '700' as const,
      fontVariant: ['tabular-nums' as const],
      color: theme.text,
      lineHeight: 44,
      letterSpacing: -1.4,
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
    scanIconBtn: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: isLight ? 'rgba(255,255,255,0.62)' : theme.inputBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isLight ? 'rgba(15,118,110,0.14)' : theme.border,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
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
    weekChipRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      marginBottom: 10,
    },
    weekChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
    },
    weekChipLabel: {
      fontSize: 13,
      letterSpacing: -0.1,
    },
    daySectionGap: {
      height: 10,
    },
    dayHeader: {
      flexDirection: 'row' as const,
      alignItems: 'baseline' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 4,
    },
    dayHeaderLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: theme.text,
      letterSpacing: -0.15,
    },
    dayHeaderCount: {
      fontSize: 11,
      fontWeight: '500' as const,
      color: theme.dim,
    },
    todayTimeLabel: {
      fontSize: 13,
      fontWeight: '700' as const,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
      color: theme.text,
      marginTop: 2,
    },
    todayPanel: { paddingVertical: 2, paddingHorizontal: 4, overflow: 'hidden' as const },
    todayRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 10,
    },
    todayRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      marginHorizontal: 8,
    },
    todayName: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: theme.text,
      letterSpacing: -0.1,
    },
    todayBranch: { marginTop: 2, fontSize: 11, color: theme.dim },
    todayTime: {
      fontSize: 15,
      fontWeight: '700' as const,
      fontVariant: ['tabular-nums' as const],
      letterSpacing: -0.1,
      color: theme.text,
    },
    showMoreRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 4,
      marginTop: 2,
      paddingTop: 12,
      paddingBottom: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    showMoreLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      letterSpacing: 0.1,
      color: theme.accentText,
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
    idleScanBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      minHeight: 36,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
    },
    idleScanLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      letterSpacing: -0.1,
    },
    sheetBody: { fontSize: 13, lineHeight: 19, color: theme.muted, marginBottom: 10 },
  }));

  if (!token) return null;

  if (historyQuery.isLoading && settingsQuery.isLoading) {
    return (
      <TabScreenFrame>
        <PageSkeleton />
      </TabScreenFrame>
    );
  }

  if (historyQuery.isError && !historyQuery.data) {
    return (
      <TabScreenFrame>
        <LoadError
          message={userFacingApiMessage(historyQuery.error, t('checkIn.loadFailed'), t('checkIn.loadFailed'))}
          onRetry={() => void historyQuery.refetch()}
        />
      </TabScreenFrame>
    );
  }

  return (
    <TabScreenFrame>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 48 + tabOverlayInset }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
        }
      >
        <BranchFilterBar horizontalPadding={0} />

        <Animated.View entering={FadeIn.duration(280)}>
          <SoftSurface variant="panel" flat style={styles.hero}>
            <DeskHeroAtmosphere isLight={isLight} />
            <View style={styles.heroTop}>
              <View style={styles.deskCol}>
                <Text style={styles.deskLabel}>
                  {t('checkIn.deskLabel')}
                </Text>
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
              <Text display style={styles.todayCount}>
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
              {!readOnly ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('checkIn.scanAction')}
                  onPress={() => setScanOpen(true)}
                  style={({ pressed }) => [styles.scanIconBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="scan-outline" size={20} color={isLight ? c.accent : c.accentText} />
                </Pressable>
              ) : null}
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

        <View>
          <View style={styles.todayHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text display style={styles.sectionTitle}>
                {t('checkIn.attendanceTitle')}
              </Text>
              <Text style={styles.sectionMeta}>
                {historyFrom && historyTo
                  ? t('checkIn.weekRangeSubtitle', {
                      from: formatDisplayDate(historyFrom),
                      to: formatDisplayDate(historyTo),
                    })
                  : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.weekChipRow}>
            {(['this', 'last'] as const).map((scope) => {
              const active = weekScope === scope;
              return (
                <Pressable
                  key={scope}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setWeekScope(scope)}
                  style={({ pressed }) => [
                    styles.weekChip,
                    {
                      backgroundColor: active
                        ? isLight
                          ? 'rgba(15,118,110,0.1)'
                          : 'rgba(45,212,191,0.14)'
                        : 'transparent',
                      borderColor: active ? (isLight ? '#0f766e' : c.accentText) : c.border,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.weekChipLabel,
                      {
                        color: active ? (isLight ? '#0f766e' : c.accentText) : c.muted,
                        fontWeight: active ? '700' : '600',
                      },
                    ]}
                  >
                    {scope === 'this' ? t('checkIn.weekThis') : t('checkIn.weekLast')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Animated.View key={weekScope} entering={FadeIn.duration(200)}>
          {historyRows.length === 0 ? (
            <SoftSurface variant="panel" style={styles.idleWrap}>
              <EmptyState
                tone="quiet"
                compact
                icon="scan-outline"
                title={
                  weekScope === 'last'
                    ? t('checkIn.historyEmptyLastTitle')
                    : t('checkIn.todayEmptyTitle')
                }
                body={
                  weekScope === 'last' ? t('checkIn.historyEmptyLast') : t('checkIn.todayEmpty')
                }
                action={
                  readOnly || weekScope === 'last' ? null : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('checkIn.scanAction')}
                      onPress={() => setScanOpen(true)}
                      style={({ pressed }) => [
                        styles.idleScanBtn,
                        {
                          backgroundColor: c.inputBg,
                          borderColor: c.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="scan-outline" size={16} color={c.text} />
                      <Text style={[styles.idleScanLabel, { color: c.text }]}>
                        {t('checkIn.scanAction')}
                      </Text>
                    </Pressable>
                  )
                }
              />
            </SoftSurface>
          ) : (
            <SoftSurface variant="panel" style={styles.todayPanel}>
              {visibleDayGroups.map(([day, rows], dayIndex) => (
                <View key={day}>
                  {dayIndex > 0 ? <View style={styles.daySectionGap} /> : null}
                  <View style={styles.dayHeader}>
                    <Text display style={styles.dayHeaderLabel}>
                      {formatAttendanceDayLabel(day, language || i18n.language)}
                    </Text>
                    <Text style={styles.dayHeaderCount}>
                      {t('checkIn.dayVisitCount', { count: rows.length })}
                    </Text>
                  </View>
                  {rows.map((row: CheckInRow, index: number) => (
                    <View key={row.id}>
                      {index > 0 ? <View style={styles.todayRowDivider} /> : null}
                      <View style={styles.todayRow}>
                        <MemberPhoto
                          memberId={row.member_id}
                          name={row.member_name || '?'}
                          token={token}
                          size={40}
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
                        <Text style={styles.todayTime}>{formatTime(row.checked_in_at)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
              {historyHasMoreDays || historyCanLoadMore ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('checkIn.showMore')}
                  hitSlop={6}
                  onPress={() => {
                    if (historyHasMoreDays) {
                      setHistoryExpanded(true);
                      return;
                    }
                    setHistoryLimit((n) => Math.min(HISTORY_MAX, n + HISTORY_PAGE_SIZE));
                  }}
                  style={({ pressed }) => [styles.showMoreRow, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <Text style={styles.showMoreLabel}>{t('checkIn.showMore')}</Text>
                  <Ionicons name="chevron-down" size={16} color={c.accentText} />
                </Pressable>
              ) : null}
            </SoftSurface>
          )}
          </Animated.View>
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
    </TabScreenFrame>
  );
}
