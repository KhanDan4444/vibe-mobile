import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { createPlan, type PlanPayload } from '@/src/api/plans';
import { ErrorBanner, Field, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useTheme } from '@/src/context/PreferencesContext';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';

export default function NewPlanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [duration, setDuration] = useState('1');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const canManagePlans = Boolean(user && hasGymPortalAccess(user.role) && isGymOwner(user.role));

  const mutation = useOfflineMutation({
    jobType: 'create-plan',
    mutationFn: (payload: PlanPayload) => createPlan(token!, payload),
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

  const canSubmit =
    name.trim().length > 0 &&
    Number(duration) >= 1 &&
    Number.isFinite(Number(duration)) &&
    Number(price) >= 0 &&
    Number.isFinite(Number(price));

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

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          <ErrorBanner message={error} />

          <Label>Plan name</Label>
          <Field value={name} onChangeText={setName} autoCapitalize="words" placeholder="e.g. Monthly" />

          <Label>Duration (months)</Label>
          <Field value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="1" />

          <Label>Price (ETB)</Label>
          <Field value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" />

          <PrimaryButton
            label={t('common.create')}
            onPress={() => {
              setError('');
              mutation.mutate({
                name: name.trim(),
                duration: Number(duration),
                price: Number(price),
              });
            }}
            loading={mutation.isPending}
            disabled={!canSubmit}
          />
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  readOnly: { padding: 16, fontSize: 15, lineHeight: 22 },
});
