import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchTeam, resetStaffPassword, updateStaff } from '@/src/api/team';
import { fetchBranches } from '@/src/api/branches';
import { BranchPicker } from '@/src/components/BranchPicker';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ErrorBanner, Field, FieldError, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import {
  hasFieldErrors,
  validateStaffFields,
  validateStaffPasswordReset,
  type FieldErrorMap,
} from '@/src/utils/formValidation';
import { isGymOwner } from '@/src/utils/roles';

export default function EditStaffScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const staffId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const [resetErrors, setResetErrors] = useState<FieldErrorMap>({});
  const [resetNotice, setResetNotice] = useState('');
  const canManageTeam = Boolean(user && isGymOwner(user.role));
  const styles = useThemedStyles((colors) => ({
    readOnly: { color: colors.muted, padding: 16, fontSize: 15 },
    divider: { marginTop: 32, marginBottom: 16, height: 1, backgroundColor: colors.border },
    sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
    sectionHint: { marginTop: 6, marginBottom: 4, fontSize: 13, color: colors.dim, lineHeight: 18 },
  }));

  const teamQuery = useQuery({
    queryKey: ['team'],
    queryFn: () => fetchTeam(token!),
    enabled: Boolean(token && canManageTeam),
  });

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && canManageTeam),
  });

  const staff = teamQuery.data?.staff.find((s) => s.id === staffId);
  const branches = branchesQuery.data?.branches ?? [];
  const requireBranch = branches.filter((b) => b.is_active !== false).length > 1;

  useEffect(() => {
    if (!staff) return;
    setName(staff.name);
    setEmail(staff.email || '');
    setUsername(staff.username || '');
    setBranchId(staff.branch_id);
  }, [staff]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateStaff(token!, staffId, {
        name: name.trim(),
        email: email.trim() || null,
        username: username.trim(),
        branch_id: branchId!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      router.back();
    },
    onError: (e: Error) => setError(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetStaffPassword(token!, staffId, resetPassword.trim()),
    onSuccess: () => {
      setResetPassword('');
      setError('');
      setResetErrors({});
      setResetNotice(
        t('team.passwordUpdatedBody', { name: staff?.name || t('team.staffFallback') }),
      );
    },
    onError: (e: Error) => setError(e.message),
  });

  const clearField = (key: string) => {
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSave = () => {
    setError('');
    const next = validateStaffFields({
      name,
      username,
      email,
      branchId,
      requireBranch,
      isEdit: true,
    });
    setFieldErrors(next);
    if (hasFieldErrors(next)) return;
    saveMutation.mutate();
  };

  const handleReset = () => {
    setError('');
    const next = validateStaffPasswordReset(resetPassword);
    setResetErrors(next);
    if (hasFieldErrors(next)) return;
    resetMutation.mutate();
  };

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

  if (teamQuery.isLoading) {
    return (
      <Screen>
        <PageSkeleton variant="form" count={5} />
      </Screen>
    );
  }

  if (teamQuery.isError) {
    return (
      <Screen>
        <LoadError
          message={teamQuery.error instanceof Error ? teamQuery.error.message : undefined}
          onRetry={() => void teamQuery.refetch()}
        />
      </Screen>
    );
  }

  if (!staff) {
    return (
      <Screen>
        <Text style={styles.readOnly}>{t('team.notFound')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          <ErrorBanner message={error} />

          <Label required>{t('forms.name')}</Label>
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

          <Label required>{t('forms.username')}</Label>
          <Field
            value={username}
            onChangeText={(v) => {
              setUsername(v);
              clearField('username');
            }}
            autoCapitalize="none"
            error={Boolean(fieldErrors.username)}
          />
          <FieldError message={fieldErrors.username ? t(fieldErrors.username) : undefined} />

          <Label>{t('forms.emailOptional')}</Label>
          <Field
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              clearField('email');
            }}
            autoCapitalize="none"
            error={Boolean(fieldErrors.email)}
          />
          <FieldError message={fieldErrors.email ? t(fieldErrors.email) : undefined} />

          <BranchPicker
            branches={branches}
            value={branchId}
            onChange={(id) => {
              setBranchId(id);
              clearField('branchId');
            }}
            required
            errorMessage={fieldErrors.branchId ? t(fieldErrors.branchId) : undefined}
          />

          <PrimaryButton
            label={t('common.save')}
            onPress={handleSave}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending || resetMutation.isPending}
          />

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>{t('team.resetPassword')}</Text>
          <Text style={styles.sectionHint}>{t('team.resetPasswordHint')}</Text>

          <Label required>{t('forgot.newPassword')}</Label>
          <Field
            value={resetPassword}
            onChangeText={(v) => {
              setResetPassword(v);
              if (resetErrors.password) setResetErrors({});
            }}
            secureTextEntry
            autoCapitalize="none"
            error={Boolean(resetErrors.password)}
          />
          <FieldError message={resetErrors.password ? t(resetErrors.password) : undefined} />

          <PrimaryButton
            label={resetMutation.isPending ? t('common.updating') : t('team.resetPassword')}
            onPress={handleReset}
            loading={resetMutation.isPending}
            disabled={resetMutation.isPending || saveMutation.isPending}
          />
        </FormScroll>
      </KeyboardAvoidingView>
      <ConfirmDialog
        visible={Boolean(resetNotice)}
        title={t('team.passwordUpdatedTitle')}
        message={resetNotice}
        alertOnly
        destructive={false}
        onConfirm={() => setResetNotice('')}
      />
    </Screen>
  );
}
