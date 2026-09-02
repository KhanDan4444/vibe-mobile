import { Redirect, useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { changeMemberPlan, fetchMember, fetchMemberPayments } from '@/src/api/members';
import { fetchPlans } from '@/src/api/plans';
import { DateField } from '@/src/components/DateField';
import { PlanPickerField } from '@/src/components/PlanPickerField';
import { ChangePlanAmountHint } from '@/src/components/ChangePlanAmountHint';
import { ChangePlanPaymentSummary } from '@/src/components/ChangePlanPaymentSummary';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { PaymentMethodPicker } from '@/src/components/PaymentMethodPicker';
import { ErrorBanner, FormScroll, Label, MoneyAmountField, PrimaryButton, Screen, formStyles } from '@/src/components/Form';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { useLoadRetry } from '@/src/hooks/useLoadRetry';
import { PAYMENT_METHODS } from '@/src/constants/payments';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { invalidateRevenueQueries } from '@/src/query/invalidateRevenue';
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
  const { colors: themeColors } = useTheme();
  const canChangePlan = Boolean(user && hasGymPortalAccess(user.role));
  const styles = useThemedStyles((colors) => ({
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 24 },
    subtitle: { color: colors.muted, fontSize: 14, marginBottom: 10, lineHeight: 20 },
    hint: { color: colors.dim, fontSize: 12, marginTop: 4, marginBottom: 2, lineHeight: 17 },
    currentPlanRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'baseline' as const,
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    },
    currentPlanLabel: { color: colors.muted, fontSize: 13 },
    currentPlanName: { color: colors.text, fontSize: 14, fontWeight: '600' as const },
    currentPlanMeta: { color: colors.muted, fontSize: 13 },
    planHeader: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 8,
      marginBottom: 4,
    },
    termEndChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    termEndChipText: { color: colors.text, fontSize: 12, fontWeight: '500' as const },
    termModeGroup: {
      flexDirection: 'row' as const,
      gap: 3,
      padding: 3,
      marginBottom: 4,
    },
    termModeBtn: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 9,
      paddingHorizontal: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    termModeBtnPressed: { backgroundColor: colors.accentSoft, opacity: 0.92 },
    termModeBtnActive: { backgroundColor: colors.accent },
    termModeBtnText: { color: colors.muted, fontSize: 13, fontWeight: '600' as const },
    termModeBtnTextActive: { color: '#fff' },
    warningPanel: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      borderRadius: 10,
      padding: 10,
      marginBottom: 10,
    },
    warningText: { color: colors.warning, fontSize: 13, lineHeight: 18 },
    warningInline: { color: colors.warning, fontSize: 12, lineHeight: 16, marginTop: 4 },
    fieldGap: { marginBottom: 2, marginTop: 6 },
    sectionGap: { marginTop: 8, marginBottom: 2 },
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

  const loadRetry = useLoadRetry(memberQuery);

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
      invalidateRevenueQueries(queryClient);
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

  const midTermHint = member?.is_unpaid
    ? t('forms.midTermHintUnpaid')
    : t('forms.midTermHintPaid');

  const termEndChipLabel =
    termEndPreview &&
    (upgradeHint?.isDowngrade && upgradeHint?.keepTermEnd
      ? t('forms.termEndUnchangedChip', { date: formatDisplayDate(termEndPreview) })
      : t('forms.termEndChip', { date: formatDisplayDate(termEndPreview) }));

  if (!canChangePlan) {
    return <Redirect href="/login" />;
  }

  if (loadRetry.showLoading) {
    return (
      <Screen>
        <PageSkeleton variant="form" count={6} />
      </Screen>
    );
  }

  if (loadRetry.showError) {
    return (
      <Screen>
        <LoadError
          message={memberQuery.error instanceof Error ? memberQuery.error.message : undefined}
          loading={loadRetry.loading}
          onRetry={loadRetry.onRetry}
        />
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
        <FormScroll>
          {member ? (
            <Text style={styles.subtitle}>{t('forms.changePlanSubtitle', { name: member.name })}</Text>
          ) : null}

          <ErrorBanner message={error} />

          {currentPlan ? (
            member?.is_unpaid ? (
              <View style={styles.warningPanel}>
                <Text style={styles.warningText}>
                  {t('forms.currentPlan')} · {currentPlan.name}
                  {member.start_date
                    ? ` · ${t('forms.termStarted', { date: formatDisplayDate(member.start_date) })}`
                    : ''}
                </Text>
                <Text style={[styles.warningText, { marginTop: 6 }]}>{t('forms.unpaidChangeBanner')}</Text>
              </View>
            ) : (
              <SoftSurface variant="quiet" style={styles.currentPlanRow}>
                <Text style={styles.currentPlanLabel}>{t('forms.currentPlan')}</Text>
                <Text style={styles.currentPlanName}>{currentPlan.name}</Text>
                <Text style={styles.currentPlanMeta}>·</Text>
                <Text style={styles.currentPlanMeta}>
                  {t('forms.paidThrough')} {formatDisplayDate(member?.end_date)}
                </Text>
                {member?.start_date ? (
                  <>
                    <Text style={styles.currentPlanMeta}>·</Text>
                    <Text style={styles.currentPlanMeta}>
                      {t('forms.termStarted', { date: formatDisplayDate(member.start_date) })}
                    </Text>
                  </>
                ) : null}
              </SoftSurface>
            )
          ) : null}

          <View style={styles.planHeader}>
            <Text style={[formStyles.label, { color: themeColors.muted, marginBottom: 0 }]}>
              {t('forms.newPlan')}
            </Text>
            {termEndChipLabel ? (
              <View style={styles.termEndChip}>
                <Text style={styles.termEndChipText}>{termEndChipLabel}</Text>
              </View>
            ) : null}
          </View>
          <PlanPickerField plans={otherPlans} value={planId} onChange={setPlanId} label="" />

          <View style={styles.sectionGap}>
            <Label>{t('forms.termModeLabel')}</Label>
            <SoftSurface variant="quiet" style={styles.termModeGroup}>
              <Pressable
                onPress={() => {
                  if (customTermStart) toggleTermMode();
                }}
                style={({ pressed }) => [
                  styles.termModeBtn,
                  !customTermStart && styles.termModeBtnActive,
                  pressed && customTermStart && styles.termModeBtnPressed,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: !customTermStart }}
              >
                <Text style={[styles.termModeBtnText, !customTermStart && styles.termModeBtnTextActive]}>
                  {t('forms.termModeMidTerm')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!customTermStart) toggleTermMode();
                }}
                style={({ pressed }) => [
                  styles.termModeBtn,
                  customTermStart && styles.termModeBtnActive,
                  pressed && !customTermStart && styles.termModeBtnPressed,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: customTermStart }}
              >
                <Text style={[styles.termModeBtnText, customTermStart && styles.termModeBtnTextActive]}>
                  {t('forms.termModeNewTerm')}
                </Text>
              </Pressable>
            </SoftSurface>
            <Text style={styles.hint}>{!customTermStart ? midTermHint : t('forms.freshTermHint')}</Text>
            {customTermStart && member && !member.is_unpaid && member.end_date ? (
              <Text style={styles.warningInline}>
                {t('forms.customTermPaidWarning', { date: formatDisplayDate(member.end_date) })}
              </Text>
            ) : null}
          </View>

          {customTermStart ? (
            <View style={styles.fieldGap}>
              <Label>{t('forms.effectiveDate')}</Label>
              <DateField
                value={startDate}
                onChange={onTermStartChange}
                maximumDate={customTermStartBounds.maximumDate}
              />
            </View>
          ) : null}

          <Label>{t('forms.paymentDateReceived')}</Label>
          <DateField
            value={paymentDate}
            onChange={setPaymentDate}
            minimumDate={paymentBounds.minimumDate}
            maximumDate={paymentBounds.maximumDate}
          />
          <Text style={styles.hint}>{t('forms.paymentCollectedHint')}</Text>
          {hasChangePlanPaymentOnDate ? (
            <Text style={styles.warningInline}>{t('validation.changePlanDuplicate')}</Text>
          ) : null}

          <Label>{t('forms.amountDue')}</Label>
          <MoneyAmountField
            value={amount}
            onChangeText={(v) => {
              setAmountEdited(true);
              setAmount(v);
            }}
          />
          <ChangePlanAmountHint
            upgradeHint={upgradeHint}
            amountEdited={amountEdited}
            selectedPlanName={selectedPlan?.name}
            currentPlanName={currentPlan?.name}
            endDate={member?.end_date}
            onUseSuggested={() => {
              if (!upgradeHint) return;
              setAmountEdited(false);
              setAmount(String(upgradeHint.suggestedAmount));
            }}
          />

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
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}
