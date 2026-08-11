import { StyleSheet } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';

export function ReadOnlyBanner() {
  const { t } = useTranslation();
  const { colors: c, isDark } = useTheme();
  const { readOnly, subscriptionReadOnly, branchReadOnly, selectedBranch } = useGymReadOnly();

  if (!readOnly) return null;

  const bannerStyle = [
    styles.banner,
    {
      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.16)' : 'rgba(217, 119, 6, 0.12)',
      borderColor: c.warning,
    },
  ];
  const titleStyle = [styles.title, { color: c.warning }];
  const bodyStyle = [styles.body, { color: c.warning }];

  if (branchReadOnly && selectedBranch && !subscriptionReadOnly) {
    return (
      <SoftSurface flat style={bannerStyle}>
        <Text style={titleStyle}>{t('alerts.branchReadOnlyTitle')}</Text>
        <Text style={bodyStyle}>{t('alerts.branchReadOnlyBody', { name: selectedBranch.name })}</Text>
      </SoftSurface>
    );
  }

  return (
    <SoftSurface flat style={bannerStyle}>
      <Text style={bodyStyle}>{t('dashboard.readOnlyBanner')}</Text>
    </SoftSurface>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
});
