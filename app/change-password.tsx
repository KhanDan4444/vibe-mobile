import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { ApiError } from '@/src/api/client';
import { changePassword } from '@/src/api/auth';
import { AppText as Text } from '@/src/components/AppText';
import { FormSuccessView } from '@/src/components/FormSuccessView';
import { ErrorBanner, Field, FieldError, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import {
  MIN_PASSWORD_LENGTH,
  isIncorrectCurrentPasswordError,
  validatePasswordChange,
  type PasswordChangeErrors,
} from '@/src/utils/passwordValidation';
import { hasGymPortalAccess } from '@/src/utils/roles';

/** Live password checklist row — empty circle → green check (not alarm X). */
function PasswordRule({
  show,
  ok,
  label,
}: {
  show: boolean;
  ok: boolean;
  label: string;
}) {
  const { colors: c } = useTheme();
  const styles = useThemedStyles((colors) => ({
    row: {
      marginTop: 6,
      marginBottom: 2,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    labelOk: { flex: 1, fontSize: 12, fontWeight: '500' as const, color: colors.success },
    labelPending: { flex: 1, fontSize: 12, fontWeight: '500' as const, color: colors.muted },
  }));

  if (!show) return null;

  return (
    <View style={styles.row} accessibilityRole="text" accessibilityState={{ checked: ok }}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={ok ? c.success : c.muted}
      />
      <Text style={ok ? styles.labelOk : styles.labelPending}>{label}</Text>
    </View>
  );
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const { formMaxWidth, pagePadding } = useResponsiveLayout();
  const styles = useThemedStyles((colors) => ({
    content: { paddingVertical: 16, paddingBottom: 40, alignItems: 'center' as const },
    form: { width: '100%' as const, maxWidth: formMaxWidth },
    hint: { marginTop: 4, marginBottom: 14, fontSize: 13, lineHeight: 18, color: colors.dim },
  }));

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<PasswordChangeErrors>({});
  const [showLengthRule, setShowLengthRule] = useState(false);
  const [showMatchRule, setShowMatchRule] = useState(false);
  const [done, setDone] = useState(false);
  const canChangePassword = Boolean(user && hasGymPortalAccess(user.role));

  const lengthOk = newPassword.length >= MIN_PASSWORD_LENGTH;
  const matchOk = confirmPassword.length > 0 && newPassword === confirmPassword;

  const mutation = useMutation({
    mutationFn: () => changePassword(token!, currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFieldErrors({});
      setError('');
      setDone(true);
    },
    onError: (e: Error) => {
      if (isIncorrectCurrentPasswordError(e) || (e instanceof ApiError && e.field === 'currentPassword')) {
        setFieldErrors({ currentPassword: 'forms.currentPasswordIncorrect' });
        setError('');
        return;
      }
      setError(userFacingApiMessage(e, t('auth.connectionFailed'), t('forms.passwordUpdateFailed')));
    },
  });

  const resolveError = (key?: string) => (key ? t(key) : undefined);

  const liveNewPasswordError = (value: string, current: string): string | undefined => {
    if (!value) return undefined;
    if (current && value === current) return 'forms.passwordSame';
    return undefined;
  };

  const handleSubmit = () => {
    setError('');
    const next = validatePasswordChange(currentPassword, newPassword, confirmPassword);
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;
    mutation.mutate();
  };

  if (!canChangePassword) {
    return <Redirect href="/login" />;
  }

  if (done) {
    return (
      <Screen>
        <TabScreenFrame>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingHorizontal: pagePadding }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              <FormSuccessView
                title={t('forms.successAllSet')}
                hero={t('forms.passwordSuccessHero')}
                body={t('forms.passwordSuccessBody')}
                ctaLabel={t('common.done')}
                onCta={() => router.back()}
              />
            </View>
          </ScrollView>
        </TabScreenFrame>
      </Screen>
    );
  }

  return (
    <Screen>
      <TabScreenFrame>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingHorizontal: pagePadding }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              <Text style={styles.hint}>{t('forms.changePasswordHint')}</Text>
              <ErrorBanner message={error} />

              <Label>{t('forms.currentPassword')}</Label>
              <Field
                value={currentPassword}
                onChangeText={(v) => {
                  setCurrentPassword(v);
                  setFieldErrors((prev) => ({
                    ...prev,
                    currentPassword: undefined,
                    newPassword: liveNewPasswordError(newPassword, v),
                  }));
                }}
                secureTextEntry
                autoCapitalize="none"
                error={Boolean(fieldErrors.currentPassword)}
                returnKeyType="next"
              />
              {fieldErrors.currentPassword ? (
                <FieldError message={resolveError(fieldErrors.currentPassword)} />
              ) : null}

              <Label>{t('forgot.newPassword')}</Label>
              <Field
                value={newPassword}
                onFocus={() => setShowLengthRule(true)}
                onChangeText={(v) => {
                  setNewPassword(v);
                  setShowLengthRule(true);
                  setFieldErrors((prev) => ({
                    ...prev,
                    newPassword: liveNewPasswordError(v, currentPassword),
                    confirmPassword: undefined,
                  }));
                }}
                secureTextEntry
                autoCapitalize="none"
                error={Boolean(fieldErrors.newPassword)}
                returnKeyType="next"
              />
              <PasswordRule
                show={showLengthRule || newPassword.length > 0}
                ok={lengthOk}
                label={t('forms.passwordMin8')}
              />
              {fieldErrors.newPassword ? (
                <FieldError message={resolveError(fieldErrors.newPassword)} />
              ) : null}

              <Label>{t('forms.confirmNewPassword')}</Label>
              <Field
                value={confirmPassword}
                onFocus={() => setShowMatchRule(true)}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setShowMatchRule(true);
                  setFieldErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
                }}
                secureTextEntry
                autoCapitalize="none"
                error={Boolean(fieldErrors.confirmPassword)}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <PasswordRule
                show={showMatchRule || confirmPassword.length > 0}
                ok={matchOk}
                label={t('forms.passwordsMatch')}
              />

              <PrimaryButton
                label={t('forgot.updatePassword')}
                onPress={handleSubmit}
                loading={mutation.isPending}
                disabled={mutation.isPending}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TabScreenFrame>
    </Screen>
  );
}
