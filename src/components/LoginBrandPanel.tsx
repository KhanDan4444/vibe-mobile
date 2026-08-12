import { Image, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { AUTH } from '@/src/theme/authChrome';

const LOGIN_BRAND_MARK = require('@/assets/images/login-brand-mark.png');

export function LoginBrandPanel() {
  const { t, i18n } = useTranslation();
  const { isTablet } = useResponsiveLayout();
  const s = isTablet ? tabletStyles : phoneStyles;
  // English slogan is Latin (DM Sans); Amharic slogan uses the Ethiopic face.
  const sloganLatin = i18n.language !== 'am';

  return (
    <View style={s.wrap}>
      <Image source={LOGIN_BRAND_MARK} style={s.mark} resizeMode="contain" accessibilityLabel="ንቁ" />
      <Text latin={sloganLatin} display style={[s.slogan, { color: AUTH.link }]}>
        {t('auth.brandSlogan')}
      </Text>
      <View style={s.rule} accessibilityElementsHidden />
    </View>
  );
}

const phoneStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  mark: {
    width: 88,
    height: 108,
    marginBottom: 14,
  },
  slogan: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  rule: {
    marginTop: 18,
    width: 36,
    height: StyleSheet.hairlineWidth * 2,
    borderRadius: 1,
    backgroundColor: AUTH.fieldBorderFocus,
    opacity: 0.7,
  },
});

const tabletStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 34,
  },
  mark: {
    width: 108,
    height: 132,
    marginBottom: 16,
  },
  slogan: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  rule: {
    marginTop: 20,
    width: 40,
    height: StyleSheet.hairlineWidth * 2,
    borderRadius: 1,
    backgroundColor: AUTH.fieldBorderFocus,
    opacity: 0.7,
  },
});
