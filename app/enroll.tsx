import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Switch, View, type TextInput } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchBranches } from '@/src/api/branches';
import { enrollMember } from '@/src/api/members';
import { fetchPlans } from '@/src/api/plans';
import { BranchPicker } from '@/src/components/BranchPicker';
import { DateField } from '@/src/components/DateField';
import { PhotoPickerField } from '@/src/components/PhotoPickerField';
import { PlanPickerField } from '@/src/components/PlanPickerField';
import { PaymentMethodPicker } from '@/src/components/PaymentMethodPicker';
import { ErrorBanner, Field, FieldError, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { SkeletonBone } from '@/src/components/Skeleton';
import { useTheme } from '@/src/context/PreferencesContext';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { PAYMENT_METHODS } from '@/src/constants/payments';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { useNetwork } from '@/src/offline/NetworkProvider';
import { isOfflineQueued } from '@/src/offline/types';
import { bumpMemberPhotoCache } from '@/src/utils/memberPhotoCache';
import { todayString } from '@/src/utils/date';
import {
  boundsForEnrollStart,
  boundsForPaymentOnTerm,
  clampPaymentToTerm,
} from '@/src/utils/datePickerBounds';
import { formatApiError } from '@/src/utils/paymentValidation';
import { validateRequiredEthiopianPhone } from '@/src/utils/phone';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';
import type { EnrollPayload, PlanRow } from '@/src/types/api';

function planPrice(plan: PlanRow): number {
  return Number(plan.price) || 0;
}

export default function EnrollScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [planId, setPlanId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(todayString());
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('Cash');
  const [skipPayment, setSkipPayment] = useState(false);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [planError, setPlanError] = useState('');
  const phoneRef = useRef<TextInput>(null);
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles((colors) => ({
    hint: { color: colors.dim, fontSize: 14, marginTop: 4 },
    lockedValue: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    switchRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginTop: 16,
      paddingVertical: 8,
    },
    switchLabel: { color: colors.text, fontSize: 15, flex: 1, marginRight: 12 },
  }));
  const canEnroll = Boolean(user && hasGymPortalAccess(user.role));
  const owner = isGymOwner(user?.role);
  const { readOnly } = useGymReadOnly();
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const { isOnline } = useNetwork();
  const photoBlocksOffline = !isOnline && Boolean(photoDataUrl);

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token && canEnroll),
  });

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => fetchBranches(token!),
    enabled: Boolean(token && owner),
  });

  const plans = plansQuery.data ?? [];
  const branches = branchesQuery.data?.branches ?? [];
  const showBranchPicker = owner && branches.filter((b) => b.is_active !== false).length > 1;
  const selectedPlan = plans.find((p) => p.id === planId) ?? null;
  const enrollStartBounds = boundsForEnrollStart(skipPayment);
  const paymentBounds = boundsForPaymentOnTerm(startDate);

  useEffect(() => {
    if (!showBranchPicker || branchId != null) return;
    const active = branches.filter((b) => b.is_active !== false);
    const preferred = active.find((b) => b.is_default) ?? active[0];
    if (preferred) setBranchId(preferred.id);
  }, [branches, showBranchPicker, branchId]);

  useEffect(() => {
    if (selectedPlan && !skipPayment) {
      setAmount(String(planPrice(selectedPlan)));
    }
  }, [selectedPlan, skipPayment]);

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
    // Live validation like web: show error as soon as input is non-empty and invalid.
    if (!trimmed) {
      setPhoneError('');
      return;
    }
    ensurePhoneValid(trimmed);
  };

  const handlePhoneBlur = () => {
    // Show the error, but do not steal focus — pickers (plan, payment, dates)
    // blur the phone field and must remain usable.
    ensurePhoneValid();
  };

  const buildPayload = (): EnrollPayload => {
    if (!planId) throw new Error('Select a plan.');
    const planAmount = selectedPlan ? planPrice(selectedPlan) : Number(amount);
    return {
      name: name.trim(),
      phone: phone.trim(),
      plan_id: planId,
      start_date: startDate.trim(),
      skip_payment: skipPayment,
      ...(skipPayment
        ? {}
        : {
            amount: planAmount,
            date: paymentDate.trim(),
            method,
          }),
      ...(showBranchPicker && branchId ? { branch_id: branchId } : {}),
      ...(photoDataUrl ? { photo: photoDataUrl } : {}),
    };
  };

  const mutation = useOfflineMutation({
    jobType: 'enroll',
    mutationFn: (payload: EnrollPayload) => enrollMember(token!, payload),
    onSuccess: (data) => {
      if (isOfflineQueued(data)) {
        flashOffline();
        queryClient.invalidateQueries({ queryKey: ['members'] });
        router.replace('/(tabs)/members');
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (data.member.photo_url) {
        bumpMemberPhotoCache(queryClient, data.member.id);
      }
      flashSaved('flash.enrolled');
      router.replace(`/member/${data.member.id}`);
    },
    onError: (e: Error) => setError(formatApiError(e.message)),
  });

  const canSubmit = useMemo(() => {
    if (photoBlocksOffline) return false;
    if (!name.trim() || !validateRequiredEthiopianPhone(phone).ok || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return false;
    }
    if (showBranchPicker && !branchId) return false;
    // Allow enroll tap without a plan so we can show the plan field error.
    if (skipPayment || !planId) return true;
    return Number(amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(paymentDate);
  }, [
    photoBlocksOffline,
    name,
    phone,
    planId,
    startDate,
    skipPayment,
    amount,
    paymentDate,
    showBranchPicker,
    branchId,
  ]);

  if (!canEnroll) {
    return <Redirect href="/login" />;
  }

  if (readOnly) {
    return (
      <Screen>
        <View style={{ padding: 16 }}>
          <Text style={{ color: c.muted, fontSize: 15, lineHeight: 22 }}>{t('common.readOnly')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FormScroll>
          <ErrorBanner
            message={
              error ||
              (photoBlocksOffline ? t('offline.photoRemoveToEnrollOffline') : '')
            }
          />

          <Label>{t('forms.name')}</Label>
          <Field value={name} onChangeText={setName} placeholder={t('forms.memberName')} autoCapitalize="words" />

          <Label>{t('forms.phone')}</Label>
          <Field
            ref={phoneRef}
            value={phone}
            onChangeText={handlePhoneChange}
            placeholder={t('forms.phonePlaceholder')}
            keyboardType="phone-pad"
            autoCapitalize="none"
            returnKeyType="done"
            blurOnSubmit={false}
            error={Boolean(phoneError)}
            onBlur={handlePhoneBlur}
            onSubmitEditing={() => {
              if (!ensurePhoneValid()) {
                phoneRef.current?.focus();
              }
            }}
          />
          <FieldError message={phoneError} />

          <PhotoPickerField
            previewUri={photoPreview}
            onChange={(dataUrl, preview) => {
              setPhotoDataUrl(dataUrl);
              setPhotoPreview(preview);
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

          {plansQuery.isLoading ? (
            <View style={{ gap: 10, marginVertical: 8 }}>
              <SkeletonBone width="40%" height={12} />
              <SkeletonBone width="100%" height={44} radius={10} />
            </View>
          ) : plans.length === 0 ? (
            <Text style={styles.hint}>{t('forms.noPlans')}</Text>
          ) : (
            <>
              <PlanPickerField
                plans={plans}
                value={planId}
                onChange={(id) => {
                  setPlanId(id);
                  if (planError) setPlanError('');
                }}
                error={Boolean(planError)}
              />
              <FieldError message={planError} />
            </>
          )}

          <Label>{t('forms.startDate')}</Label>
          <DateField
            value={startDate}
            onChange={(v) => {
              setStartDate(v);
              if (!skipPayment) setPaymentDate(clampPaymentToTerm(v, paymentDate));
            }}
            maximumDate={enrollStartBounds.maximumDate}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('forms.enrollWithoutPayment')}</Text>
            <Switch
              value={skipPayment}
              onValueChange={setSkipPayment}
              trackColor={{ false: c.border, true: c.accent }}
            />
          </View>

          {!skipPayment ? (
            <>
              <Label>{t('forms.amount')}</Label>
              <Text style={styles.lockedValue}>{amount || '—'}</Text>
              <Text style={styles.hint}>{t('forms.amountFromPlan')}</Text>

              <Label>{t('forms.paymentDate')}</Label>
              <DateField
                value={paymentDate}
                onChange={setPaymentDate}
                minimumDate={paymentBounds.minimumDate}
                maximumDate={paymentBounds.maximumDate}
              />

              <PaymentMethodPicker value={method} onChange={setMethod} />
            </>
          ) : null}

          <PrimaryButton
            label={t('screens.enroll')}
            onPress={() => {
              setError('');
              if (!ensurePhoneValid()) {
                phoneRef.current?.focus();
                return;
              }
              if (!planId) {
                setPlanError(t('validation.planNotSelected'));
                return;
              }
              setPlanError('');
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
