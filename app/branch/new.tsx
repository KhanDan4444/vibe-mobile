import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { createBranch, type BranchPayload } from '@/src/api/branches';
import { ErrorBanner, Field, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useTheme } from '@/src/context/PreferencesContext';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { isGymOwner } from '@/src/utils/roles';

export default function NewBranchScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const canManageBranches = Boolean(user && isGymOwner(user.role));

  const mutation = useOfflineMutation({
    jobType: 'create-branch',
    mutationFn: (payload: BranchPayload) => createBranch(token!, payload),
    onSuccess: (data) => {
      if (isOfflineQueued(data)) {
        flashOffline();
        router.back();
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      flashSaved();
      router.back();
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit = name.trim().length > 0;

  if (!canManageBranches) {
    return <Redirect href="/login" />;
  }

  if (subscription?.readOnly) {
    return (
      <Screen>
        <Text style={[styles.readOnly, { color: c.muted }]}>{t('common.readOnlyShort')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />

          <Label>Branch name</Label>
          <Field value={name} onChangeText={setName} autoCapitalize="words" />

          <Label>Phone (optional)</Label>
          <Field value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Label>Address (optional)</Label>
          <Field value={address} onChangeText={setAddress} autoCapitalize="sentences" />

          <PrimaryButton
            label={t('common.create')}
            onPress={() => {
              setError('');
              mutation.mutate({
                name: name.trim(),
                phone: phone.trim() || null,
                address: address.trim() || null,
              });
            }}
            loading={mutation.isPending}
            disabled={!canSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  readOnly: { padding: 16, fontSize: 15 },
});
