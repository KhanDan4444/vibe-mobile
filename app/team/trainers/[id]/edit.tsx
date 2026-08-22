import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchTrainers, updateTrainer } from '@/src/api/trainers';
import { fetchBranches } from '@/src/api/branches';
import { BranchPicker } from '@/src/components/BranchPicker';
import { CertAttachmentField } from '@/src/components/CertAttachmentField';
import { ErrorBanner, Field, FieldError, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { hasFieldErrors, validateTrainerFields, type FieldErrorMap } from '@/src/utils/formValidation';
import { isGymOwner } from '@/src/utils/roles';
import { trainerMutationErrorMessage } from '@/src/utils/trainerErrors';

export default function EditTrainerScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trainerId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [certification, setCertification] = useState<string | null | undefined>(undefined);
  const [hadCertification, setHadCertification] = useState(false);
  const [certProcessing, setCertProcessing] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const [ready, setReady] = useState(false);
  const canManage = Boolean(user && isGymOwner(user.role));
  const styles = useThemedStyles((colors) => ({
    readOnly: { color: colors.muted, padding: 16, fontSize: 15 },
  }));

  const trainersQuery = useQuery({
    queryKey: ['trainers', false],
    queryFn: () => fetchTrainers(token!, false),
    enabled: Boolean(token && canManage),
  });

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && canManage),
  });

  const trainer = (trainersQuery.data?.trainers ?? []).find((row) => row.id === trainerId);
  const branches = branchesQuery.data?.branches ?? [];
  const requireBranch = branches.filter((b) => b.is_active !== false).length > 1;
  const showCertAttached =
    typeof certification === 'string'
      ? Boolean(certification)
      : hadCertification && certification !== null;

  useEffect(() => {
    if (!trainer || ready) return;
    setName(trainer.name);
    setPhone(trainer.phone || '');
    setSpecialty(trainer.specialty || '');
    setBranchId(trainer.branch_id);
    setHadCertification(Boolean(trainer.has_certification || trainer.certification_url));
    setCertification(undefined);
    setReady(true);
  }, [trainer, ready]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof updateTrainer>[2] = {
        name: name.trim(),
        phone: phone.trim(),
        specialty: specialty.trim() || null,
        branch_id: branchId ?? undefined,
      };
      if (typeof certification === 'string') payload.certification = certification;
      else if (certification === null) payload.certification = null;
      return updateTrainer(token!, trainerId, payload);
    },
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

  if (trainersQuery.isLoading) {
    return (
      <Screen>
        <PageSkeleton variant="list-rows" />
      </Screen>
    );
  }

  if (trainersQuery.isError) {
    return (
      <Screen>
        <LoadError
          message={trainersQuery.error instanceof Error ? trainersQuery.error.message : undefined}
          onRetry={() => void trainersQuery.refetch()}
        />
      </Screen>
    );
  }

  if (!trainer) {
    return (
      <Screen>
        <Text style={styles.readOnly}>{t('team.trainerNotFound')}</Text>
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
            attached={showCertAttached}
            fileLabel={
              typeof certification === 'string'
                ? t('team.certAttached')
                : hadCertification
                  ? t('team.certAttached')
                  : undefined
            }
            onChange={(next) => setCertification(next)}
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
            label={t('common.save')}
            onPress={handleSubmit}
            loading={mutation.isPending}
            disabled={certProcessing}
          />
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}
