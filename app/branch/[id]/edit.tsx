import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchBranches, updateBranch } from '@/src/api/branches';
import { OptionPickerField } from '@/src/components/OptionPickerField';
import { ErrorBanner, Field, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useTheme } from '@/src/context/PreferencesContext';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import type { UpdateBranchPayload } from '@/src/api/branches';
import { isGymOwner } from '@/src/utils/roles';

export default function EditBranchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const branchId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const canManageBranches = Boolean(user && isGymOwner(user.role));

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && canManageBranches),
  });

  const branch = branchesQuery.data?.branches.find((b) => b.id === branchId);

  useEffect(() => {
    if (!branch) return;
    setName(branch.name);
    setPhone(branch.phone || '');
    setAddress(branch.address || '');
    setIsActive(branch.is_active !== false);
    setIsDefault(Boolean(branch.is_default));
  }, [branch]);

  const saveBranch = useOfflineMutation({
    jobType: 'update-branch',
    entityId: branchId,
    mutationFn: (payload: UpdateBranchPayload) => updateBranch(token!, branchId, payload),
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

  const trySave = () => {
    setError('');
    saveBranch.mutate({
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      is_active: isActive,
      is_default: isDefault,
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

  if (branchesQuery.isLoading) {
    return (
      <Screen>
        <PageSkeleton variant="form" count={4} />
      </Screen>
    );
  }

  if (branchesQuery.isError) {
    return (
      <Screen>
        <LoadError
          message={branchesQuery.error instanceof Error ? branchesQuery.error.message : undefined}
          onRetry={() => void branchesQuery.refetch()}
        />
      </Screen>
    );
  }

  if (!branch) {
    return (
      <Screen>
        <Text style={[styles.readOnly, { color: c.muted }]}>{t('common.notFound')}</Text>
      </Screen>
    );
  }

  const canSubmit = name.trim().length > 0;
  const hasStaff = (branch.staff_count ?? 0) > 0;

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          <ErrorBanner message={error} />

          <Label>{t('branchEdit.name')}</Label>
          <Field value={name} onChangeText={setName} autoCapitalize="words" />

          <Label>{t('branchEdit.phone')}</Label>
          <Field value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Label>{t('branchEdit.address')}</Label>
          <Field value={address} onChangeText={setAddress} autoCapitalize="sentences" />

          {!branch.is_default ? (
            <OptionPickerField
              label={t('branchEdit.status')}
              placeholder={t('branchEdit.status')}
              sheetTitle={t('branchEdit.status')}
              options={[
                { value: 'active', label: t('branchEdit.statusActive') },
                { value: 'inactive', label: t('branchEdit.statusInactive') },
              ]}
              value={isActive ? 'active' : 'inactive'}
              onChange={(v) => setIsActive(v === 'active')}
            />
          ) : null}

          <OptionPickerField
            label={t('branchEdit.defaultBranch')}
            placeholder={t('branchEdit.defaultBranch')}
            sheetTitle={t('branchEdit.defaultBranch')}
            options={[
              { value: 'yes', label: t('common.yes') },
              { value: 'no', label: t('common.no') },
            ]}
            value={isDefault ? 'yes' : 'no'}
            onChange={(v) => setIsDefault(v === 'yes')}
          />

          {hasStaff ? (
            <Text style={[styles.staffNote, { color: c.muted }]}>
              {t('branchEdit.staffNote', { count: branch.staff_count ?? 0 })}
            </Text>
          ) : null}

          <PrimaryButton
            label={t('common.save')}
            onPress={trySave}
            loading={saveBranch.isPending}
            disabled={!canSubmit}
          />
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  readOnly: { padding: 16, fontSize: 15 },
  staffNote: { marginTop: 16, fontSize: 13, lineHeight: 18 },
});
