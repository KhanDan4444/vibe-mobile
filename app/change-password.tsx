import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { changePassword } from '@/src/api/auth';
import { ErrorBanner, Field, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { hasGymPortalAccess } from '@/src/utils/roles';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { formMaxWidth, pagePadding } = useResponsiveLayout();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const canChangePassword = Boolean(user && hasGymPortalAccess(user.role));

  const mutation = useMutation({
    mutationFn: () => changePassword(token!, currentPassword, newPassword),
    onSuccess: () => {
      Alert.alert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword;

  const handleSubmit = () => {
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
      return;
    }
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
          contentContainerStyle={[styles.content, { paddingHorizontal: pagePadding, alignItems: 'center' }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: '100%', maxWidth: formMaxWidth }}>
          <ErrorBanner message={error} />

          <Label>Current password</Label>
          <Field value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" />

          <Label>New password</Label>
          <Field value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" />

          <Label>Confirm new password</Label>
          <Field value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" />

          <PrimaryButton label="Update password" onPress={handleSubmit} loading={mutation.isPending} disabled={!canSubmit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </TabScreenFrame>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 40 },
});
