import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchMember, updateMember } from '@/src/api/members';
import { ErrorBanner, Field, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useTheme } from '@/src/context/PreferencesContext';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { hasGymPortalAccess } from '@/src/utils/roles';
import type { UpdateMemberPayload } from '@/src/types/api';
import { useTranslation } from 'react-i18next';

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const canEditMember = Boolean(user && hasGymPortalAccess(user.role));

  const memberQuery = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => fetchMember(token!, memberId),
    enabled: Boolean(token && canEditMember) && Number.isFinite(memberId),
  });

  useEffect(() => {
    if (memberQuery.data) {
      setName(memberQuery.data.name);
      setPhone(memberQuery.data.phone || '');
    }
  }, [memberQuery.data]);

  const mutation = useOfflineMutation({
    jobType: 'update-member',
    memberId,
    mutationFn: (payload: UpdateMemberPayload) => updateMember(token!, memberId, payload),
    onSuccess: (data) => {
      if (isOfflineQueued(data)) {
        flashOffline();
        router.back();
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      flashSaved('flash.memberUpdated');
      router.back();
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit = name.trim().length > 0 && phone.trim().length > 0;

  if (!canEditMember) {
    return <Redirect href="/login" />;
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />

          <Label>Name</Label>
          <Field value={name} onChangeText={setName} autoCapitalize="words" />

          <Label>Phone</Label>
          <Field value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />

          <Text style={[styles.hint, { color: c.dim }]}>
            Plan and dates cannot be edited here. Use Renew or Change plan on the member screen.
          </Text>

          <PrimaryButton
            label={t('common.save')}
            onPress={() => {
              setError('');
              mutation.mutate({ name: name.trim(), phone: phone.trim() });
            }}
            loading={mutation.isPending}
            disabled={!canSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 13, marginTop: 16, lineHeight: 20 },
});
