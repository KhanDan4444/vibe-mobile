import { View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import type { MemberRow } from '@/src/types/api';
import type { MemberStatusCounts } from '@/src/api/reports';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { appTextStyle } from '@/src/theme/typography';
import { memberStatusBreakdownExclusive, memberStatusCounts } from '@/src/utils/reportPdf';

const SEGMENT_KEYS = [
  { key: 'active' as const, labelKey: 'statusBreakdown.active', color: '#34d399' },
  { key: 'dueSoon' as const, labelKey: 'statusBreakdown.dueSoon', color: '#0284c7' },
  { key: 'expired' as const, labelKey: 'statusBreakdown.expired', color: '#f87171' },
  { key: 'unpaid' as const, labelKey: 'statusBreakdown.unpaid', color: '#fb923c' },
  { key: 'former' as const, labelKey: 'statusBreakdown.former', color: '#94a3b8' },
];

type Props = {
  members?: MemberRow[];
  counts?: MemberStatusCounts | null;
  barCounts?: MemberStatusCounts | null;
};

export function StatusBreakdown({ members, counts: countsProp, barCounts: barProp }: Props) {
  const { t } = useTranslation();
  const { language } = usePreferences();
  const { isTablet } = useResponsiveLayout();
  const styles = useThemedStyles((c) => ({
    wrap: { marginTop: 16, marginBottom: 8 },
    bar: {
      flexDirection: 'row' as const,
      height: isTablet ? 14 : 10,
      borderRadius: isTablet ? 7 : 5,
      overflow: 'hidden' as const,
      backgroundColor: c.border,
    },
    segment: { minWidth: 4 },
    legend: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12, marginTop: 12 },
    legendItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, maxWidth: '100%' as const },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { fontSize: 13, color: c.muted, flexShrink: 1 },
    legendValue: { fontSize: 13, fontWeight: '700' as const, color: c.text },
  }));

  const counts = countsProp ?? memberStatusCounts(members ?? []);
  const barCounts = barProp ?? memberStatusBreakdownExclusive(members ?? []);
  if (counts.total === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {SEGMENT_KEYS.map((seg) => {
          const n = barCounts[seg.key];
          if (!n) return null;
          return (
            <View
              key={seg.key}
              style={[styles.segment, { flex: n, backgroundColor: seg.color }]}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        {SEGMENT_KEYS.map((seg) => (
          <View key={seg.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text style={appTextStyle(language, styles.legendLabel)}>{t(seg.labelKey)}</Text>
            <Text style={styles.legendValue}>{counts[seg.key] ?? 0}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
