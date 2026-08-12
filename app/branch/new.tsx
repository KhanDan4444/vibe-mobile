import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { createBranch, type BranchPayload } from '@/src/api/branches';
import { ErrorBanner, Field, FieldError, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useTheme } from '@/src/context/PreferencesContext';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { hasFieldErrors, validateBranchFields, type FieldErrorMap } from '@/src/utils/formValidation';
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
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

  const clearField = (key: string) => {
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = () => {
    setError('');
    const next = validateBranchFields({ name, phone, address });
    setFieldErrors(next);
    if (hasFieldErrors(next)) return;
    mutation.mutate({
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
    });
  };

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
        <FormScroll>
          <ErrorBanner message={error} />

          <Label required>{t('branchEdit.name')}</Label>
          <Field
            value={name}
            onChangeText={(v) => {
              setName(v);
              clearField('name');
            }}
            autoCapitalize="words"
            error={Boolean(fieldErrors.name)}
          />
          <FieldError message={fieldErrors.name ? t(fieldErrors.name) : undefined} />

          <Label>{t('branchEdit.phone')}</Label>
          <Field
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              clearField('phone');
            }}
            keyboardType="phone-pad"
            error={Boolean(fieldErrors.phone)}
          />
          <FieldError message={fieldErrors.phone ? t(fieldErrors.phone) : undefined} />

          <Label>{t('branchEdit.address')}</Label>
          <Field
            value={address}
            onChangeText={(v) => {
              setAddress(v);
              clearField('address');
            }}
            autoCapitalize="sentences"
            error={Boolean(fieldErrors.address)}
          />
          <FieldError message={fieldErrors.address ? t(fieldErrors.address) : undefined} />

          <PrimaryButton
            label={t('screens.newBranch')}
            onPress={handleSubmit}
            loading={mutation.isPending}
            disabled={mutation.isPending}
          />
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  readOnly: { padding: 16, fontSize: 15 },
});
