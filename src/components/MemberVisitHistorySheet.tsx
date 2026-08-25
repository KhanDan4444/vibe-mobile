import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet } from '@/src/components/BottomSheet';
import { EmptyState } from '@/src/components/EmptyState';
import { listCheckIns } from '@/src/api/checkIns';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import {
  attendanceDayRelative,
  formatAttendanceDayLabel,
  formatDisplayTime,
} from '@/src/utils/date';

const HISTORY_LIMIT = 50;

function formatVisitLine(
  checkedInAt: string,
  language: string,
  t: (key: string) => string
) {
  const rel = attendanceDayRelative(checkedInAt);
  const day =
    rel === 'today'
      ? t('checkIn.dayToday')
      : rel === 'yesterday'
        ? t('checkIn.dayYesterday')
        : formatAttendanceDayLabel(checkedInAt, language);
  const time = formatDisplayTime(checkedInAt, language);
  return `${day} · ${time}`;
}

/** Full visit history for one member — flat one-line rows. */
export function MemberVisitHistorySheet({
  visible,
  onClose,
  token,
  memberId,
  memberName,
}: {
  visible: boolean;
  onClose: () => void;
  token: string;
  memberId: number;
  memberName?: string;
}) {
  const { t } = useTranslation();
  const { language } = usePreferences();
  const { colors: c } = useTheme();

  const query = useQuery({
    queryKey: ['member-visit-history', memberId],
    queryFn: () => listCheckIns(token, { memberId, limit: HISTORY_LIMIT }),
    enabled: Boolean(visible && token && memberId),
  });

  const rows = query.data?.checkIns ?? [];

  return (
    <BottomSheet
      visible={visible}
      title={t('checkIn.memberVisitHistoryTitle')}
      onClose={onClose}
      showCloseButton
    >
      {memberName ? (
        <Text style={[styles.subtitle, { color: c.dim }]} numberOfLines={1}>
          {memberName}
        </Text>
      ) : null}

      {query.isLoading ? (
        <ActivityIndicator color={c.accent} style={{ marginVertical: 28 }} />
      ) : rows.length === 0 ? (
        <EmptyState
          tone="quiet"
          compact
          icon="time-outline"
          title={t('checkIn.recentVisitsEmpty')}
        />
      ) : (
        <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled">
          {rows.map((row, index) => (
            <View key={row.id}>
              {index > 0 ? (
                <View style={[styles.divider, { borderTopColor: c.border }]} />
              ) : null}
              <View style={styles.row}>
                <Text style={[styles.line, { color: c.text }]} numberOfLines={1}>
                  {formatVisitLine(row.checked_in_at, language, t)}
                </Text>
              </View>
            </View>
          ))}
          {query.data?.total != null && query.data.total > rows.length ? (
            <Text style={[styles.moreHint, { color: c.dim }]}>
              {t('checkIn.showingOf', {
                shown: rows.length,
                total: query.data.total,
              })}
            </Text>
          ) : null}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    marginTop: -4,
  },
  row: {
    paddingVertical: 11,
  },
  line: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.15,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moreHint: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 12,
    marginBottom: 4,
  },
});
