import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Pressable } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { requestForgotPasswordOtp, resetPasswordWithOtp } from '@/src/api/auth';
import { AuthFormEnter } from '@/src/components/AuthFormEnter';
import { AuthScreen } from '@/src/components/AuthScreen';
import { AuthStepDots } from '@/src/components/AuthStepDots';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ErrorBanner, Field, FormScroll, Label, PrimaryButton } from '@/src/components/Form';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { AUTH, authSubtitle, authTitle } from '@/src/theme/authChrome';
import { isValidEthiopianPhone } from '@/src/utils/phone';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';

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
  const [loading, setLoading] = useState(false);
  const [showSupportOption, setShowSupportOption] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
      const data = await resetPasswordWithOtp({ sessionId, code, password });
      setSuccessMessage(data.message || t('forgot.updatedBody'));
      setSuccessOpen(true);
    } catch (e) {
      setError(userFacingApiMessage(e, t('auth.connectionFailed'), t('forgot.resetFailed')));
    } finally {
      setLoading(false);
    }
  };

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
      <ConfirmDialog
        visible={successOpen}
        title={t('forgot.updatedTitle')}
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
});
