import { Image, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

const APP_ICON = require('@/assets/images/icon.png');

export function LoginBrandPanel() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { isTablet } = useResponsiveLayout();
  const s = isTablet ? tabletStyles : phoneStyles;

  return (
    <View style={s.wrap}>
      <Image source={APP_ICON} style={s.icon} resizeMode="contain" accessibilityLabel="ንቁ" />
      <Text style={[s.subtitle, { color: c.muted }]}>{t('auth.signInSubtitle')}</Text>
    </View>
  );
}

const phoneStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
});

const tabletStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    width: 88,
    height: 88,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 340,
  },
});
