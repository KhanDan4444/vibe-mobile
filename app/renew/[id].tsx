import { Redirect, useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchMember, renewMember } from '@/src/api/members';
import { fetchPlans } from '@/src/api/plans';
import { DateField } from '@/src/components/DateField';
import { PlanPickerField } from '@/src/components/PlanPickerField';
import { PaymentMethodPicker } from '@/src/components/PaymentMethodPicker';
import { ErrorBanner, Field, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { PageSkeleton } from '@/src/components/Skeleton';
import { LoadError } from '@/src/components/LoadError';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { PAYMENT_METHODS } from '@/src/constants/payments';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { todayString } from '@/src/utils/date';
import { defaultRenewStartDate } from '@/src/utils/memberRenew';
import {
  boundsForPaymentOnTerm,
  boundsForRenewStart,
  clampPaymentToTerm,
  type DateBounds,
} from '@/src/utils/datePickerBounds';
import { hasGymPortalAccess } from '@/src/utils/roles';
import type { PlanRow, RenewPayload } from '@/src/types/api';

function planPrice(plan: PlanRow): number {
  return Number(plan.price) || 0;
}

export default function RenewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();

  const [planId, setPlanId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(todayString());
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('Cash');
  const [error, setError] = useState('');
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const { t } = useTranslation();
  const canRenew = Boolean(user && hasGymPortalAccess(user.role));
  const styles = useThemedStyles((colors) => ({
    center: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
    memberName: { color: colors.text, fontSize: 17, fontWeight: '600' as const, marginBottom: 8 },
    hint: { color: colors.dim, fontSize: 14 },
  }));

  const memberQuery = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => fetchMember(token!, memberId),
    enabled: Boolean(token && canRenew) && Number.isFinite(memberId),
  });

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token && canRenew),
  });

  const member = memberQuery.data;
  const plans = plansQuery.data ?? [];
  const renewStartBounds: DateBounds = member ? boundsForRenewStart(member) : {};
  const paymentBounds = boundsForPaymentOnTerm(startDate);

  useEffect(() => {
    if (member) {
      setStartDate(defaultRenewStartDate(member));
      if (member.plan_id) setPlanId(member.plan_id);
    }
  }, [member]);

  const selectedPlan = plans.find((p) => p.id === planId) ?? null;

  useEffect(() => {
    if (selectedPlan) setAmount(String(planPrice(selectedPlan)));
  }, [selectedPlan]);

  const buildPayload = (): RenewPayload => {
    if (!planId) throw new Error('Select a plan.');
    return {
      plan_id: planId,
      start_date: startDate.trim(),
      amount: Number(amount),
      date: paymentDate.trim(),
      method,
    };
  };

  const mutation = useOfflineMutation({
    jobType: 'renew',
    memberId: memberId,
    mutationFn: (payload: RenewPayload) => renewMember(token!, memberId, payload),
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
      flashSaved('flash.renewed');
      router.replace(`/member/${memberId}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit = useMemo(() => {
    return (
      Number.isFinite(memberId) &&
      planId != null &&
      Number(amount) > 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(paymentDate)
    );
  }, [memberId, planId, amount, startDate, paymentDate]);

  if (!canRenew) {
    return <Redirect href="/login" />;
  }

  if (memberQuery.isLoading) {
    return (
      <Screen>
        <PageSkeleton variant="form" count={5} />
      </Screen>
    );
  }

  if (memberQuery.isError) {
    return (
      <Screen>
        <LoadError
          message={memberQuery.error instanceof Error ? memberQuery.error.message : undefined}
          onRetry={() => void memberQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          {member ? <Text style={styles.memberName}>{t('forms.renewFor', { name: member.name })}</Text> : null}
          <ErrorBanner message={error} />

          {plans.length === 0 ? (
            <Text style={styles.hint}>{t('forms.noPlans')}</Text>
          ) : (
            <PlanPickerField plans={plans} value={planId} onChange={setPlanId} />
          )}

          <Label>{t('forms.startDate')}</Label>
          <DateField
            value={startDate}
            onChange={(v) => {
              setStartDate(v);
              setPaymentDate(clampPaymentToTerm(v, paymentDate));
            }}
            minimumDate={renewStartBounds.minimumDate}
          />

          <Label>{t('forms.amount')}</Label>
          <Field value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoCapitalize="none" />

          <Label>{t('forms.paymentDate')}</Label>
          <DateField
            value={paymentDate}
            onChange={setPaymentDate}
            minimumDate={paymentBounds.minimumDate}
            maximumDate={paymentBounds.maximumDate}
          />

          <PaymentMethodPicker value={method} onChange={setMethod} />

          <PrimaryButton
            label={t('forms.renewMembership')}
            onPress={() => {
              setError('');
              mutation.mutate(buildPayload());
            }}
            loading={mutation.isPending}
            disabled={!canSubmit}
          />
        </FormScroll>
      </KeyboardAvoidingView>
    </Screen>
  );
}
