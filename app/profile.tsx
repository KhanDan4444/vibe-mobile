import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchGymProfile, updateGymProfile } from '@/src/api/profile';
import { ErrorBanner, Field, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { useLoadRetry } from '@/src/hooks/useLoadRetry';
import { runInBackground } from '@/src/utils/runInBackground';
import { isGymOwner } from '@/src/utils/roles';
import type { UpdateProfilePayload } from '@/src/types/api';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription, updateGymName } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { formMaxWidth, pagePadding } = useResponsiveLayout();

  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const canEditProfile = Boolean(user && isGymOwner(user.role));

  const profileQuery = useQuery({
    queryKey: ['gym-profile'],
    queryFn: () => fetchGymProfile(token!),
    enabled: Boolean(token && canEditProfile),
  });

  const loadRetry = useLoadRetry(profileQuery);

  useEffect(() => {
    if (!profileQuery.data) return;
    setGymName(profileQuery.data.gym.name);
    setOwnerName(profileQuery.data.gym.owner_name);
    setPhone(profileQuery.data.gym.phone || '');
    setEmail(profileQuery.data.user.email || '');
    setUsername(profileQuery.data.user.username || '');
  }, [profileQuery.data]);

  const mutation = useOfflineMutation({
    jobType: 'update-profile',
    mutationFn: (payload: UpdateProfilePayload) => updateGymProfile(token!, payload),
    onSuccess: (data) => {
      if (isOfflineQueued(data)) {
        flashOffline();
        router.back();
        return;
      }
      flashSaved();
      router.back();
      runInBackground(updateGymName(gymName.trim()));
      queryClient.invalidateQueries({ queryKey: ['gym-profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!canEditProfile) {
    return <Redirect href="/(tabs)/more" />;
  }

  if (subscription?.readOnly) {
    return (
      <Screen>
        <Text style={[styles.readOnly, { color: c.muted }]}>{t('common.readOnly')}</Text>
      </Screen>
    );
  }

  if (loadRetry.showLoading) {
    return (
      <Screen>
        <PageSkeleton variant="form" />
      </Screen>
    );
  }

  if (loadRetry.showError) {
    return (
      <Screen>
        <LoadError
          message={profileQuery.error instanceof Error ? profileQuery.error.message : undefined}
          loading={loadRetry.loading}
          onRetry={loadRetry.onRetry}
        />
      </Screen>
    );
  }

  const canSubmit = gymName.trim().length > 0 && ownerName.trim().length > 0;

  return (
    <Screen>
      <TabScreenFrame>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: pagePadding, alignItems: 'center' }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: '100%', maxWidth: formMaxWidth }}>
          <ErrorBanner message={error} />

          <Text style={[styles.section, { color: c.muted }]}>{t('profile.gymSection')}</Text>
          <Label>{t('forms.gymName')}</Label>
          <Field value={gymName} onChangeText={setGymName} autoCapitalize="words" />

          <Label>{t('forms.ownerName')}</Label>
          <Field value={ownerName} onChangeText={setOwnerName} autoCapitalize="words" />

          <Label>{t('forms.phone')}</Label>
          <Field value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text style={[styles.section, { color: c.muted }]}>{t('profile.loginSection')}</Text>
          <Label>{t('forms.email')}</Label>
          <Field value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          <Label>{t('forms.username')}</Label>
          <Field value={username} onChangeText={setUsername} autoCapitalize="none" />

          <PrimaryButton
            label={t('common.save')}
            onPress={() => {
              setError('');
              mutation.mutate({
                gym_name: gymName.trim(),
                name: ownerName.trim(),
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
                username: username.trim() || undefined,
              });
            }}
            loading={mutation.isPending}
            disabled={!canSubmit}
          />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </TabScreenFrame>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 40 },
  section: {
    marginTop: 16,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  readOnly: { padding: 16, fontSize: 15, lineHeight: 22 },
});
