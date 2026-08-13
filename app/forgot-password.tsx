import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { requestForgotPasswordOtp, resetPasswordWithOtp } from '@/src/api/auth';
import { AuthFormEnter } from '@/src/components/AuthFormEnter';
import { AuthScreen } from '@/src/components/AuthScreen';
import { AuthStepDots } from '@/src/components/AuthStepDots';
import { ErrorBanner, Field, FormScroll, Label, PrimaryButton } from '@/src/components/Form';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { AUTH, authSubtitle, authTitle } from '@/src/theme/authChrome';
import { isValidEthiopianPhone, normalizeEthiopianPhone } from '@/src/utils/phone';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';

const USERNAME_RE = /^[a-z0-9._]+$/i;

type ResetDone = {
  accountLabel: string;
  accountValue: string;
};

function formatAccount(identifier: string): ResetDone {
  const trimmed = identifier.trim();
  if (isValidEthiopianPhone(trimmed)) {
    return {
      accountLabel: 'forgot.accountPhone',
      accountValue: normalizeEthiopianPhone(trimmed) || trimmed,
    };
  }
  return {
    accountLabel: 'forgot.accountUsername',
    accountValue: `@${trimmed.toLowerCase()}`,
  };
}

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [identifier, setIdentifier] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSupportOption, setShowSupportOption] = useState(false);
  const [resetDone, setResetDone] = useState<ResetDone | null>(null);

  const stepIndex = step === 'request' ? 0 : 1;
  const stepSubtitle = step === 'request' ? t('forgot.stepRequest') : t('forgot.stepReset');

  const requestOtp = async () => {
    setError('');
    setMessage('');
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError(t('forgot.identifierRequired'));
      return;
    }
    if (!isValidEthiopianPhone(trimmed)) {
      const user = trimmed.toLowerCase();
      if (user.length < 3 || user.length > 30 || !USERNAME_RE.test(user)) {
        setError(t('forgot.identifierInvalid'));
        return;
      }
    }
    setLoading(true);
    try {
      const data = await requestForgotPasswordOtp(trimmed);
      setSessionId(data.sessionId);
      setStep('reset');
      setMessage(data.message || t('forgot.otpSent'));
    } catch (e) {
      setError(userFacingApiMessage(e, t('auth.connectionFailed'), t('forgot.requestFailed')));
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError('');
    if (!sessionId || !code.trim()) {
      setError(t('forgot.codeRequired'));
      return;
    }
    if (password.length < 8) {
      setError(t('forgot.passwordShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('forgot.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await resetPasswordWithOtp({ sessionId, code, password });
      setResetDone(formatAccount(identifier));
    } catch (e) {
      setError(userFacingApiMessage(e, t('auth.connectionFailed'), t('forgot.resetFailed')));
    } finally {
      setLoading(false);
    }
  };

  if (resetDone) {
    return (
      <AuthScreen hero>
        <FormScroll contentContainerStyle={{ paddingTop: 28 }}>
          <AuthFormEnter delay={40}>
            <View style={styles.successWrap}>
              <View style={styles.checkCircle}>
                <View style={styles.checkInner}>
                  <Ionicons name="checkmark" size={34} color={AUTH.link} />
                </View>
              </View>

              <Text display style={[styles.successTitle, { color: AUTH.text }]}>
                {t('forgot.successTitle')}
              </Text>
              <Text style={[styles.successHero, { color: AUTH.text }]}>{t('forgot.successHero')}</Text>
              <Text style={[styles.successBody, { color: AUTH.textMuted }]}>{t('forgot.successBody')}</Text>

              <SoftSurface variant="panel" style={[styles.summary, { backgroundColor: AUTH.fieldBg }]}>
                <View style={[styles.summaryRow, styles.summaryRowLast]}>
                  <Text style={[styles.summaryLabel, { color: AUTH.textDim }]}>{t(resetDone.accountLabel)}</Text>
                  <Text latin style={[styles.summaryValue, { color: AUTH.text }]} numberOfLines={1}>
                    {resetDone.accountValue}
                  </Text>
                </View>
              </SoftSurface>

              <PrimaryButton
                label={t('auth.signIn')}
                onPress={() => router.replace('/login')}
                style={styles.successCta}
              />
            </View>
          </AuthFormEnter>
        </FormScroll>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen hero headerCenter={<AuthStepDots activeIndex={stepIndex} steps={2} compact />}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll contentContainerStyle={{ paddingTop: 20 }}>
          <AuthFormEnter delay={40}>
            <Text display style={[styles.title, { color: AUTH.text }]}>
              {t('forgot.title')}
            </Text>
            <Text style={[styles.subtitle, { color: AUTH.textMuted }]}>{stepSubtitle}</Text>
          </AuthFormEnter>

          <AuthFormEnter delay={120}>
            <ErrorBanner message={error} />
            {message ? <Text style={[styles.message, { color: c.success }]}>{message}</Text> : null}

            {step === 'request' ? (
              <>
                <Label>{t('forgot.identifier')}</Label>
                <Field
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  keyboardType="default"
                  latin
                  placeholder={t('forgot.identifierPlaceholder')}
                />
                <Text style={[styles.hint, { color: AUTH.textDim }]}>{t('forgot.identifierHint')}</Text>
                <PrimaryButton label={t('forgot.sendOtp')} onPress={requestOtp} loading={loading} />
              </>
            ) : (
              <>
                <Label>{t('forgot.code')}</Label>
                <Field value={code} onChangeText={setCode} keyboardType="numeric" autoCapitalize="none" latin />

                <Label>{t('forgot.newPassword')}</Label>
                <Field value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" latin />

                <Label>{t('forgot.confirmPassword')}</Label>
                <Field value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" latin />

                <PrimaryButton label={t('forgot.updatePassword')} onPress={resetPassword} loading={loading} />
                <Pressable
                  style={styles.secondary}
                  onPress={() => {
                    setStep('request');
                    setCode('');
                    setPassword('');
                    setConfirm('');
                    setError('');
                    setMessage('');
                  }}
                >
                  <Text style={[styles.secondaryText, { color: AUTH.link }]}>{t('forgot.resendOtp')}</Text>
                </Pressable>
              </>
            )}

            <Pressable style={styles.secondary} onPress={() => setShowSupportOption((show) => !show)}>
              <Text style={[styles.secondaryText, { color: AUTH.link }]}>{t('forgot.tryOtherOption')}</Text>
            </Pressable>

            {showSupportOption ? (
              <SoftSurface variant="panel" style={styles.supportCard}>
                <Text style={[styles.supportTitle, { color: AUTH.text }]}>{t('forgot.supportTitle')}</Text>
                <Text style={[styles.supportBody, { color: AUTH.textMuted }]}>{t('forgot.supportBody')}</Text>
                <Text style={[styles.supportBody, { color: AUTH.textMuted }]}>{t('forgot.supportAfterReset')}</Text>
              </SoftSurface>
            ) : null}

            <Pressable style={styles.back} onPress={() => router.replace('/login')}>
              <Text style={[styles.secondaryText, { color: AUTH.textDim }]}>{t('forgot.backToLogin')}</Text>
            </Pressable>
          </AuthFormEnter>
        </FormScroll>
      </KeyboardAvoidingView>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  title: authTitle,
  subtitle: authSubtitle,
  hint: { marginTop: 8, marginBottom: 12, fontSize: 12, lineHeight: 18, letterSpacing: 0.1 },
  message: { marginBottom: 12, fontSize: 14, textAlign: 'center', letterSpacing: 0.1 },
  secondary: { alignItems: 'center', paddingVertical: 14 },
  back: { alignItems: 'center', paddingVertical: 18 },
  secondaryText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.15 },
  supportCard: {
    padding: 16,
    marginTop: 4,
    backgroundColor: AUTH.fieldBg,
  },
  supportTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, letterSpacing: -0.2 },
  supportBody: { fontSize: 13, lineHeight: 20, marginTop: 4, letterSpacing: 0.1 },
  successWrap: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 24,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,212,191,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(45,212,191,0.35)',
    marginBottom: 22,
  },
  checkInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,212,191,0.16)',
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  successHero: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 32,
    textAlign: 'center',
  },
  successBody: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    letterSpacing: 0.1,
    maxWidth: 320,
  },
  summary: {
    marginTop: 22,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.25)',
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 13,
    flexShrink: 0,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  successCta: {
    marginTop: 22,
    width: '100%',
  },
});
