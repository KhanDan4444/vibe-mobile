import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchBranches, reassignBranchStaff, updateBranch } from '@/src/api/branches';
import { ReassignStaffModal } from '@/src/components/ReassignStaffModal';
import { OptionPickerField } from '@/src/components/OptionPickerField';
import { ErrorBanner, Field, Label, PrimaryButton, Screen } from '@/src/components/Form';
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
  const [reassignOpen, setReassignOpen] = useState(false);
  const [deactivateAfterReassign, setDeactivateAfterReassign] = useState(false);
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const canManageBranches = Boolean(user && isGymOwner(user.role));

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && canManageBranches),
  });

  const branch = branchesQuery.data?.branches.find((b) => b.id === branchId);
  const allBranches = branchesQuery.data?.branches ?? [];

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

  const reassignMutation = useMutation({
    mutationFn: (targetBranchId: number) => reassignBranchStaff(token!, branchId, targetBranchId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      setReassignOpen(false);
      if (deactivateAfterReassign) {
        saveBranch.mutate({
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          is_active: isActive,
          is_default: isDefault,
        });
      }
    },
    onError: (e: Error) => setError(e.message),
  });

  const trySave = () => {
    setError('');
    const staffCount = branch?.staff_count ?? 0;
    const deactivating = branch?.is_active !== false && !isActive;

    if (deactivating && staffCount > 0) {
      setDeactivateAfterReassign(true);
      setReassignOpen(true);
      return;
    }

    saveBranch.mutate({
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      is_active: isActive,
      is_default: isDefault,
    });
  };

  const openReassignOnly = () => {
    setError('');
    setDeactivateAfterReassign(false);
    setReassignOpen(true);
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
        <Text style={[styles.readOnly, { color: c.muted }]}>{t('common.loading')}</Text>
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
            <Text style={[styles.staffNote, { color: c.warning }]}>
              {t('branchEdit.staffNote', { count: branch.staff_count ?? 0 })}
            </Text>
          ) : null}

          {hasStaff ? (
            <PrimaryButton label={t('branchEdit.reassignStaff')} onPress={openReassignOnly} disabled={saveBranch.isPending} />
          ) : null}

          <PrimaryButton
            label={t('common.save')}
            onPress={trySave}
            loading={saveBranch.isPending}
            disabled={!canSubmit || reassignMutation.isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <ReassignStaffModal
        visible={reassignOpen}
        branch={branch}
        branches={allBranches}
        deactivateAfter={deactivateAfterReassign}
        loading={reassignMutation.isPending || saveBranch.isPending}
        onClose={() => {
          setReassignOpen(false);
          setDeactivateAfterReassign(false);
        }}
        onConfirm={(targetId) => reassignMutation.mutate(targetId)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  readOnly: { padding: 16, fontSize: 15 },
  staffNote: { marginTop: 16, fontSize: 13, lineHeight: 18 },
});
