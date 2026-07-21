import { Image, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';

const APP_ICON = require('@/assets/images/icon.png');

export function LoginBrandPanel() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();

  return (
    <View style={styles.wrap}>
      <Image source={APP_ICON} style={styles.icon} resizeMode="contain" />
      <Text style={[styles.name, { color: c.accentText }]}>{t('app.name')}</Text>
      <Text style={[styles.tagline, { color: c.muted }]}>{t('auth.tagline')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    width: 56,
    height: 56,
    marginBottom: 12,
    borderRadius: 16,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 280,
  },
});
