import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { completeGymSignup, getPublicSaasPlans, requestGymSignupOtp } from '@/src/api/auth';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { OptionPickerField } from '@/src/components/OptionPickerField';
import { ErrorBanner, Field, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useTheme } from '@/src/context/PreferencesContext';
import type { PublicSaasPlan } from '@/src/types/api';
import { formatEtb } from '@/src/utils/formatMoney';
import { isValidEthiopianPhone, normalizeEthiopianPhone } from '@/src/utils/phone';

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

export default function RegisterGymScreen() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();

  const [plans, setPlans] = useState<PublicSaasPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [step, setStep] = useState<'phone' | 'details'>('phone');
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
    [plans]
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
      setStep('details');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('signup.otpFailed'));
    } finally {
      setLoading(false);
    }
  };

  const submitSignup = async () => {
    setError('');
    if (!code.trim()) {
      setError(t('signup.codeRequired'));
      return;
    }
    if (!gymName.trim() || !ownerName.trim()) {
      setError(t('signup.namesRequired'));
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
    if (!saasPlanId) {
      setError(t('signup.planRequired'));
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
      const data = await completeGymSignup(
        trimmedEmail ? { ...payload, email: trimmedEmail } : payload
      );
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
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      </Screen>
    );
  }

  if (plans.length === 0) {
    return (
      <Screen>
        <View style={[styles.centered, styles.unavailableCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.unavailableText, { color: c.muted }]}>{t('signup.unavailable')}</Text>
          <Pressable onPress={() => router.replace('/login')} style={styles.backLink}>
            <Text style={[styles.backLinkText, { color: c.accent }]}>{t('signup.backToLogin')}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: c.text }]}>{t('signup.title')}</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>{t('signup.subtitle')}</Text>
          <ErrorBanner message={error} />
          {message && step === 'details' ? (
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
                placeholder={t('signup.phonePlaceholder')}
              />
              <Text style={[styles.hint, { color: c.dim }]}>{t('signup.phoneHint')}</Text>
              <PrimaryButton label={t('signup.sendOtp')} onPress={requestOtp} loading={loading} />
            </>
          ) : (
            <>
              <Label>{t('signup.code')}</Label>
              <Field value={code} onChangeText={setCode} keyboardType="numeric" autoCapitalize="none" />

              <Label>{t('signup.gymName')}</Label>
              <Field value={gymName} onChangeText={setGymName} placeholder={t('signup.gymNamePlaceholder')} />

              <Label>{t('signup.ownerName')}</Label>
              <Field value={ownerName} onChangeText={setOwnerName} />

              <Label>{t('signup.username')}</Label>
              <Field
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase())}
                autoCapitalize="none"
                placeholder={t('signup.usernamePlaceholder')}
              />

              <Label>{t('signup.emailOptional')}</Label>
              <Field
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <OptionPickerField
                label={t('signup.plan')}
                placeholder={t('signup.plan')}
                options={planOptions}
                value={saasPlanId}
                onChange={setSaasPlanId}
                sheetTitle={t('signup.plan')}
              />

              <Label>{t('signup.password')}</Label>
              <Field value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />

              <Label>{t('signup.confirmPassword')}</Label>
              <Field value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />

              <Text style={[styles.hint, { color: c.dim }]}>{t('signup.paymentNote')}</Text>
              <PrimaryButton label={t('signup.createAccount')} onPress={submitSignup} loading={loading} />
              <Pressable
                style={styles.secondary}
                onPress={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                  setMessage('');
                }}
              >
                <Text style={[styles.secondaryText, { color: c.accentText }]}>{t('signup.changePhone')}</Text>
              </Pressable>
            </>
          )}

          <Pressable style={styles.back} onPress={() => router.replace('/login')}>
            <Text style={[styles.backLinkText, { color: c.accent }]}>{t('signup.backToLogin')}</Text>
          </Pressable>
        </ScrollView>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 72, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  unavailableCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    maxWidth: 360,
    width: '100%',
  },
  unavailableText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { marginTop: 8, marginBottom: 24, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  message: { marginBottom: 12, fontSize: 14, textAlign: 'center' },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 20 },
  secondary: { alignItems: 'center', paddingVertical: 14 },
  back: { alignItems: 'center', paddingVertical: 18 },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 14, fontWeight: '700' },
  secondaryText: { fontSize: 14, fontWeight: '600' },
});
