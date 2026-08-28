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
import { ErrorBanner, Field, FieldError, FormScroll, Label, PrimaryButton } from '@/src/components/Form';
import { PasswordRule } from '@/src/components/PasswordRule';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { AUTH, authSubtitle, authTitle } from '@/src/theme/authChrome';
import { isValidEthiopianPhone } from '@/src/utils/phone';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import {
  MIN_PASSWORD_LENGTH,
  validatePasswordPair,
  type PasswordPairErrors,
} from '@/src/utils/passwordValidation';

const USERNAME_RE = /^[a-z0-9._]+$/i;

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
  const [fieldErrors, setFieldErrors] = useState<PasswordPairErrors & { code?: string }>({});
  const [showLengthRule, setShowLengthRule] = useState(false);
  const [showMatchRule, setShowMatchRule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSupportOption, setShowSupportOption] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const lengthOk = password.length >= MIN_PASSWORD_LENGTH;
  const matchOk = confirm.length > 0 && confirm === password;
  const resolveError = (key?: string) => (key ? t(key) : undefined);

  const stepIndex = step === 'request' ? 0 : 1;
  const stepSubtitle = step === 'request' ? t('forgot.stepRequest') : t('forgot.stepReset');

  const requestOtp = async () => {
    setError('');
    setMessage('');
    setFieldErrors({});
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
    const next: PasswordPairErrors & { code?: string } = validatePasswordPair(password, confirm);
    if (!sessionId || !code.trim()) {
      next.code = 'forgot.codeRequired';
    }
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await resetPasswordWithOtp({ sessionId, code, password });
      setResetDone(true);
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
    <AuthScreen
      hero
      headerCenter={
        <AuthStepDots
          activeIndex={stepIndex}
          steps={2}
          compact
          stepLabels={[t('forgot.stepDotRequest'), t('forgot.stepDotReset')]}
          progressLabel={t('forgot.stepProgress', { current: stepIndex + 1, total: 2 })}
        />
      }
    >
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
                <Field
                  value={code}
                  onChangeText={(v) => {
                    setCode(v);
                    setFieldErrors((prev) => ({ ...prev, code: undefined }));
                  }}
                  keyboardType="numeric"
                  autoCapitalize="none"
                  latin
                  error={Boolean(fieldErrors.code)}
                />
                {fieldErrors.code ? <FieldError message={resolveError(fieldErrors.code)} /> : null}

                <Label>{t('forgot.newPassword')}</Label>
                <Field
                  value={password}
                  onFocus={() => setShowLengthRule(true)}
                  onChangeText={(v) => {
                    setPassword(v);
                    setShowLengthRule(true);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  latin
                  error={Boolean(fieldErrors.password)}
                />
                <PasswordRule
                  show={showLengthRule || password.length > 0}
                  ok={lengthOk}
                  label={t('forms.passwordMin8')}
                />
                {fieldErrors.password ? <FieldError message={resolveError(fieldErrors.password)} /> : null}

                <Label>{t('forgot.confirmPassword')}</Label>
                <Field
                  value={confirm}
                  onFocus={() => setShowMatchRule(true)}
                  onChangeText={(v) => {
                    setConfirm(v);
                    setShowMatchRule(true);
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  latin
                  error={Boolean(fieldErrors.confirmPassword)}
                />
                <PasswordRule
                  show={showMatchRule || confirm.length > 0}
                  ok={matchOk}
                  label={t('forms.passwordsMatch')}
                />
                {fieldErrors.confirmPassword ? (
                  <FieldError message={resolveError(fieldErrors.confirmPassword)} />
                ) : null}

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
                    setFieldErrors({});
                    setShowLengthRule(false);
                    setShowMatchRule(false);
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
  successCta: {
    marginTop: 22,
    width: '100%',
  },
});
