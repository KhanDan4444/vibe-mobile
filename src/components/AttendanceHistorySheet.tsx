import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet } from '@/src/components/BottomSheet';
import { EmptyState } from '@/src/components/EmptyState';
import { MemberPhoto } from '@/src/components/MemberPhoto';
import { AttendanceDaySkeleton, CheckInTodayRowSkeleton } from '@/src/components/Skeleton';
import { listCheckIns, type CheckInRow } from '@/src/api/checkIns';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import {
  attendanceDayRelative,
  attendanceWeekRange,
  formatAttendanceDayLabel,
  formatAttendanceWeekRangeLabel,
  groupCheckInsByDay,
} from '@/src/utils/date';
import { radiusMd } from '@/src/theme/tokens';

function formatTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function dayLabel(day: string, language: string, t: (k: string) => string) {
  const rel = attendanceDayRelative(day);
  if (rel === 'today') return t('checkIn.dayToday');
  if (rel === 'yesterday') return t('checkIn.dayYesterday');
  return formatAttendanceDayLabel(day, language);
}

/**
 * History drill-down: week → days (N visits) → members for that day.
 */
export function AttendanceHistorySheet({
  visible,
  onClose,
  token,
  branchId,
  weekStartsOn = 'monday',
  showBranch = false,
}: {
  visible: boolean;
  onClose: () => void;
  token: string;
  branchId?: number | 'all';
  weekStartsOn?: 'monday' | 'sunday';
  showBranch?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { language } = usePreferences();
  const { colors: c, theme } = useTheme();
  const isLight = theme === 'light';
  const [weekScope, setWeekScope] = useState<'this' | 'last'>('this');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayQuery, setDayQuery] = useState('');

  const weekRange = useMemo(
    () => attendanceWeekRange(weekScope, weekStartsOn),
    [weekScope, weekStartsOn]
  );

  const historyQuery = useQuery({
    queryKey: ['check-ins', 'history-sheet', branchId, weekScope, weekRange.from, weekRange.to],
    queryFn: () =>
      listCheckIns(token, {
        from: weekRange.from,
        to: weekRange.to,
        limit: 200,
        branchId,
      }),
    enabled: Boolean(visible && token),
  });

  useEffect(() => {
    if (!visible) {
      setSelectedDay(null);
      setDayQuery('');
      setWeekScope('this');
    }
  }, [visible]);

  const byDay = useMemo(
    () => groupCheckInsByDay(historyQuery.data?.checkIns ?? []),
    [historyQuery.data?.checkIns]
  );

  const selectedRows = useMemo(() => {
    if (!selectedDay) return [] as CheckInRow[];
    return byDay.find(([d]) => d === selectedDay)?.[1] ?? [];
  }, [byDay, selectedDay]);

  const filteredRows = useMemo(() => {
    const q = dayQuery.trim().toLowerCase();
    if (!q) return selectedRows;
    return selectedRows.filter((row) => {
      const name = (row.member_name || '').toLowerCase();
      const phone = (row.member_phone || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [selectedRows, dayQuery]);

  const lang = language || i18n.language;
  const title = selectedDay ? dayLabel(selectedDay, lang, t) : t('checkIn.historyTitle');
  const weekRangeLabel = formatAttendanceWeekRangeLabel(weekRange.from, weekRange.to, lang);

  const openDay = (day: string) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setSelectedDay(day);
    setDayQuery('');
  };

  const backToDays = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    setSelectedDay(null);
    setDayQuery('');
  };

  const handleClose = () => {
    setSelectedDay(null);
    setDayQuery('');
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      title={title}
      onClose={handleClose}
      showCloseButton
      aboveTitle={
        selectedDay ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('checkIn.historyTitle')}
            onPress={backToDays}
            style={({ pressed }) => [styles.backRow, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={6}
          >
            <Ionicons name="chevron-back" size={18} color={c.accentText} />
            <Text style={[styles.backLabel, { color: c.accentText }]}>
              {t('checkIn.historyTitle')}
            </Text>
          </Pressable>
        ) : undefined
      }
    >
      {!selectedDay ? (
        <View style={styles.weekHeader}>
          <Text style={[styles.weekBody, { color: c.muted }]}>{t('checkIn.historyBody')}</Text>
          <Text style={[styles.weekSubtitle, { color: c.muted }]}>{weekRangeLabel}</Text>
          <View style={styles.weekChipRow}>
            {(['this', 'last'] as const).map((scope) => {
              const active = weekScope === scope;
              return (
                <Pressable
                  key={scope}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    if (scope !== weekScope) {
                      void Haptics.selectionAsync().catch(() => undefined);
                    }
                    setWeekScope(scope);
                  }}
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
                    style={{
                      fontSize: 13,
                      fontWeight: active ? '600' : '500',
                      color: active ? (isLight ? '#0f766e' : c.accentText) : c.muted,
                    }}
                  >
                    {scope === 'this' ? t('checkIn.weekThis') : t('checkIn.weekLast')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {historyQuery.isLoading ? (
        selectedDay ? (
          <View style={{ gap: 2 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <CheckInTodayRowSkeleton key={i} />
            ))}
          </View>
        ) : (
          <AttendanceDaySkeleton count={4} />
        )
      ) : selectedDay ? (
        <Animated.View
          key={`day-${selectedDay}`}
          entering={FadeInDown.duration(220)}
          style={{ gap: 10 }}
        >
          <Text style={[styles.dayMeta, { color: c.dim }]}>
            {t('checkIn.dayVisitCount', { count: selectedRows.length })}
            {' · '}
            {weekScope === 'this' ? t('checkIn.weekThis') : t('checkIn.weekLast')}
          </Text>
          <View
            style={[
              styles.searchShell,
              { backgroundColor: c.inputBg, borderColor: c.border },
            ]}
          >
            <Ionicons name="search-outline" size={16} color={c.dim} />
            <TextInput
              value={dayQuery}
              onChangeText={setDayQuery}
              placeholder={t('checkIn.historySearchDay')}
              placeholderTextColor={c.dim}
              style={[styles.searchInput, { color: c.text }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>
          <View>
            {filteredRows.length === 0 ? (
              <EmptyState
                tone="quiet"
                compact
                icon="search-outline"
                title={t('checkIn.historyDayEmptyTitle')}
                body={
                  dayQuery.trim()
                    ? t('checkIn.historyDayEmptySearch')
                    : t('checkIn.historyDayEmpty')
                }
              />
            ) : (
              filteredRows.map((row, index) => (
                <Animated.View
                  key={row.id}
                  entering={FadeIn.delay(Math.min(index, 8) * 24).duration(180)}
                >
                  {index > 0 ? (
                    <View style={[styles.divider, { borderTopColor: c.border }]} />
                  ) : null}
                  <View style={styles.memberRow}>
                    <MemberPhoto
                      memberId={row.member_id}
                      name={row.member_name || '?'}
                      token={token}
                      size={32}
                      hasPhoto={Boolean(row.member_photo_url)}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text listRow style={[styles.memberName, { color: c.text }]} numberOfLines={1}>
                        {row.member_name || '—'}
                      </Text>
                      {showBranch && row.branch_name ? (
                        <Text style={{ fontSize: 11, color: c.dim }} numberOfLines={1}>
                          {row.branch_name}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.memberTime, { color: c.dim }]}>
                      {formatTime(row.checked_in_at)}
                    </Text>
                  </View>
                </Animated.View>
              ))
            )}
          </View>
        </Animated.View>
      ) : byDay.length === 0 ? (
        <Animated.View entering={FadeIn.duration(220)}>
          <EmptyState
            tone="quiet"
            compact
            icon="time-outline"
            title={
              weekScope === 'last'
                ? t('checkIn.historyEmptyLastTitle')
                : t('checkIn.historyEmptyTitle')
            }
            body={
              weekScope === 'last' ? t('checkIn.historyEmptyLast') : t('checkIn.historyEmpty')
            }
          />
        </Animated.View>
      ) : (
        <Animated.View key={`days-${weekScope}`} entering={FadeIn.duration(200)} style={{ gap: 6 }}>
          {byDay.map(([day, rows], index) => (
            <Animated.View
              key={day}
              entering={FadeInDown.delay(Math.min(index, 6) * 30).duration(200)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${dayLabel(day, lang, t)}, ${t('checkIn.dayVisitCount', {
                  count: rows.length,
                })}`}
                onPress={() => openDay(day)}
                style={({ pressed }) => [
                  styles.dayRow,
                  {
                    backgroundColor: pressed
                      ? isLight
                        ? 'rgba(15,118,110,0.06)'
                        : c.accentSoft
                      : isLight
                        ? 'rgba(255,255,255,0.55)'
                        : c.inputBg,
                    borderColor: isLight ? 'rgba(15,118,110,0.12)' : c.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dayAccent,
                    {
                      backgroundColor: isLight
                        ? 'rgba(15,118,110,0.55)'
                        : 'rgba(45,212,191,0.55)',
                    },
                  ]}
                />
                <Text style={[styles.dayName, { color: c.text }]} numberOfLines={1}>
                  {dayLabel(day, lang, t)}
                </Text>
                <Text style={[styles.dayCount, { color: c.dim }]}>
                  {t('checkIn.dayVisitCount', { count: rows.length })}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={c.dim} />
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  backLabel: { fontSize: 13, fontWeight: '600' },
  weekHeader: {
    marginBottom: 14,
    gap: 6,
  },
  weekBody: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  weekSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.15,
  },
  weekChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  weekChip: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  dayMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusMd,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingLeft: 14,
    borderRadius: radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  dayAccent: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 2,
    borderRadius: 1,
  },
  dayName: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  dayCount: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 0,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  memberTime: {
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
