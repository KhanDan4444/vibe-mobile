import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, type TextInput } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchBranches } from '@/src/api/branches';
import { fetchMember, updateMember } from '@/src/api/members';
import { fetchTrainers } from '@/src/api/trainers';
import { BranchPicker } from '@/src/components/BranchPicker';
import { OptionPickerField } from '@/src/components/OptionPickerField';
import { PhotoPickerField } from '@/src/components/PhotoPickerField';
import { PaymentMethodPicker } from '@/src/components/PaymentMethodPicker';
import { ErrorBanner, Field, FieldError, FormScroll, Label, MoneyAmountField, PrimaryButton, Screen } from '@/src/components/Form';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { useNetwork } from '@/src/offline/NetworkProvider';
import { isOfflineQueued } from '@/src/offline/types';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';
import { fetchMemberPhotoDataUri } from '@/src/utils/memberPhoto';
import { bumpMemberPhotoCache } from '@/src/utils/memberPhotoCache';
import { dismissKeyboard } from '@/src/utils/dismissKeyboard';
import { runInBackground } from '@/src/utils/runInBackground';
import { todayString } from '@/src/utils/date';
import { validateRequiredEthiopianPhone } from '@/src/utils/phone';
import { resolveMemberMutationError } from '@/src/utils/apiErrorMessage';
import { formatApiError } from '@/src/utils/paymentValidation';
import { PAYMENT_METHODS } from '@/src/constants/payments';
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
  const [trainerId, setTrainerId] = useState<number | null>(null);
  const [trainerFee, setTrainerFee] = useState('');
  const [trainerFeeMethod, setTrainerFeeMethod] = useState<(typeof PAYMENT_METHODS)[number]>('Cash');
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const phoneRef = useRef<TextInput>(null);
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const { isOnline } = useNetwork();
  const canEditMember = Boolean(user && hasGymPortalAccess(user.role));
  const owner = isGymOwner(user?.role);
  const photoBlocksOffline = !isOnline && Boolean(photoDataUrl);

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

  const trainersQuery = useQuery({
    queryKey: ['trainers', false],
    queryFn: () => fetchTrainers(token!, false),
    enabled: Boolean(token && canEditMember),
  });

  const branches = branchesQuery.data?.branches ?? [];
  const trainers = trainersQuery.data?.trainers ?? [];
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
    setTrainerId(member.trainer_id ?? null);
    setTrainerFee('');
    setTrainerFeeMethod('Cash');
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

  const ensurePhoneValid = useCallback(
    (value = phone) => {
      const result = validateRequiredEthiopianPhone(value);
      if (result.ok) {
        setPhoneError('');
        return true;
      }
      setPhoneError(t(result.key));
      return false;
    },
    [phone, t]
  );

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setPhoneError('');
      return;
    }
    ensurePhoneValid(trimmed);
  };

  const handlePhoneBlur = () => {
    // Show the error, but do not steal focus from other controls.
    ensurePhoneValid();
  };

  const mutation = useOfflineMutation({
    jobType: 'update-member',
    memberId,
    mutationFn: (payload: UpdateMemberPayload) => updateMember(token!, memberId, payload),
    onSuccess: (data) => {
      if (isOfflineQueued(data)) {
        bumpMemberPhotoCache(queryClient, memberId);
        flashOffline();
        router.back();
        return;
      }
      queryClient.setQueryData(['member', memberId], data);
      bumpMemberPhotoCache(queryClient, memberId);
      flashSaved('flash.memberUpdated');
      router.back();
      runInBackground(
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ['members'] }),
          queryClient.refetchQueries({ queryKey: ['member', memberId] }),
        ])
      );
    },
    onError: (e: Error) => {
      const next = resolveMemberMutationError(e, t, formatApiError);
      setError(next.banner);
      setPhoneError(next.phoneError);
    },
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
    payload.trainer_id = trainerId;
    if (trainerId && Number(trainerFee) > 0) {
      payload.trainer_fee = Number(trainerFee);
      payload.trainer_fee_date = todayString();
      payload.trainer_fee_method = trainerFeeMethod;
    }
    return payload;
  };

  const canSubmit = useMemo(() => {
    if (photoBlocksOffline) return false;
    if (!name.trim() || !validateRequiredEthiopianPhone(phone).ok) return false;
    if (showBranchPicker && branchId == null) return false;
    return true;
  }, [photoBlocksOffline, name, phone, showBranchPicker, branchId]);

  if (!canEditMember) {
    return <Redirect href="/login" />;
  }

  const member = memberQuery.data;

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          <ErrorBanner
            message={
              error ||
              (photoBlocksOffline ? t('offline.photoUpdateRequiresOnline') : '')
            }
          />

          <Label>{t('enroll.fullName')}</Label>
          <Field value={name} onChangeText={setName} autoCapitalize="words" />

          <Label>{t('forms.phone')}</Label>
          <Field
            ref={phoneRef}
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            autoCapitalize="none"
            returnKeyType="done"
            blurOnSubmit
            error={Boolean(phoneError)}
            onBlur={handlePhoneBlur}
            onSubmitEditing={() => {
              ensurePhoneValid();
            }}
          />
          <FieldError message={phoneError} />

          <PhotoPickerField
            previewUri={photoPreview}
            onChange={(dataUrl, preview) => {
              setPhotoDataUrl(dataUrl || null);
              setPhotoPreview(preview);
              setPhotoRemoved(!dataUrl && hadExistingPhoto);
              if (!dataUrl) setError('');
            }}
            processing={photoProcessing}
            setProcessing={setPhotoProcessing}
            pickDisabled={!isOnline}
            notice={!isOnline ? t('offline.photoNeedsOnline') : undefined}
          />

          {showBranchPicker ? (
            <BranchPicker branches={branches} value={branchId} onChange={setBranchId} />
          ) : null}

          <SoftSurface variant="quiet" style={styles.trainerPanel}>
            <OptionPickerField
              label={t('member.trainer')}
              placeholder={t('enroll.noTrainer')}
              options={[
                { value: '', label: t('enroll.noTrainer') },
                ...trainers.map((tr) => ({
                  value: String(tr.id),
                  label: tr.specialty ? `${tr.name} · ${tr.specialty}` : tr.name,
                })),
              ]}
              value={trainerId == null ? '' : String(trainerId)}
              onChange={(v) => setTrainerId(v ? Number(v) : null)}
            />
            {trainerId ? (
              <>
                <Label>{t('enroll.trainerFee')}</Label>
                <MoneyAmountField value={trainerFee} onChangeText={setTrainerFee} />
                {Number(trainerFee) > 0 ? (
                  <PaymentMethodPicker value={trainerFeeMethod} onChange={setTrainerFeeMethod} />
                ) : null}
              </>
            ) : null}
          </SoftSurface>

          <Text style={[styles.hint, { color: c.dim }]}>{t('member.planDatesLocked')}</Text>

          <PrimaryButton
            label={t('common.save')}
            onPress={() => {
              dismissKeyboard();
              setError('');
              if (!ensurePhoneValid()) {
                requestAnimationFrame(() => phoneRef.current?.focus());
                return;
              }
              mutation.mutate(buildPayload());
            }}
            loading={mutation.isPending || photoProcessing}
            disabled={!canSubmit || photoProcessing}
          />
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, marginTop: 16, lineHeight: 20 },
  trainerPanel: { padding: 14, gap: 10, marginTop: 8 },
});
