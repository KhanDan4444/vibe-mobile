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
      {/* Same asset as the home-screen / launcher icon */}
      <Image source={APP_ICON} style={s.icon} resizeMode="contain" accessibilityLabel="ንቁ" />
      <Text latin style={[s.slogan, { color: c.accentText }]}>
        {t('auth.brandSlogan')}
      </Text>
    </View>
  );
}

const phoneStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 30,
  },
  icon: {
    width: 104,
    height: 104,
    marginBottom: 16,
  },
  slogan: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});

const tabletStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  icon: {
    width: 124,
    height: 124,
    marginBottom: 18,
  },
  slogan: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.7,
    textAlign: 'center',
  },
});
