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
      <View style={[s.iconClip, { borderColor: c.accent }]}>
        <Image source={APP_ICON} style={s.icon} resizeMode="cover" />
      </View>
      <Text style={[s.name, { color: c.accentText }]}>{t('app.name')}</Text>
      <Text style={[s.tagline, { color: c.muted }]}>{t('auth.tagline')}</Text>
    </View>
  );
}

const phoneStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconClip: {
    marginBottom: 8,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 0,
  },
  icon: {
    width: 48,
    height: 48,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  tagline: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 260,
  },
});

const tabletStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconClip: {
    marginBottom: 10,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  icon: {
    width: 56,
    height: 56,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
});
