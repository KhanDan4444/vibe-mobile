import { Image, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

const LOGIN_BRAND_MARK = require('@/assets/images/login-brand-mark.png');

export function LoginBrandPanel() {
  const { t, i18n } = useTranslation();
  const { colors: c } = useTheme();
  const { isTablet } = useResponsiveLayout();
  const s = isTablet ? tabletStyles : phoneStyles;
  // English slogan is Latin (DM Sans); Amharic slogan uses the Ethiopic face.
  const sloganLatin = i18n.language !== 'am';

  return (
    <View style={s.wrap}>
      <Image source={LOGIN_BRAND_MARK} style={s.mark} resizeMode="contain" accessibilityLabel="ንቁ" />
      <Text latin={sloganLatin} display style={[s.slogan, { color: c.accentText }]}>
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
  mark: {
    width: 84,
    height: 104,
    marginBottom: 12,
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
  mark: {
    width: 104,
    height: 128,
    marginBottom: 14,
  },
  slogan: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.7,
    textAlign: 'center',
  },
});
