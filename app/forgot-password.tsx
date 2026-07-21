import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { requestForgotPasswordOtp, resetPasswordWithOtp } from '@/src/api/auth';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ErrorBanner, Field, FormScroll, Label, PrimaryButton } from '@/src/components/Form';
import { AuthScreen } from '@/src/components/AuthScreen';
import { useTheme } from '@/src/context/PreferencesContext';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [username, setUsername] = useState('');
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

  const requestOtp = async () => {
    setError('');
    setMessage('');
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError(t('forgot.usernameRequired'));
      return;
    }
    setLoading(true);
    try {
      const data = await requestForgotPasswordOtp(cleanUsername);
      if (!data.sessionId) throw new Error(t('forgot.noSession'));
      setSessionId(data.sessionId);
      setStep('reset');
      setMessage(data.message || t('forgot.otpSent'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('forgot.requestFailed'));
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
      setError(e instanceof Error ? e.message : t('forgot.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll contentContainerStyle={{ paddingTop: 72 }}>
          <Text style={[styles.title, { color: c.text }]}>{t('forgot.title')}</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>{t('forgot.subtitle')}</Text>
          <ErrorBanner message={error} />
          {message ? <Text style={[styles.message, { color: c.success }]}>{message}</Text> : null}

          {step === 'request' ? (
            <>
              <Label>{t('forgot.username')}</Label>
              <Field value={username} onChangeText={setUsername} autoCapitalize="none" placeholder={t('forgot.usernamePlaceholder')} />
              <PrimaryButton label={t('forgot.sendOtp')} onPress={requestOtp} loading={loading} />
            </>
          ) : (
            <>
              <Label>{t('forgot.code')}</Label>
              <Field value={code} onChangeText={setCode} keyboardType="numeric" autoCapitalize="none" />

              <Label>{t('forgot.newPassword')}</Label>
              <Field value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />

              <Label>{t('forgot.confirmPassword')}</Label>
              <Field value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" />

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
                <Text style={[styles.secondaryText, { color: c.accentText }]}>{t('forgot.resendOtp')}</Text>
              </Pressable>
            </>
          )}

          <Pressable style={styles.secondary} onPress={() => setShowSupportOption((show) => !show)}>
            <Text style={[styles.secondaryText, { color: c.accentText }]}>{t('forgot.tryOtherOption')}</Text>
          </Pressable>

          {showSupportOption ? (
            <View style={[styles.supportCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.supportTitle, { color: c.text }]}>{t('forgot.supportTitle')}</Text>
              <Text style={[styles.supportBody, { color: c.muted }]}>{t('forgot.supportBody')}</Text>
              <Text style={[styles.supportBody, { color: c.muted }]}>{t('forgot.supportAfterReset')}</Text>
            </View>
          ) : null}

          <Pressable style={styles.back} onPress={() => router.replace('/login')}>
            <Text style={[styles.secondaryText, { color: c.muted }]}>{t('forgot.backToLogin')}</Text>
          </Pressable>
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
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  subtitle: { marginTop: 8, marginBottom: 24, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  message: { marginBottom: 12, fontSize: 14, textAlign: 'center' },
  secondary: { alignItems: 'center', paddingVertical: 14 },
  back: { alignItems: 'center', paddingVertical: 18 },
  secondaryText: { fontSize: 14, fontWeight: '600' },
  supportCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  supportTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  supportBody: { fontSize: 13, lineHeight: 20, marginTop: 4 },
});
