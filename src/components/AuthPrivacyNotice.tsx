import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { PRIVACY_POLICY_URL } from '@/src/config/webApp';
import { AUTH } from '@/src/theme/authChrome';

function openPrivacy() {
  void Linking.openURL(PRIVACY_POLICY_URL);
}

/** Muted footer for auth screens. Not a peer of Sign in or Register. */
export function AuthPrivacyFooter({ insetBottom = 0 }: { insetBottom?: number }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insetBottom, 8) + 10 }]}>
      <Pressable onPress={openPrivacy} accessibilityRole="link" hitSlop={8}>
        <Text style={styles.footerLabel}>{t('auth.privacyPolicy')}</Text>
      </Pressable>
    </View>
  );
}

/** Signup consent line, placed next to the step's main button. */
export function AuthPrivacyConsent() {
  const { t } = useTranslation();
  return (
    <Text style={styles.consent}>
      {t('auth.privacyAgreePrefix')}{' '}
      <Text style={styles.consentLink} onPress={openPrivacy} accessibilityRole="link">
        {t('auth.privacyPolicy')}
      </Text>
      .
    </Text>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    paddingTop: 4,
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(248, 250, 252, 0.4)',
  },
  consent: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: AUTH.textDim,
  },
  consentLink: {
    color: AUTH.link,
    fontWeight: '600',
  },
});
