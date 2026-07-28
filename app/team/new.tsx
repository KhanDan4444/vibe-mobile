import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { createStaff } from '@/src/api/team';
import { fetchBranches } from '@/src/api/branches';
import { BranchPicker } from '@/src/components/BranchPicker';
import { ErrorBanner, Field, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { isGymOwner } from '@/src/utils/roles';

export default function NewStaffScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const canManageTeam = Boolean(user && isGymOwner(user.role));
  const styles = useThemedStyles((colors) => ({
    readOnly: { color: colors.muted, padding: 16, fontSize: 15 },
  }));

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && canManageTeam),
  });

  const branches = branchesQuery.data?.branches ?? [];

  useEffect(() => {
    if (branchId != null) return;
    const def = branches.find((b) => b.is_default) ?? branches[0];
    if (def) setBranchId(def.id);
  }, [branches, branchId]);

  const mutation = useMutation({
    mutationFn: () =>
      createStaff(token!, {
        name: name.trim(),
        email: email.trim() || null,
        username: username.trim(),
        password,
        staff_role: 'Help Desk',
        branch_id: branchId!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      router.back();
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit =
    name.trim().length > 0 &&
    username.trim().length > 0 &&
    password.length >= 6 &&
    branchId != null;

  if (!canManageTeam) {
    return <Redirect href="/login" />;
  }

  if (subscription?.readOnly) {
    return (
      <Screen>
        <Text style={styles.readOnly}>{t('common.readOnlyShort')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          <ErrorBanner message={error} />

          <Label>{t('forms.name')}</Label>
          <Field value={name} onChangeText={setName} autoCapitalize="words" />

          <Label>{t('forms.username')}</Label>
          <Field value={username} onChangeText={setUsername} autoCapitalize="none" />

          <Label>{t('forms.emailOptional')}</Label>
          <Field value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          <Label>{t('forms.password')}</Label>
          <Field value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />

          <BranchPicker branches={branches} value={branchId} onChange={setBranchId} />

          <PrimaryButton
            label={t('screens.addStaff')}
            onPress={() => {
              setError('');
              mutation.mutate();
            }}
            loading={mutation.isPending}
            disabled={!canSubmit}
          />
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}
