import { Redirect, useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { changeMemberPlan, fetchMember, fetchMemberPayments } from '@/src/api/members';
import { fetchPlans } from '@/src/api/plans';
import { DateField } from '@/src/components/DateField';
import { PlanPickerField } from '@/src/components/PlanPickerField';
import { ChangePlanPaymentSummary } from '@/src/components/ChangePlanPaymentSummary';
import { PaymentMethodPicker } from '@/src/components/PaymentMethodPicker';
import { ErrorBanner, Field, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { PAYMENT_METHODS } from '@/src/constants/payments';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { formatDisplayDate, todayString, toDateString } from '@/src/utils/date';
import { previewMemberTermEnd, suggestChangePlanAmount } from '@/src/utils/changePlan';
import {
  formatApiError,
  isoToLocalDate,
  validateChangePlanPaymentFields,
} from '@/src/utils/paymentValidation';
import { hasGymPortalAccess } from '@/src/utils/roles';
import type { ChangePlanPayload } from '@/src/types/api';

export default function ChangePlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();

  const [planId, setPlanId] = useState<number | null>(null);
  const [customTermStart, setCustomTermStart] = useState(false);
  const [startDate, setStartDate] = useState(todayString());
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('Cash');
  const [amountEdited, setAmountEdited] = useState(false);
  const [error, setError] = useState('');
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const canChangePlan = Boolean(user && hasGymPortalAccess(user.role));
  const styles = useThemedStyles((colors) => ({
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 24 },
    memberName: { color: colors.text, fontSize: 17, fontWeight: '600' as const, marginBottom: 8 },
    hint: { color: colors.dim, fontSize: 13, marginTop: 8, marginBottom: 4 },
    preview: { color: colors.accentText, fontSize: 14, marginTop: 8, fontWeight: '500' as const },
    warning: {
      color: colors.warning,
      fontSize: 13,
      marginTop: 8,
      marginBottom: 4,
      lineHeight: 18,
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

  const memberQuery = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => fetchMember(token!, memberId),
    enabled: Boolean(token && canChangePlan) && Number.isFinite(memberId),
  });

  const paymentsQuery = useQuery({
    queryKey: ['member-payments', memberId],
    queryFn: () => fetchMemberPayments(token!, memberId),
    enabled: Boolean(token && canChangePlan) && Number.isFinite(memberId),
  });

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token && canChangePlan),
  });

  const member = memberQuery.data;
  const plans = plansQuery.data ?? [];
  const otherPlans = plans.filter((p) => p.id !== member?.plan_id);
  const currentPlan = plans.find((p) => p.id === member?.plan_id) ?? null;
  const selectedPlan = plans.find((p) => p.id === planId) ?? null;

  useEffect(() => {
    if (!member || otherPlans.length === 0) return;
    const first = otherPlans[0];
    setPlanId(first.id);
    setCustomTermStart(false);
    setStartDate(toDateString(member.start_date) || todayString());
    setPaymentDate(todayString());
    const hint = suggestChangePlanAmount(member, currentPlan, first);
    setAmount(hint ? String(hint.suggestedAmount) : String(Number(first.price) || 0));
    setAmountEdited(false);
  }, [member?.id, plans.length]);

  useEffect(() => {
    if (!planId || amountEdited || !member) return;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const hint = suggestChangePlanAmount(member, currentPlan, plan, { customTermStart, startDate });
    setAmount(hint ? String(hint.suggestedAmount) : String(Number(plan.price) || 0));
  }, [planId, member, currentPlan, plans, amountEdited, customTermStart, startDate]);

  const termEndPreview = previewMemberTermEnd({
    member: member ?? null,
    currentPlan,
    selectedPlan,
    customTermStart,
    startDate,
  });

  const termStart = customTermStart ? startDate.trim() : toDateString(member?.start_date);
  const isSameTerm = Boolean(member && termStart === toDateString(member.start_date));
  const paymentMinDate = termStart ? isoToLocalDate(termStart) : undefined;
  const paymentMaxDate = isoToLocalDate(todayString());
  const hasChangePlanPaymentOnDate = (paymentsQuery.data ?? []).some(
    (p) => toDateString(p.date) === paymentDate && p.source === 'change_plan'
  );

  const upgradeHint = suggestChangePlanAmount(member ?? null, currentPlan, selectedPlan, {
    customTermStart,
    startDate,
  });

  const buildPayload = (): ChangePlanPayload => {
    if (!planId || !member) throw new Error('Select a plan.');
    const termStart = customTermStart ? startDate.trim() : toDateString(member.start_date);
    return {
      plan_id: planId,
      start_date: termStart,
      amount: Number(amount),
      date: paymentDate.trim(),
      method,
    };
  };

  const mutation = useOfflineMutation({
    jobType: 'change-plan',
    memberId: memberId,
    mutationFn: (payload: ChangePlanPayload) => changeMemberPlan(token!, memberId, payload),
    onSuccess: (data) => {
      if (isOfflineQueued(data)) {
        flashOffline();
        router.replace(`/member/${memberId}`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member-payments', memberId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      flashSaved('flash.planChanged');
      router.replace(`/member/${memberId}`);
    },
    onError: (e: Error) => setError(formatApiError(e.message)),
  });

  const submitChangePlan = () => {
    setError('');
    const validation = validateChangePlanPaymentFields({
      termStart,
      paymentDate,
      amount: Number(amount),
      isSameTerm,
    });
    if (validation) {
      setError(t(validation.key, validation.values));
      return;
    }
    if (hasChangePlanPaymentOnDate && Number(amount) > 0) {
      setError(t('validation.changePlanDuplicate'));
      return;
    }
    mutation.mutate(buildPayload());
  };

  const canSubmit = useMemo(() => {
    if (!Number.isFinite(memberId) || !planId || !member) return false;
    const termStart = customTermStart ? startDate : toDateString(member.start_date);
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(termStart) &&
      /^\d{4}-\d{2}-\d{2}$/.test(paymentDate) &&
      Number(amount) >= 0
    );
  }, [memberId, planId, member, customTermStart, startDate, paymentDate, amount]);

  if (!canChangePlan) {
    return <Redirect href="/login" />;
  }

  if (memberQuery.isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.hint}>{t('common.loading')}</Text>
        </View>
      </Screen>
    );
  }

  if (otherPlans.length === 0) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.hint}>{t('forms.noOtherPlans')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {member ? <Text style={styles.memberName}>{t('forms.changePlanFor', { name: member.name })}</Text> : null}
          <ErrorBanner message={error} />

          <PlanPickerField plans={otherPlans} value={planId} onChange={setPlanId} label={t('forms.newPlan')} />

          {upgradeHint?.freshTerm ? (
            <Text style={styles.hint}>
              {t('forms.freshTermAmountHint', {
                amount: upgradeHint.suggestedAmount.toLocaleString(),
                planName: selectedPlan?.name ?? t('forms.newPlan'),
                paidThrough: formatDisplayDate(member?.end_date),
              })}
            </Text>
          ) : upgradeHint?.prePayment ? (
            <Text style={styles.hint}>
              {t('forms.prePaymentHint', {
                amount: upgradeHint.suggestedAmount.toLocaleString(),
                planName: selectedPlan?.name ?? t('forms.newPlan'),
              })}
            </Text>
          ) : upgradeHint?.isDowngrade ? (
            <Text style={styles.hint}>{t('forms.downgradeHint')}</Text>
          ) : upgradeHint && upgradeHint.credit > 0 ? (
            <Text style={styles.hint}>{t('forms.creditHint', { credit: upgradeHint.credit.toLocaleString() })}</Text>
          ) : null}

          {termEndPreview ? (
            <Text style={styles.preview}>{t('forms.termEndPreview', { date: formatDisplayDate(termEndPreview) })}</Text>
          ) : null}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('forms.customTermStart')}</Text>
            <Switch
              value={customTermStart}
              onValueChange={(v) => {
                setCustomTermStart(v);
                setAmountEdited(false);
                if (v) {
                  setStartDate(todayString());
                  setPaymentDate(todayString());
                } else if (member) {
                  setStartDate(toDateString(member.start_date) || todayString());
                  setPaymentDate(todayString());
                }
              }}
              trackColor={{ false: c.border, true: c.accent }}
            />
          </View>

          {customTermStart ? (
            <>
              {member && !member.is_unpaid && member.end_date ? (
                <Text style={styles.warning}>
                  {t('forms.customTermPaidWarning', { date: formatDisplayDate(member.end_date) })}
                </Text>
              ) : null}
              <Label>{t('forms.termStartDate')}</Label>
              <DateField value={startDate} onChange={setStartDate} />
              <Text style={styles.hint}>{t('forms.freshTermHint')}</Text>
            </>
          ) : null}

          <Label>{t('forms.amount')}</Label>
          <Field
            value={amount}
            onChangeText={(v) => {
              setAmountEdited(true);
              setAmount(v);
            }}
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />

          <Label>{t('forms.paymentDate')}</Label>
          <DateField
            value={paymentDate}
            onChange={setPaymentDate}
            minimumDate={paymentMinDate}
            maximumDate={paymentMaxDate}
          />
          <Text style={styles.hint}>{t('forms.paymentDateHint')}</Text>
          {hasChangePlanPaymentOnDate ? (
            <Text style={[styles.hint, { color: c.warning }]}>{t('validation.changePlanDuplicate')}</Text>
          ) : null}

          <PaymentMethodPicker value={method} onChange={setMethod} />

          <ChangePlanPaymentSummary
            payments={paymentsQuery.data}
            termStart={termStart}
            pendingAmount={Number(amount) || 0}
          />

          <PrimaryButton
            label={t('forms.changePlan')}
            onPress={submitChangePlan}
            loading={mutation.isPending}
            disabled={!canSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
