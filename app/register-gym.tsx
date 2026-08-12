import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { completeGymSignup, getPublicSaasPlans, requestGymSignupOtp } from '@/src/api/auth';
import { AuthScreen } from '@/src/components/AuthScreen';
import { AuthStepDots } from '@/src/components/AuthStepDots';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { OptionPickerField } from '@/src/components/OptionPickerField';
import { ErrorBanner, Field, FormScroll, Label, PrimaryButton } from '@/src/components/Form';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { PageSkeleton } from '@/src/components/Skeleton';
import { useTheme } from '@/src/context/PreferencesContext';
import type { PublicSaasPlan } from '@/src/types/api';
import { formatEtb } from '@/src/utils/formatMoney';
import { isValidEthiopianPhone, normalizeEthiopianPhone } from '@/src/utils/phone';

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
const STEPS = ['phone', 'gym', 'account'] as const;
type SignupStep = (typeof STEPS)[number];

export default function RegisterGymScreen() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();

  const [plans, setPlans] = useState<PublicSaasPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [step, setStep] = useState<SignupStep>('phone');
  const [sessionId, setSessionId] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saasPlanId, setSaasPlanId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const stepIndex = STEPS.indexOf(step);
  const stepSubtitle =
    step === 'phone' ? t('signup.stepPhone') : step === 'gym' ? t('signup.stepGym') : t('signup.stepAccount');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getPublicSaasPlans();
        if (!cancelled) {
          setPlans(list);
          if (list.length > 0) setSaasPlanId(String(list[0].id));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('signup.loadFailed'));
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const planOptions = useMemo(
    () =>
      plans.map((p) => ({
        value: String(p.id),
        label: `${p.name} — ${formatEtb(Number(p.price))} / ${p.duration}mo`,
      })),
    [plans],
  );

  const requestOtp = async () => {
    setError('');
    setMessage('');
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
    setLoading(true);
    try {
      const data = await requestGymSignupOtp(trimmed);
      if (!data.sessionId) throw new Error(t('signup.noSession'));
      setSessionId(data.sessionId);
      setVerifiedPhone(normalized);
      setMessage(data.message || t('signup.otpSent'));
      setStep('gym');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('signup.otpFailed'));
    } finally {
      setLoading(false);
    }
  };

  const continueGym = () => {
    setError('');
    if (!code.trim()) {
      setError(t('signup.codeRequired'));
      return;
    }
    if (!gymName.trim()) {
      setError(t('signup.gymNameRequired'));
      return;
    }
    if (!saasPlanId) {
      setError(t('signup.planRequired'));
      return;
    }
    setStep('account');
  };

  const backToPhone = () => {
    setStep('phone');
    setCode('');
    setError('');
    setMessage('');
  };

  const submitSignup = async () => {
    setError('');
    if (!ownerName.trim()) {
      setError(t('signup.ownerNameRequired'));
      return;
    }
    const cleanUsername = username.trim().toLowerCase();
    if (!USERNAME_RE.test(cleanUsername)) {
      setError(t('signup.usernameInvalid'));
      return;
    }
    if (password.length < 8) {
      setError(t('signup.passwordShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('signup.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        sessionId,
        code: code.trim(),
        gym_name: gymName.trim(),
        owner_name: ownerName.trim(),
        username: cleanUsername,
        password,
        phone: verifiedPhone,
        saas_plan_id: parseInt(saasPlanId, 10),
      };
      const trimmedEmail = email.trim().toLowerCase();
      const data = await completeGymSignup(trimmedEmail ? { ...payload, email: trimmedEmail } : payload);
      setSuccessMessage(data.message || t('signup.successBody'));
      setSuccessOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('signup.completeFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (plansLoading) {
    return (
      <AuthScreen>
        <PageSkeleton variant="form" count={4} />
      </AuthScreen>
    );
  }

  if (plans.length === 0) {
    return (
      <AuthScreen>
        <SoftSurface variant="panel" style={[styles.centered, styles.unavailableCard]}>
          <Text style={[styles.unavailableText, { color: c.muted }]}>{t('signup.unavailable')}</Text>
          <Pressable onPress={() => router.replace('/login')} style={styles.backLink}>
            <Text style={[styles.backLinkText, { color: c.accent }]}>{t('signup.backToLogin')}</Text>
          </Pressable>
        </SoftSurface>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen headerCenter={<AuthStepDots activeIndex={stepIndex} steps={3} compact />}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll contentContainerStyle={{ paddingTop: 12 }}>
          <Text display style={[styles.title, { color: c.text }]}>
            {t('signup.title')}
          </Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>{stepSubtitle}</Text>
          <ErrorBanner message={error} />
          {message && step === 'gym' ? (
            <Text style={[styles.message, { color: c.success }]}>{message}</Text>
          ) : null}

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
              <Text style={[styles.hint, { color: c.dim }]}>{t('signup.phoneHint')}</Text>
              <PrimaryButton label={t('signup.sendOtp')} onPress={requestOtp} loading={loading} />
            </>
          ) : null}

          {step === 'gym' ? (
            <>
              <Label>{t('signup.code')}</Label>
              <Field value={code} onChangeText={setCode} keyboardType="numeric" autoCapitalize="none" latin />

              <Label>{t('signup.gymName')}</Label>
              <Field value={gymName} onChangeText={setGymName} placeholder={t('signup.gymNamePlaceholder')} />

              <OptionPickerField
                label={t('signup.plan')}
                placeholder={t('signup.plan')}
                options={planOptions}
                value={saasPlanId}
                onChange={setSaasPlanId}
                sheetTitle={t('signup.plan')}
              />

              <PrimaryButton label={t('common.continue')} onPress={continueGym} />
              <Pressable style={styles.secondary} onPress={backToPhone}>
                <Text style={[styles.secondaryText, { color: c.accentText }]}>{t('signup.changePhone')}</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'account' ? (
            <>
              <Label>{t('signup.ownerName')}</Label>
              <Field value={ownerName} onChangeText={setOwnerName} autoCapitalize="words" />

              <Label>{t('signup.username')}</Label>
              <Field
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase())}
                autoCapitalize="none"
                latin
                placeholder={t('signup.usernamePlaceholder')}
              />

              <Label>{t('signup.emailOptional')}</Label>
              <Field
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                latin
              />

              <Label>{t('signup.password')}</Label>
              <Field value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" latin />

              <Label>{t('signup.confirmPassword')}</Label>
              <Field value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" latin />

              <Text style={[styles.hint, { color: c.dim }]}>{t('signup.paymentNote')}</Text>
              <PrimaryButton label={t('signup.createAccount')} onPress={submitSignup} loading={loading} />
              <Pressable
                style={styles.secondary}
                onPress={() => {
                  setError('');
                  setStep('gym');
                }}
              >
                <Text style={[styles.secondaryText, { color: c.accentText }]}>{t('common.back')}</Text>
              </Pressable>
            </>
          ) : null}

          <Pressable style={styles.back} onPress={() => router.replace('/login')}>
            <Text style={[styles.backLinkText, { color: c.accent }]}>{t('signup.backToLogin')}</Text>
          </Pressable>
        </FormScroll>
      </KeyboardAvoidingView>
      <ConfirmDialog
        visible={successOpen}
        title={t('signup.successTitle')}
        message={successMessage}
        alertOnly
        destructive={false}
        confirmLabel={t('common.done')}
        onConfirm={() => {
          setSuccessOpen(false);
          router.replace('/login');
        }}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  unavailableCard: {
    padding: 24,
    maxWidth: 360,
    width: '100%',
  },
  unavailableText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '600', textAlign: 'center', letterSpacing: -0.4 },
  subtitle: { marginTop: 8, marginBottom: 20, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  message: { marginBottom: 12, fontSize: 14, textAlign: 'center' },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 20 },
  secondary: { alignItems: 'center', paddingVertical: 14 },
  back: { alignItems: 'center', paddingVertical: 18 },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 14, fontWeight: '700' },
  secondaryText: { fontSize: 14, fontWeight: '600' },
});
