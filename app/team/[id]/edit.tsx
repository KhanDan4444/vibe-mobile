import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchTeam, resetStaffPassword, updateStaff } from '@/src/api/team';
import { fetchBranches } from '@/src/api/branches';
import { BranchPicker } from '@/src/components/BranchPicker';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ErrorBanner, Field, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { isGymOwner } from '@/src/utils/roles';

export default function EditStaffScreen() {
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
  const [resetNotice, setResetNotice] = useState('');
  const canManageTeam = Boolean(user && isGymOwner(user.role));
  const styles = useThemedStyles((colors) => ({
    readOnly: { color: colors.muted, padding: 16, fontSize: 15 },
    divider: { marginTop: 32, marginBottom: 16, height: 1, backgroundColor: colors.border },
    sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
    sectionHint: { marginTop: 6, marginBottom: 4, fontSize: 13, color: colors.dim, lineHeight: 18 },
    resetBtn: {
      marginTop: 8,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: colors.accentText,
      backgroundColor: colors.accentSoft,
    },
    resetBtnDisabled: { opacity: 0.5 },
    resetBtnText: { color: colors.accentText, fontSize: 15, fontWeight: '600' as const },
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
      setResetNotice(`${staff?.name || 'Staff'} can sign in with the new password.`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit = name.trim().length > 0 && username.trim().length > 0 && branchId != null;
  const canReset = resetPassword.trim().length >= 6;

  if (!canManageTeam) {
    return <Redirect href="/login" />;
  }

  if (subscription?.readOnly) {
    return (
      <Screen>
        <Text style={styles.readOnly}>Gym is read-only.</Text>
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
        <Text style={styles.readOnly}>Staff account not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          <ErrorBanner message={error} />

          <Label>Name</Label>
          <Field value={name} onChangeText={setName} autoCapitalize="words" />

          <Label>Username</Label>
          <Field value={username} onChangeText={setUsername} autoCapitalize="none" />

          <Label>Email (optional)</Label>
          <Field value={email} onChangeText={setEmail} autoCapitalize="none" />

          <BranchPicker branches={branches} value={branchId} onChange={setBranchId} />

          <PrimaryButton
            label="Save changes"
            onPress={() => {
              setError('');
              saveMutation.mutate();
            }}
            loading={saveMutation.isPending}
            disabled={!canSubmit || resetMutation.isPending}
          />

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Reset password</Text>
          <Text style={styles.sectionHint}>Set a new login password for this staff member.</Text>

          <Label>New password</Label>
          <Field
            value={resetPassword}
            onChangeText={setResetPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Pressable
            style={[styles.resetBtn, (!canReset || resetMutation.isPending) && styles.resetBtnDisabled]}
            onPress={() => {
              setError('');
              resetMutation.mutate();
            }}
            disabled={!canReset || resetMutation.isPending}
          >
            <Text style={styles.resetBtnText}>{resetMutation.isPending ? 'Updating…' : 'Reset password'}</Text>
          </Pressable>
        </FormScroll>
      </KeyboardAvoidingView>
      <ConfirmDialog
        visible={Boolean(resetNotice)}
        title="Password updated"
        message={resetNotice}
        alertOnly
        destructive={false}
        onConfirm={() => setResetNotice('')}
      />
    </Screen>
  );
}
