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
import { ErrorBanner, Field, FieldError, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { PasswordRule } from '@/src/components/PasswordRule';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { hasFieldErrors, validateStaffFields, type FieldErrorMap } from '@/src/utils/formValidation';
import { isGymOwner, DEFAULT_STAFF_ROLE, STAFF_ROLE_OPTIONS } from '@/src/utils/roles';
import { OptionPickerField } from '@/src/components/OptionPickerField';

export default function NewStaffScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showLengthRule, setShowLengthRule] = useState(false);
  const [showMatchRule, setShowMatchRule] = useState(false);
  const [staffRole, setStaffRole] = useState<string>(DEFAULT_STAFF_ROLE);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const canManageTeam = Boolean(user && isGymOwner(user.role));
  const lengthOk = password.length >= 8;
  const matchOk = confirmPassword.length > 0 && password === confirmPassword;
  const styles = useThemedStyles((colors) => ({
    readOnly: { color: colors.muted, padding: 16, fontSize: 15 },
  }));

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && canManageTeam),
  });

  const branches = branchesQuery.data?.branches ?? [];
  const requireBranch = branches.filter((b) => b.is_active !== false).length > 1;

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
        staff_role: staffRole,
        branch_id: branchId!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      router.back();
    },
    onError: (e: Error) => setError(e.message),
  });

  const clearField = (key: string) => {
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = () => {
    setError('');
    const next = validateStaffFields({
      name,
      username,
      email,
      password,
      confirmPassword,
      branchId,
      requireBranch,
      isEdit: false,
    });
    setFieldErrors(next);
    if (hasFieldErrors(next)) return;
    mutation.mutate();
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

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          <ErrorBanner message={error} />

          <Label required>{t('enroll.fullName')}</Label>
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

          <OptionPickerField
            label={t('forms.role')}
            placeholder={t('forms.pickRole')}
            sheetTitle={t('forms.role')}
            options={STAFF_ROLE_OPTIONS.map((opt) => ({
              value: opt.id,
              label: t(opt.labelKey),
            }))}
            value={staffRole}
            onChange={setStaffRole}
            required
          />

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
            keyboardType="email-address"
            error={Boolean(fieldErrors.email)}
          />
          <FieldError message={fieldErrors.email ? t(fieldErrors.email) : undefined} />

          <Label required>{t('forms.password')}</Label>
          <Field
            value={password}
            onFocus={() => setShowLengthRule(true)}
            onChangeText={(v) => {
              setPassword(v);
              setShowLengthRule(true);
              clearField('password');
              clearField('confirmPassword');
            }}
            secureTextEntry
            autoCapitalize="none"
            error={Boolean(fieldErrors.password)}
          />
          <PasswordRule
            show={showLengthRule || password.length > 0}
            ok={lengthOk}
            label={t('forms.passwordMin8')}
          />
          <FieldError message={fieldErrors.password ? t(fieldErrors.password) : undefined} />

          <Label required>{t('forgot.confirmPassword')}</Label>
          <Field
            value={confirmPassword}
            onFocus={() => setShowMatchRule(true)}
            onChangeText={(v) => {
              setConfirmPassword(v);
              setShowMatchRule(true);
              clearField('confirmPassword');
            }}
            secureTextEntry
            autoCapitalize="none"
            error={Boolean(fieldErrors.confirmPassword)}
          />
          <PasswordRule
            show={showMatchRule || confirmPassword.length > 0}
            ok={matchOk}
            label={t('forms.passwordsMatch')}
          />
          <FieldError
            message={fieldErrors.confirmPassword ? t(fieldErrors.confirmPassword) : undefined}
          />

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
            label={t('screens.addStaff')}
            onPress={handleSubmit}
            loading={mutation.isPending}
            disabled={mutation.isPending}
          />
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}
