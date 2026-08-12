import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { ApiError } from '@/src/api/client';
import { changePassword } from '@/src/api/auth';
import { AppText as Text } from '@/src/components/AppText';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
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

function PasswordChecklist({ password, confirm }: { password: string; confirm: string }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const styles = useThemedStyles((colors) => ({
    wrap: {
      marginTop: 4,
      marginBottom: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.inputBg,
      gap: 8,
    },
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
    labelOk: { flex: 1, fontSize: 12, color: colors.success },
    labelIdle: { flex: 1, fontSize: 12, color: colors.dim },
  }));

  if (!password && !confirm) return null;

  const rules = [
    { ok: password.length >= MIN_PASSWORD_LENGTH, label: t('forms.passwordMin8') },
    { ok: password.length > 0 && password === confirm, label: t('forms.passwordsMatch') },
  ];

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      {rules.map((rule) => (
        <View key={rule.label} style={styles.row}>
          <Ionicons
            name={rule.ok ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={rule.ok ? c.success : c.dim}
          />
          <Text style={rule.ok ? styles.labelOk : styles.labelIdle}>{rule.label}</Text>
        </View>
      ))}
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
  const [successOpen, setSuccessOpen] = useState(false);
  const canChangePassword = Boolean(user && hasGymPortalAccess(user.role));

  const mutation = useMutation({
    mutationFn: () => changePassword(token!, currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFieldErrors({});
      setError('');
      setSuccessOpen(true);
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

  const canSubmit = useMemo(
    () =>
      currentPassword.length > 0 &&
      newPassword.length > 0 &&
      confirmPassword.length > 0 &&
      !mutation.isPending,
    [currentPassword, newPassword, confirmPassword, mutation.isPending],
  );

  const resolveError = (key?: string) => (key ? t(key) : undefined);

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
                  if (fieldErrors.currentPassword) {
                    setFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
                error={Boolean(fieldErrors.currentPassword)}
                returnKeyType="next"
              />
              <FieldError message={resolveError(fieldErrors.currentPassword)} />

              <Label>{t('forgot.newPassword')}</Label>
              <Field
                value={newPassword}
                onChangeText={(v) => {
                  setNewPassword(v);
                  if (fieldErrors.newPassword) {
                    setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
                error={Boolean(fieldErrors.newPassword)}
                returnKeyType="next"
              />
              <FieldError message={resolveError(fieldErrors.newPassword)} />

              <Label>{t('forms.confirmNewPassword')}</Label>
              <Field
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                secureTextEntry
                autoCapitalize="none"
                error={Boolean(fieldErrors.confirmPassword)}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <FieldError message={resolveError(fieldErrors.confirmPassword)} />

              <PasswordChecklist password={newPassword} confirm={confirmPassword} />

              <PrimaryButton
                label={t('forgot.updatePassword')}
                onPress={handleSubmit}
                loading={mutation.isPending}
                disabled={!canSubmit}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TabScreenFrame>
      <ConfirmDialog
        visible={successOpen}
        title={t('forgot.updatedTitle')}
        message={t('forms.passwordChangedBody')}
        alertOnly
        destructive={false}
        confirmLabel={t('common.ok')}
        onConfirm={() => {
          setSuccessOpen(false);
          router.back();
        }}
      />
    </Screen>
  );
}
