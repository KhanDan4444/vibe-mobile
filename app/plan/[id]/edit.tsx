import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchPlans, updatePlan } from '@/src/api/plans';
import type { PlanPayload } from '@/src/api/plans';
import { ErrorBanner, Field, FieldError, FormScroll, Label, MoneyAmountField, PrimaryButton, Screen } from '@/src/components/Form';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useTheme } from '@/src/context/PreferencesContext';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { hasFieldErrors, validatePlanFields, type FieldErrorMap } from '@/src/utils/formValidation';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';

export default function EditPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const canManagePlans = Boolean(user && hasGymPortalAccess(user.role) && isGymOwner(user.role));

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token && canManagePlans),
  });

  const plan = plansQuery.data?.find((p) => p.id === planId);

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setDuration(String(plan.duration));
      setPrice(String(Number(plan.price) || 0));
    }
  }, [plan]);

  const mutation = useOfflineMutation({
    jobType: 'update-plan',
    entityId: planId,
    mutationFn: (payload: Partial<PlanPayload>) => updatePlan(token!, planId, payload),
    onSuccess: (data) => {
      if (isOfflineQueued(data)) {
        flashOffline();
        router.back();
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['plans'] });
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
    const next = validatePlanFields({ name, duration, price });
    setFieldErrors(next);
    if (hasFieldErrors(next)) return;
    mutation.mutate({
      name: name.trim(),
      duration: Number(duration),
      price: Number(price),
    });
  };

  if (!canManagePlans) {
    return <Redirect href="/login" />;
  }

  if (subscription?.readOnly) {
    return (
      <Screen>
        <Text style={[styles.readOnly, { color: c.muted }]}>{t('common.readOnly')}</Text>
      </Screen>
    );
  }

  if (plansQuery.isLoading) {
    return (
      <Screen>
        <PageSkeleton variant="form" count={4} />
      </Screen>
    );
  }

  if (plansQuery.isError) {
    return (
      <Screen>
        <LoadError
          message={plansQuery.error instanceof Error ? plansQuery.error.message : undefined}
          onRetry={() => void plansQuery.refetch()}
        />
      </Screen>
    );
  }

  if (!plan) {
    return (
      <Screen>
        <Text style={[styles.readOnly, { color: c.muted }]}>{t('common.notFound')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          <ErrorBanner message={error} />

          <Label required>{t('plans.nameLabel')}</Label>
          <Field
            value={name}
            onChangeText={(v) => {
              setName(v);
              clearField('name');
            }}
            autoCapitalize="words"
            placeholder={t('plans.namePlaceholder')}
            error={Boolean(fieldErrors.name)}
          />
          <FieldError message={fieldErrors.name ? t(fieldErrors.name) : undefined} />

          <Label required>{t('plans.durationLabel')}</Label>
          <Field
            value={duration}
            onChangeText={(v) => {
              setDuration(v);
              clearField('duration');
            }}
            keyboardType="numeric"
            error={Boolean(fieldErrors.duration)}
          />
          <FieldError message={fieldErrors.duration ? t(fieldErrors.duration) : undefined} />

          <Label required>{t('plans.priceLabel')}</Label>
          <MoneyAmountField
            value={price}
            onChangeText={(v) => {
              setPrice(v);
              clearField('price');
            }}
            error={Boolean(fieldErrors.price)}
          />
          <FieldError message={fieldErrors.price ? t(fieldErrors.price) : undefined} />

          <PrimaryButton
            label={t('common.save')}
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
  readOnly: { padding: 16, fontSize: 15, lineHeight: 22 },
});
