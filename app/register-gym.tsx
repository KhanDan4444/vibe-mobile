import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { completeGymSignup, requestGymSignupOtp } from '@/src/api/auth';
import { AuthFormEnter } from '@/src/components/AuthFormEnter';
import { AuthOtpBlock } from '@/src/components/AuthOtpBlock';
import { AuthScreen } from '@/src/components/AuthScreen';
import { AuthStepDots } from '@/src/components/AuthStepDots';
import { ErrorBanner, Field, FieldError, FormScroll, Label, PrimaryButton } from '@/src/components/Form';
import { PasswordRule } from '@/src/components/PasswordRule';
import { useOtpResendCooldown } from '@/src/hooks/useOtpResendCooldown';
import { AUTH, authSubtitle, authTitle } from '@/src/theme/authChrome';
import { formatDisplayDate } from '@/src/utils/date';
import {
  SIGNUP_TRIAL_DAYS,
  validateGymSignupAccountStep,
  validateGymSignupGymStep,
  type GymSignupFieldErrors,
} from '@/src/utils/gymSignupValidation';
import { isValidEthiopianPhone, normalizeEthiopianPhone } from '@/src/utils/phone';
import { MIN_PASSWORD_LENGTH } from '@/src/utils/passwordValidation';

const STEPS = ['phone', 'gym', 'account'] as const;
type SignupStep = (typeof STEPS)[number];
const SIGNUP_STEP_DOT_KEYS = ['signup.stepDotPhone', 'signup.stepDotGym', 'signup.stepDotAccount'] as const;

type RegisterDone = {
  gymName: string;
  username: string;
  phone?: string;
  trialEndDate?: string;
  trialDays: number;
};

