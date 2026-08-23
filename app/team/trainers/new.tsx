import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { createTrainer } from '@/src/api/trainers';
import { fetchBranches } from '@/src/api/branches';
import { BranchPicker } from '@/src/components/BranchPicker';
import { CertAttachmentField } from '@/src/components/CertAttachmentField';
import { ErrorBanner, Field, FieldError, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { hasFieldErrors, validateTrainerFields, type FieldErrorMap } from '@/src/utils/formValidation';
import { isGymOwner } from '@/src/utils/roles';
import { trainerMutationErrorMessage } from '@/src/utils/trainerErrors';

export default function NewTrainerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [certification, setCertification] = useState<string | null>(null);
  const [certProcessing, setCertProcessing] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const canManage = Boolean(user && isGymOwner(user.role));
  const styles = useThemedStyles((colors) => ({
    readOnly: { color: colors.muted, padding: 16, fontSize: 15 },
  }));

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && canManage),
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
      createTrainer(token!, {
        name: name.trim(),
        phone: phone.trim(),
        specialty: specialty.trim() || null,
        branch_id: branchId!,
        ...(certification ? { certification } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      router.back();
    },
    onError: (e: unknown) =>
      setError(trainerMutationErrorMessage(e, t('team.trainersUnavailable'), t('common.error'))),
  });

  const handleSubmit = () => {
    setError('');
    const next = validateTrainerFields({ name, phone, branchId, requireBranch });
    setFieldErrors(next);
    if (hasFieldErrors(next)) return;
    mutation.mutate();
  };

  if (!canManage) {
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
              if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
            }}
            autoCapitalize="words"
            error={Boolean(fieldErrors.name)}
          />
          <FieldError message={fieldErrors.name ? t(fieldErrors.name) : ''} />

          <Label required>{t('forms.phone')}</Label>
          <Field
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
            }}
            keyboardType="phone-pad"
            error={Boolean(fieldErrors.phone)}
          />
          <FieldError message={fieldErrors.phone ? t(fieldErrors.phone) : ''} />

          <Label>{t('team.specialty')}</Label>
          <Field value={specialty} onChangeText={setSpecialty} />

          <CertAttachmentField
            attached={Boolean(certification)}
            onChange={setCertification}
            processing={certProcessing}
            setProcessing={setCertProcessing}
          />

          {requireBranch ? (
            <BranchPicker
              branches={branches}
              value={branchId}
              onChange={(id) => {
                setBranchId(id);
                setFieldErrors((p) => ({ ...p, branchId: undefined }));
              }}
              required
              errorMessage={fieldErrors.branchId ? t(fieldErrors.branchId) : undefined}
            />
          ) : null}

          <PrimaryButton
            label={t('team.saveTrainer')}
            onPress={handleSubmit}
            loading={mutation.isPending}
            disabled={certProcessing}
          />
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}
