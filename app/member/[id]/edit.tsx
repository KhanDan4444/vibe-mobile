import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchBranches } from '@/src/api/branches';
import { fetchMember, updateMember } from '@/src/api/members';
import { BranchPicker } from '@/src/components/BranchPicker';
import { PhotoPickerField } from '@/src/components/PhotoPickerField';
import { ErrorBanner, Field, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useTheme } from '@/src/context/PreferencesContext';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';
import { fetchMemberPhotoDataUri } from '@/src/utils/memberPhoto';
import { bumpMemberPhotoCache } from '@/src/utils/memberPhotoCache';
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
  const [branchId, setBranchId] = useState<number | null>(null);
  const [initialBranchId, setInitialBranchId] = useState<number | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [hadExistingPhoto, setHadExistingPhoto] = useState(false);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [error, setError] = useState('');
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const canEditMember = Boolean(user && hasGymPortalAccess(user.role));
  const owner = isGymOwner(user?.role);

  const memberQuery = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => fetchMember(token!, memberId),
    enabled: Boolean(token && canEditMember) && Number.isFinite(memberId),
  });

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && owner),
  });

  const branches = branchesQuery.data?.branches ?? [];
  const showBranchPicker = owner && branches.filter((b) => b.is_active !== false).length > 1;

  useEffect(() => {
    const member = memberQuery.data;
    if (!member) return;

    setName(member.name);
    setPhone(member.phone || '');
    const memberBranchId = member.branch_id ?? null;
    setBranchId(memberBranchId);
    setInitialBranchId(memberBranchId);
    setHadExistingPhoto(Boolean(member.photo_url));
    setPhotoRemoved(false);
    setPhotoDataUrl(null);
    setPhotoPreview('');

    if (!member.photo_url || !token) return;

    let cancelled = false;
    (async () => {
      const dataUri = await fetchMemberPhotoDataUri(memberId, token);
      if (cancelled || !dataUri) return;
      setPhotoPreview(dataUri);
      setHadExistingPhoto(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [memberQuery.data, memberId, token]);

  const mutation = useOfflineMutation({
    jobType: 'update-member',
    memberId,
    mutationFn: (payload: UpdateMemberPayload) => updateMember(token!, memberId, payload),
    onSuccess: async (data) => {
      if (isOfflineQueued(data)) {
        bumpMemberPhotoCache(queryClient, memberId);
        flashOffline();
        router.back();
        return;
      }
      queryClient.setQueryData(['member', memberId], data);
      bumpMemberPhotoCache(queryClient, memberId);
      await queryClient.invalidateQueries({ queryKey: ['members'] });
      await queryClient.refetchQueries({ queryKey: ['member', memberId] });
      flashSaved('flash.memberUpdated');
      router.back();
    },
    onError: (e: Error) => setError(e.message),
  });

  const buildPayload = (): UpdateMemberPayload => {
    const payload: UpdateMemberPayload = {
      name: name.trim(),
      phone: phone.trim(),
    };
    if (showBranchPicker && branchId != null && branchId !== initialBranchId) {
      payload.branch_id = branchId;
    }
    if (photoDataUrl) {
      payload.photo = photoDataUrl;
    } else if (photoRemoved && hadExistingPhoto) {
      payload.photo = null;
    }
    return payload;
  };

  const canSubmit = useMemo(() => {
    if (!name.trim() || !phone.trim()) return false;
    if (showBranchPicker && branchId == null) return false;
    return true;
  }, [name, phone, showBranchPicker, branchId]);

  if (!canEditMember) {
    return <Redirect href="/login" />;
  }

  const member = memberQuery.data;

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />

          <Label>{t('forms.name')}</Label>
          <Field value={name} onChangeText={setName} autoCapitalize="words" />

          <Label>{t('forms.phone')}</Label>
          <Field value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />

          <PhotoPickerField
            previewUri={photoPreview}
            onChange={(dataUrl, preview) => {
              setPhotoDataUrl(dataUrl || null);
              setPhotoPreview(preview);
              setPhotoRemoved(!dataUrl && hadExistingPhoto);
            }}
            processing={photoProcessing}
            setProcessing={setPhotoProcessing}
          />

          {showBranchPicker ? (
            <BranchPicker branches={branches} value={branchId} onChange={setBranchId} />
          ) : member?.branch_name ? (
            <View style={styles.branchReadOnly}>
              <Label>{t('member.branch')}</Label>
              <Text style={[styles.branchValue, { color: c.text }]}>{member.branch_name}</Text>
            </View>
          ) : null}

          <Text style={[styles.hint, { color: c.dim }]}>
            Plan and dates cannot be edited here. Use Renew or Change plan on the member screen.
          </Text>

          <PrimaryButton
            label={t('common.save')}
            onPress={() => {
              setError('');
              mutation.mutate(buildPayload());
            }}
            loading={mutation.isPending || photoProcessing}
            disabled={!canSubmit || photoProcessing}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 13, marginTop: 16, lineHeight: 20 },
  branchReadOnly: { marginTop: 8 },
  branchValue: {
    fontSize: 15,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
});