export default function RegisterGymScreen() {
  const { t } = useTranslation();

  const [step, setStep] = useState<SignupStep>('phone');
  const [sessionId, setSessionId] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [gymName, setGymName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<GymSignupFieldErrors>({});
  const [showLengthRule, setShowLengthRule] = useState(false);
  const [showMatchRule, setShowMatchRule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [registerDone, setRegisterDone] = useState<RegisterDone | null>(null);
  const { cooldown, startCooldown, canResend } = useOtpResendCooldown();
  const otpRequestInFlight = useRef(false);

  const stepIndex = STEPS.indexOf(step);
  const signupStepLabels = SIGNUP_STEP_DOT_KEYS.map((key) => t(key));
  const stepSubtitle =
    step === 'phone' ? t('signup.stepPhone') : step === 'gym' ? t('signup.stepGym') : t('signup.stepAccount');
  const bannerError = error && Object.keys(fieldErrors).length === 0 ? error : '';
  const resolveError = (key?: string) => (key ? t(key) : undefined);

  const requestOtp = async () => {
    if (otpRequestInFlight.current || loading) return;
    setError('');
    setFieldErrors({});
    const trimmed = phone.trim();
    if (!trimmed) {
      setError(t('signup.phoneRequired'));
      return;
    }
    if (!isValidEthiopianPhone(trimmed)) {
      setError(t('signup.phoneInvalid'));
      return;
    }
    const normalized = normalizeEthiopianPhone(trimmed);
    if (!normalized) {
      setError(t('signup.phoneInvalid'));
      return;
    }
    otpRequestInFlight.current = true;
    setLoading(true);
    try {
      const data = await requestGymSignupOtp(trimmed);
      if (!data.sessionId) throw new Error(t('signup.noSession'));
      setSessionId(data.sessionId);
      setVerifiedPhone(normalized);
      startCooldown();
      setStep('gym');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('signup.otpFailed'));
    } finally {
      otpRequestInFlight.current = false;
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!canResend || resendLoading || loading || otpRequestInFlight.current) return;
    setError('');
    otpRequestInFlight.current = true;
    setResendLoading(true);
    try {
      const data = await requestGymSignupOtp(phone.trim());
      if (!data.sessionId) throw new Error(t('signup.noSession'));
      setSessionId(data.sessionId);
      startCooldown();
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('signup.otpFailed'));
    } finally {
      otpRequestInFlight.current = false;
      setResendLoading(false);
    }
  };

  const continueGym = () => {
    setError('');
    const next = validateGymSignupGymStep({ code, gymName, city, address });
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;
    setStep('account');
  };

  const backToPhone = () => {
    setStep('phone');
    setCode('');
    setError('');
    setFieldErrors({});
  };

  const lengthOk = password.length >= MIN_PASSWORD_LENGTH;
  const matchOk = confirm.length > 0 && confirm === password;

  const submitSignup = async () => {
    setError('');
    const accountErrors = validateGymSignupAccountStep({
      ownerName,
      username,
      email,
      password,
      confirm,
    });
    const gymErrors = validateGymSignupGymStep({ code, gymName, city, address });
    const next = { ...gymErrors, ...accountErrors };
    setFieldErrors(next);
    if (Object.keys(gymErrors).length > 0) {
      setStep('gym');
      return;
    }
    if (Object.keys(accountErrors).length > 0) return;

    setLoading(true);
    try {
      const cleanUsername = username.trim().toLowerCase();
      const payload = {
        sessionId,
        code: code.trim(),
        gym_name: gymName.trim(),
        city: city.trim(),
        owner_name: ownerName.trim(),
        username: cleanUsername,
        password,
        phone: verifiedPhone,
      };
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedAddress = address.trim();
      const data = await completeGymSignup({
        ...payload,
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
        ...(trimmedAddress ? { address: trimmedAddress } : {}),
      });
      const trialDays = data.subscription?.trial_days ?? SIGNUP_TRIAL_DAYS;
      setRegisterDone({
        gymName: gymName.trim(),
        username: cleanUsername,
        phone: verifiedPhone || phone.trim() || undefined,
        trialEndDate: data.subscription?.end_date,
        trialDays,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('signup.completeFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (registerDone) {
    const summaryRows = [
      { label: t('signup.usernameLabel'), value: `@${registerDone.username}` },
      registerDone.phone ? { label: t('signup.phoneLabel'), value: registerDone.phone } : null,
      registerDone.trialEndDate
        ? {
            label: t('signup.trialEndsLabel'),
            value: formatDisplayDate(registerDone.trialEndDate),
          }
        : null,
    ].filter(Boolean) as { label: string; value: string }[];

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
                {t('signup.successTitle')}
              </Text>
              <Text style={[styles.successGym, { color: AUTH.text }]} numberOfLines={2}>
                {registerDone.gymName}
              </Text>
              <Text style={[styles.successBody, { color: AUTH.textMuted }]}>{t('signup.successBody')}</Text>

              {summaryRows.length > 0 ? (
                <View style={styles.summary}>
                  {summaryRows.map((row) => (
                    <View key={row.label} style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: AUTH.textDim }]}>{row.label}</Text>
                      <Text latin style={[styles.summaryValue, { color: AUTH.text }]} numberOfLines={1}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={[styles.successHint, { color: AUTH.textDim }]}>
                {t('signup.successHint', { days: registerDone.trialDays })}
              </Text>

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
          steps={STEPS.length}
          compact
          stepLabels={signupStepLabels}
          progressLabel={t('signup.stepProgress', { current: stepIndex + 1, total: STEPS.length })}
        />
      }
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll contentContainerStyle={{ paddingTop: 20 }}>
          <AuthFormEnter delay={40}>
            <Text display style={[styles.title, { color: AUTH.text }]}>
              {t('signup.title')}
            </Text>
            <Text style={[styles.subtitle, { color: AUTH.textMuted }]}>{stepSubtitle}</Text>
          </AuthFormEnter>

          <AuthFormEnter delay={120}>
            <ErrorBanner message={bannerError} />

            {step === 'phone' ? (
              <>
                <Label>{t('signup.ownerPhone')}</Label>
                <Field
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  latin
                  placeholder={t('signup.phonePlaceholder')}
                />
                <Text style={[styles.hint, { color: AUTH.textDim }]}>{t('signup.phoneHint')}</Text>
                <PrimaryButton label={t('signup.sendOtp')} onPress={requestOtp} loading={loading} />
              </>
            ) : null}

            {step === 'gym' ? (
              <>
                <AuthOtpBlock
                  label={t('signup.code')}
                  phone={verifiedPhone || phone}
                  value={code}
                  onChange={(next) => {
                    setCode(next);
                    setFieldErrors((prev) => ({ ...prev, code: undefined }));
                  }}
                  error={fieldErrors.code ? resolveError(fieldErrors.code) : undefined}
                  cooldown={cooldown}
                  canResend={canResend}
                  resendLoading={resendLoading}
                  onResend={resendOtp}
                  onChangePhone={backToPhone}
                />

                <View style={styles.stepDivider} />
                <Text style={[styles.sectionTitle, { color: AUTH.textDim }]}>{t('signup.sectionGym')}</Text>

                <Label>{t('signup.gymName')}</Label>
                <Field
                  value={gymName}
                  onChangeText={(v) => {
                    setGymName(v);
                    setFieldErrors((prev) => ({ ...prev, gymName: undefined }));
                  }}
                  placeholder={t('signup.gymNamePlaceholder')}
                  error={Boolean(fieldErrors.gymName)}
                />
                {fieldErrors.gymName ? <FieldError message={resolveError(fieldErrors.gymName)} /> : null}

                <Label>{t('signup.city')}</Label>
                <Field
                  value={city}
                  onChangeText={(v) => {
                    setCity(v);
                    setFieldErrors((prev) => ({ ...prev, city: undefined }));
                  }}
                  autoCapitalize="words"
                  placeholder={t('signup.cityPlaceholder')}
                  error={Boolean(fieldErrors.city)}
                />
                {fieldErrors.city ? <FieldError message={resolveError(fieldErrors.city)} /> : null}

                <Label>{t('signup.addressOptional')}</Label>
                <Field
                  value={address}
                  onChangeText={(v) => {
                    setAddress(v);
                    setFieldErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  autoCapitalize="words"
                  placeholder={t('signup.addressPlaceholder')}
                  error={Boolean(fieldErrors.address)}
                />
                {fieldErrors.address ? <FieldError message={resolveError(fieldErrors.address)} /> : null}

                <PrimaryButton label={t('common.continue')} onPress={continueGym} />
              </>
            ) : null}

            {step === 'account' ? (
              <>
                <View style={styles.stepDivider} />
                <Text style={[styles.sectionTitle, { color: AUTH.textDim }]}>{t('signup.sectionAccount')}</Text>

                <Label>{t('signup.ownerName')}</Label>
                <Field
                  value={ownerName}
                  onChangeText={(v) => {
                    setOwnerName(v);
                    setFieldErrors((prev) => ({ ...prev, ownerName: undefined }));
                  }}
                  autoCapitalize="words"
                  error={Boolean(fieldErrors.ownerName)}
                />
                {fieldErrors.ownerName ? <FieldError message={resolveError(fieldErrors.ownerName)} /> : null}

                <Label>{t('signup.username')}</Label>
                <Field
                  value={username}
                  onChangeText={(v) => {
                    setUsername(v.toLowerCase());
                    setFieldErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  autoCapitalize="none"
                  latin
                  placeholder={t('signup.usernamePlaceholder')}
                  error={Boolean(fieldErrors.username)}
                />
                {fieldErrors.username ? <FieldError message={resolveError(fieldErrors.username)} /> : null}
                <Text style={[styles.hint, { color: AUTH.textDim }]}>{t('signup.usernameHint')}</Text>

                <Label>{t('signup.emailOptional')}</Label>
                <Field
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  latin
                  error={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email ? <FieldError message={resolveError(fieldErrors.email)} /> : null}
                <Text style={[styles.hint, { color: AUTH.textDim }]}>{t('signup.emailHint')}</Text>

                <Label>{t('signup.password')}</Label>
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

                <Label>{t('signup.confirmPassword')}</Label>
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

                <Text style={[styles.hint, { color: AUTH.textDim }]}>
                  {t('signup.trialNote', { days: SIGNUP_TRIAL_DAYS })}
                </Text>
                <PrimaryButton label={t('signup.createAccount')} onPress={submitSignup} loading={loading} />
                <Pressable
                  style={styles.secondary}
                  onPress={() => {
                    setError('');
                    setFieldErrors({});
                    setStep('gym');
                  }}
                >
                  <Text style={[styles.secondaryText, { color: AUTH.link }]}>{t('common.back')}</Text>
                </Pressable>
              </>
            ) : null}

            <Pressable style={styles.back} onPress={() => router.replace('/login')}>
              <Text style={[styles.backLinkText, { color: AUTH.link }]}>{t('signup.backToLogin')}</Text>
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
  hint: { fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 20, letterSpacing: 0.1 },
  stepDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  secondary: { alignItems: 'center', paddingVertical: 14 },
  back: { alignItems: 'center', paddingVertical: 18 },
  backLinkText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.15 },
  secondaryText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.15 },
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
  successGym: {
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
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  successHint: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 300,
  },
  successCta: {
    marginTop: 22,
    width: '100%',
  },
});
