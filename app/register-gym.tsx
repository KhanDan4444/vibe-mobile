import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '@/src/components/AppText';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { completeGymSignup, requestGymSignupOtp, verifyGymSignupOtp } from '@/src/api/auth';
import { AuthFormEnter } from '@/src/components/AuthFormEnter';
import { AuthOtpBlock } from '@/src/components/AuthOtpBlock';
import { AuthScreen } from '@/src/components/AuthScreen';
import { AuthStepDots } from '@/src/components/AuthStepDots';
import { AuthSuccessPanel } from '@/src/components/AuthSuccessPanel';
import { ErrorBanner, Field, FieldError, FormScroll, Label, PrimaryButton } from '@/src/components/Form';
import { PasswordRule } from '@/src/components/PasswordRule';
import { useOtpResendCooldown } from '@/src/hooks/useOtpResendCooldown';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
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
  ownerName?: string;
  location?: string;
  phone?: string;
  email?: string;
  trialEndDate?: string;
  trialDays: number;
};

function formatSignupLocation(city: string, address: string) {
  const cityLabel = city.trim();
  const addressLabel = address.trim();
  if (cityLabel && addressLabel) return `${cityLabel}, ${addressLabel}`;
  return cityLabel || addressLabel || undefined;
}

function SignupTrialNote({ days }: { days: number }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={trialNoteStyles.wrap}>
      <Text style={[trialNoteStyles.text, { color: AUTH.textDim }]}>
        {expanded ? t('signup.trialNote', { days }) : t('signup.trialNoteShort', { days })}
      </Text>
      <Pressable
        onPress={() => setExpanded((open) => !open)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={[trialNoteStyles.toggle, { color: AUTH.link }]}>
          {expanded ? t('signup.trialShowLess') : t('signup.trialLearnMore')}
        </Text>
      </Pressable>
    </View>
  );
}

const trialNoteStyles = StyleSheet.create({
  wrap: { gap: 4 },
  text: { fontSize: 12, lineHeight: 18, letterSpacing: 0.1 },
  toggle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.1 },
});

export default function RegisterGymScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { pagePadding, formMaxWidth } = useResponsiveLayout();
  const stickyPadBottom = Math.max(insets.bottom, 10) + 8;

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
  const [otpVerified, setOtpVerified] = useState(false);
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
      setOtpVerified(false);
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
      setOtpVerified(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('signup.otpFailed'));
    } finally {
      otpRequestInFlight.current = false;
      setResendLoading(false);
    }
  };

  const backToPhone = () => {
    setStep('phone');
    setCode('');
    setOtpVerified(false);
    setError('');
    setFieldErrors({});
  };

  const continueGym = async () => {
    setError('');
    const next = validateGymSignupGymStep({ code, gymName, city, address });
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await verifyGymSignupOtp({
        sessionId,
        code: code.trim(),
        phone: verifiedPhone,
      });
      setOtpVerified(true);
      setStep('account');
    } catch (e) {
      setOtpVerified(false);
      setError(e instanceof Error ? e.message : t('signup.verifyFailed'));
    } finally {
      setLoading(false);
    }
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
    const gymErrors = otpVerified ? {} : validateGymSignupGymStep({ code, gymName, city, address });
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
        ownerName: ownerName.trim() || undefined,
        location: formatSignupLocation(city, address),
        phone: verifiedPhone || phone.trim() || undefined,
        email: trimmedEmail || undefined,
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
      registerDone.ownerName ? { label: t('signup.ownerNameLabel'), value: registerDone.ownerName } : null,
      registerDone.phone ? { label: t('signup.phoneLabel'), value: registerDone.phone } : null,
      registerDone.email ? { label: t('signup.emailLabel'), value: registerDone.email } : null,
      registerDone.location ? { label: t('signup.locationLabel'), value: registerDone.location } : null,
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
            <AuthSuccessPanel
              title={t('signup.successTitle')}
              hero={registerDone.gymName}
              body={t('signup.successBody')}
              rows={summaryRows.map((row) => ({
                ...row,
                latin: row.label !== t('signup.ownerNameLabel'),
              }))}
              hint={t('signup.successHint', { days: registerDone.trialDays })}
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
      flushBottom={step === 'account'}
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
        <FormScroll
          key={step}
          style={step === 'account' ? { flex: 1 } : undefined}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: step === 'account' ? 16 : undefined }}
        >
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
                    setOtpVerified(false);
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

                <PrimaryButton label={t('common.continue')} onPress={continueGym} loading={loading} />
              </>
            ) : null}

            {step === 'account' ? (
              <>
                <Label>{t('signup.ownerName')}</Label>
                <Field
                  value={ownerName}
                  onChangeText={(v) => {
                    setOwnerName(v);
                    setFieldErrors((prev) => ({ ...prev, ownerName: undefined }));
                  }}
                  autoCapitalize="words"
                  placeholder={t('signup.ownerNamePlaceholder')}
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
              </>
            ) : null}

            <Pressable style={styles.back} onPress={() => router.replace('/login')}>
              <Text style={[styles.backLinkText, { color: AUTH.link }]}>{t('signup.backToLogin')}</Text>
            </Pressable>
          </AuthFormEnter>
        </FormScroll>

        {step === 'account' ? (
          <View
            style={[
              styles.stickyFooter,
              { paddingBottom: stickyPadBottom, paddingHorizontal: pagePadding },
            ]}
          >
            <View style={{ width: '100%', maxWidth: formMaxWidth, alignSelf: 'center' }}>
              <SignupTrialNote days={SIGNUP_TRIAL_DAYS} />
              <PrimaryButton
                label={t('signup.createAccount')}
                onPress={submitSignup}
                loading={loading}
                style={styles.stickyBtn}
              />
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
            </View>
          </View>
        ) : null}
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
  secondary: { alignItems: 'center', paddingVertical: 10 },
  back: { alignItems: 'center', paddingVertical: 18 },
  backLinkText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.15 },
  secondaryText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.15 },
  stickyFooter: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(8, 15, 24, 0.94)',
  },
  stickyBtn: { marginTop: 10, marginBottom: 0 },
});
