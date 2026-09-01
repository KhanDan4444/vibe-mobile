import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { requestForgotPasswordOtp, resetPasswordWithOtp } from '@/src/api/auth';
import { AuthFormEnter } from '@/src/components/AuthFormEnter';
import { AuthOtpBlock } from '@/src/components/AuthOtpBlock';
import { AuthScreen } from '@/src/components/AuthScreen';
import { AuthStepDots } from '@/src/components/AuthStepDots';
import { AuthSuccessPanel } from '@/src/components/AuthSuccessPanel';
import { ErrorBanner, Field, FieldError, FormScroll, Label, PrimaryButton } from '@/src/components/Form';
import { PasswordRule } from '@/src/components/PasswordRule';
import { useOtpResendCooldown } from '@/src/hooks/useOtpResendCooldown';
import { AUTH, authSubtitle, authTitle } from '@/src/theme/authChrome';
import { isValidEthiopianPhone, normalizeEthiopianPhone } from '@/src/utils/phone';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import {
  MIN_PASSWORD_LENGTH,
  validatePasswordPair,
  type PasswordPairErrors,
} from '@/src/utils/passwordValidation';

const USERNAME_RE = /^[a-z0-9._]+$/i;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [identifier, setIdentifier] = useState('');
  const [otpDestinationPhone, setOtpDestinationPhone] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<PasswordPairErrors & { code?: string }>({});
  const [showLengthRule, setShowLengthRule] = useState(false);
  const [showMatchRule, setShowMatchRule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showSupportOption, setShowSupportOption] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const { cooldown, startCooldown, canResend } = useOtpResendCooldown();
  const otpRequestInFlight = useRef(false);

  const lengthOk = password.length >= MIN_PASSWORD_LENGTH;
  const matchOk = confirm.length > 0 && confirm === password;
  const resolveError = (key?: string) => (key ? t(key) : undefined);

  const stepIndex = step === 'request' ? 0 : 1;
  const stepSubtitle = step === 'request' ? t('forgot.subtitle') : t('forgot.stepReset');

  const resetToIdentifier = () => {
    setStep('request');
    setCode('');
    setPassword('');
    setConfirm('');
    setError('');
    setOtpDestinationPhone('');
    setFieldErrors({});
    setShowLengthRule(false);
    setShowMatchRule(false);
  };

  const requestOtp = async () => {
    if (otpRequestInFlight.current || loading) return;
    setError('');
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
    otpRequestInFlight.current = true;
    setLoading(true);
    try {
      const data = await requestForgotPasswordOtp(trimmed);
      setSessionId(data.sessionId);
      setOtpDestinationPhone(normalizeEthiopianPhone(trimmed) || '');
      setStep('reset');
      startCooldown();
    } catch (e) {
      setError(userFacingApiMessage(e, t('auth.connectionFailed'), t('forgot.requestFailed')));
    } finally {
      otpRequestInFlight.current = false;
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!canResend || resendLoading || loading || otpRequestInFlight.current) return;
    setError('');
    setFieldErrors((prev) => ({ ...prev, code: undefined }));
    otpRequestInFlight.current = true;
    setResendLoading(true);
    try {
      const data = await requestForgotPasswordOtp(identifier.trim());
      setSessionId(data.sessionId);
      setOtpDestinationPhone(normalizeEthiopianPhone(identifier.trim()) || '');
      startCooldown();
      setCode('');
    } catch (e) {
      setError(userFacingApiMessage(e, t('auth.connectionFailed'), t('forgot.requestFailed')));
    } finally {
      otpRequestInFlight.current = false;
      setResendLoading(false);
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
            <AuthSuccessPanel
              title={t('forgot.successTitle')}
              hero={t('forgot.successHero')}
              body={t('forgot.successBody')}
              ctaLabel={t('auth.signIn')}
              onCta={() => router.replace('/login')}
            />
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
                <AuthOtpBlock
                  label={t('forgot.code')}
                  phone={otpDestinationPhone}
                  destinationFallback={t('signup.otpSentRegisteredPhone')}
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setFieldErrors((prev) => ({ ...prev, code: undefined }));
                  }}
                  error={resolveError(fieldErrors.code)}
                  cooldown={cooldown}
                  canResend={canResend}
                  resendLoading={resendLoading}
                  onResend={resendOtp}
                  onChangePhone={resetToIdentifier}
                  changePhoneLabel={t('forgot.changeIdentifier')}
                />

                <View style={styles.stepDivider} />
                <Text style={[styles.sectionTitle, { color: AUTH.textMuted }]}>{t('forgot.passwordSection')}</Text>

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
              </>
            )}

            {showSupportOption ? (
              <View style={styles.supportCard}>
                <Text style={[styles.supportTitle, { color: AUTH.text }]}>{t('forgot.supportTitle')}</Text>
                <Text style={[styles.supportBody, { color: AUTH.textMuted }]}>{t('forgot.supportBody')}</Text>
                <Text style={[styles.supportBody, { color: AUTH.textMuted }]}>{t('forgot.supportAfterReset')}</Text>
                <Text style={[styles.supportAdmin, { color: AUTH.textDim }]}>{t('forgot.adminHint')}</Text>
                <Pressable style={styles.secondary} onPress={() => setShowSupportOption(false)}>
                  <Text style={[styles.secondaryText, { color: AUTH.link }]}>{t('common.close')}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.secondary} onPress={() => setShowSupportOption(true)}>
                <Text style={[styles.secondaryText, { color: AUTH.link }]}>{t('forgot.tryOtherOption')}</Text>
              </Pressable>
            )}

            <Pressable style={styles.back} onPress={() => router.replace('/login')}>
              <Text style={[styles.secondaryText, { color: AUTH.link }]}>{t('forgot.backToLogin')}</Text>
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
  stepDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  secondary: { alignItems: 'center', paddingVertical: 14 },
  back: { alignItems: 'center', paddingVertical: 18 },
  secondaryText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.15 },
  supportCard: {
    marginTop: 4,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  supportTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, letterSpacing: -0.2 },
  supportBody: { fontSize: 13, lineHeight: 20, marginTop: 4, letterSpacing: 0.1 },
  supportAdmin: { fontSize: 12, lineHeight: 18, marginTop: 10, letterSpacing: 0.1 },
});
