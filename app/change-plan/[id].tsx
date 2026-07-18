import { Redirect, useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { changeMemberPlan, fetchMember, fetchMemberPayments } from '@/src/api/members';
import { fetchPlans } from '@/src/api/plans';
import { DateField } from '@/src/components/DateField';
import { PlanPickerField } from '@/src/components/PlanPickerField';
import { ChangePlanPaymentSummary } from '@/src/components/ChangePlanPaymentSummary';
import { PaymentMethodPicker } from '@/src/components/PaymentMethodPicker';
import { ErrorBanner, Field, Label, PrimaryButton, Screen } from '@/src/components/Form';
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
  validateChangePlanPaymentFields,
} from '@/src/utils/paymentValidation';
import {
  boundsForPaymentOnTerm,
  boundsForTermStartWithPayment,
  paymentDateForTermStart,
} from '@/src/utils/datePickerBounds';
import { hasGymPortalAccess } from '@/src/utils/roles';
import type { ChangePlanPayload } from '@/src/types/api';

function formatMoney(n: number) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

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
  const canChangePlan = Boolean(user && hasGymPortalAccess(user.role));
  const styles = useThemedStyles((colors) => ({
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 24 },
    memberName: { color: colors.text, fontSize: 17, fontWeight: '600' as const, marginBottom: 4 },
    subtitle: { color: colors.muted, fontSize: 14, marginBottom: 14, lineHeight: 20 },
    hint: { color: colors.dim, fontSize: 13, marginTop: 8, marginBottom: 4, lineHeight: 18 },
    infoPanel: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    infoTitle: { color: colors.text, fontSize: 14, fontWeight: '600' as const },
    infoBody: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
    warningPanel: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    warningText: { color: colors.warning, fontSize: 13, lineHeight: 18 },
    previewPanel: {
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
      marginBottom: 12,
    },
    previewText: { color: colors.accentText, fontSize: 14, fontWeight: '500' as const },
    link: { color: colors.accentText, fontSize: 13, fontWeight: '600' as const, marginTop: 10, marginBottom: 10 },
    useSuggested: { color: colors.accentText, fontSize: 13, fontWeight: '600' as const, marginTop: 8 },
    fieldGap: { marginBottom: 4 },
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
  const today = todayString();

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
  const paymentBounds = boundsForPaymentOnTerm(termStart);
  const customTermStartBounds = boundsForTermStartWithPayment();
  const hasChangePlanPaymentOnDate = (paymentsQuery.data ?? []).some(
    (p) => toDateString(p.date) === paymentDate && p.source === 'change_plan'
  );

  const upgradeHint = suggestChangePlanAmount(member ?? null, currentPlan, selectedPlan, {
    customTermStart,
    startDate,
  });

  const onTermStartChange = (value: string) => {
    setStartDate(value);
    setAmountEdited(false);
    setPaymentDate(paymentDateForTermStart(value));
  };

  const toggleTermMode = () => {
    if (customTermStart) {
      setCustomTermStart(false);
      if (member) setStartDate(toDateString(member.start_date) || today);
      setPaymentDate(today);
    } else {
      setCustomTermStart(true);
      setStartDate(today);
      setPaymentDate(today);
    }
    setAmountEdited(false);
  };

  const buildPayload = (): ChangePlanPayload => {
    if (!planId || !member) throw new Error('Select a plan.');
    const nextTermStart = customTermStart ? startDate.trim() : toDateString(member.start_date);
    return {
      plan_id: planId,
      start_date: nextTermStart,
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
    const nextTermStart = customTermStart ? startDate : toDateString(member.start_date);
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(nextTermStart) &&
      /^\d{4}-\d{2}-\d{2}$/.test(paymentDate) &&
      Number(amount) >= 0
    );
  }, [memberId, planId, member, customTermStart, startDate, paymentDate, amount]);

  const amountHint = (() => {
    if (!upgradeHint) return t('forms.amountCollectedHint');
    const planFallback = selectedPlan?.name ?? t('forms.newPlanFallback');
    if (upgradeHint.freshTerm) {
      return t('forms.freshTermAmountHint', {
        amount: formatMoney(upgradeHint.suggestedAmount),
        planName: planFallback,
        paidThrough: formatDisplayDate(member?.end_date),
      });
    }
    if (upgradeHint.prePayment) {
      return t('forms.prePaymentHint', {
        amount: formatMoney(upgradeHint.suggestedAmount),
        planName: planFallback,
      });
    }
    if (upgradeHint.isDowngrade) {
      return t('forms.downgradeHint', {
        amount: formatMoney(upgradeHint.suggestedAmount),
        endDate: formatDisplayDate(member?.end_date),
        planName: currentPlan?.name ?? '—',
      });
    }
    const dayLabel = t(upgradeHint.remainingDays === 1 ? 'forms.day' : 'forms.days');
    let text = t('forms.upgradeHint', {
      amount: formatMoney(upgradeHint.suggestedAmount),
      newPrice: formatMoney(upgradeHint.newPlanPrice),
      credit: formatMoney(upgradeHint.credit),
      days: upgradeHint.remainingDays,
      dayLabel,
      planName: currentPlan?.name ?? '—',
    });
    if (!amountEdited) text += ` ${t('forms.upgradeAdjust')}`;
    return text;
  })();

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
          <Text style={styles.hint}>{t('forms.addAnotherMembershipPlan')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {member ? (
            <>
              <Text style={styles.memberName}>{t('forms.changePlanFor', { name: member.name })}</Text>
              <Text style={styles.subtitle}>{t('forms.changePlanSubtitle', { name: member.name })}</Text>
            </>
          ) : null}

          <ErrorBanner message={error} />

          {currentPlan ? (
            <View style={styles.infoPanel}>
              <Text style={styles.infoTitle}>
                {t('forms.currentPlan')}: {currentPlan.name}
                {member?.is_unpaid
                  ? ` · ${t('forms.noPaymentRecordedYet')}`
                  : ` · ${t('forms.paidThrough')} ${formatDisplayDate(member?.end_date)}`}
              </Text>
            </View>
          ) : null}

          {member?.is_unpaid ? (
            <View style={styles.warningPanel}>
              <Text style={styles.warningText}>{t('forms.unpaidChangeBanner')}</Text>
            </View>
          ) : null}

          <PlanPickerField plans={otherPlans} value={planId} onChange={setPlanId} label={t('forms.newPlan')} />

          <Pressable onPress={toggleTermMode} accessibilityRole="button">
            <Text style={styles.link}>
              {customTermStart ? t('forms.switchMidTerm') : t('forms.newTermFromDate')}
            </Text>
          </Pressable>

          {!customTermStart ? (
            <View style={styles.infoPanel}>
              <Text style={styles.infoTitle}>
                {member?.is_unpaid ? t('forms.switchBeforePayment') : t('forms.switchOnCurrentTerm')}
              </Text>
              <Text style={styles.infoBody}>
                {t('forms.termStarted', { date: formatDisplayDate(member?.start_date) })}{' '}
                {member?.is_unpaid ? t('forms.unpaidPickPlan') : t('forms.paidPickPlan')}
              </Text>
            </View>
          ) : (
            <View style={styles.fieldGap}>
              {member && !member.is_unpaid && member.end_date ? (
                <View style={styles.warningPanel}>
                  <Text style={styles.warningText}>
                    {t('forms.customTermPaidWarning', { date: formatDisplayDate(member.end_date) })}
                  </Text>
                </View>
              ) : null}
              <Label>{t('forms.effectiveDate')}</Label>
              <DateField
                value={startDate}
                onChange={onTermStartChange}
                maximumDate={customTermStartBounds.maximumDate}
              />
              <Text style={styles.hint}>{t('forms.freshTermHint')}</Text>
            </View>
          )}

          <Label>{t('forms.paymentDateReceived')}</Label>
          <DateField
            value={paymentDate}
            onChange={setPaymentDate}
            minimumDate={paymentBounds.minimumDate}
            maximumDate={paymentBounds.maximumDate}
          />
          <Text style={styles.hint}>{t('forms.paymentCollectedHint')}</Text>
          {hasChangePlanPaymentOnDate ? (
            <View style={styles.warningPanel}>
              <Text style={styles.warningText}>{t('validation.changePlanDuplicate')}</Text>
            </View>
          ) : null}

          {termEndPreview ? (
            <View style={styles.previewPanel}>
              <Text style={styles.previewText}>
                {upgradeHint?.isDowngrade && upgradeHint?.keepTermEnd
                  ? `${t('forms.termEndUnchanged')} ${formatDisplayDate(termEndPreview)}`
                  : `${t('forms.newTermEnds')} ${formatDisplayDate(termEndPreview)}`}
              </Text>
            </View>
          ) : null}

          <Label>{t('forms.amountDue')}</Label>
          <Field
            value={amount}
            onChangeText={(v) => {
              setAmountEdited(true);
              setAmount(v);
            }}
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>{amountHint}</Text>
          {upgradeHint && amountEdited ? (
            <Pressable
              onPress={() => {
                setAmountEdited(false);
                setAmount(String(upgradeHint.suggestedAmount));
              }}
              accessibilityRole="button"
            >
              <Text style={styles.useSuggested}>
                {t('forms.useSuggestedAmount', { amount: formatMoney(upgradeHint.suggestedAmount) })}
              </Text>
            </Pressable>
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
