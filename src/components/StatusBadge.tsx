import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import type { ThemeColors } from '@/src/theme/tokens';
import { statusLabelKey } from '@/src/utils/statusLabels';

type StatusBadgeProps = {
  status: string;
  showDot?: boolean;
};

function statusKey(status: string) {
  return (status || '').toLowerCase();
}

function badgeColors(key: string, c: ThemeColors) {
  if (key === 'active') {
    return { bg: `${c.statusActive}18`, text: c.statusActive, border: `${c.statusActive}33`, dot: c.statusActive };
  }
  if (key === 'due soon') {
    return { bg: `${c.statusDueSoon}18`, text: c.statusDueSoon, border: `${c.statusDueSoon}33`, dot: c.statusDueSoon };
  }
  if (key === 'expired' || key === 'suspended') {
    return { bg: `${c.statusExpired}18`, text: c.statusExpired, border: `${c.statusExpired}33`, dot: c.statusExpired };
  }
  if (key === 'trialing' || key === 'unpaid') {
    return { bg: `${c.statusUnpaid}18`, text: c.statusUnpaid, border: `${c.statusUnpaid}33`, dot: c.statusUnpaid };
  }
  return { bg: `${c.statusNeutral}18`, text: c.statusNeutral, border: `${c.statusNeutral}33`, dot: c.statusNeutral };
}

export default function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const key = statusKey(status);
  const colors = badgeColors(key, c);

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {showDot ? <View style={[styles.dot, { backgroundColor: colors.dot }]} /> : null}
      <Text style={[styles.label, { color: colors.text }]}>{t(statusLabelKey(status))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
