import { Redirect, useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchMember } from '@/src/api/members';
import { createPayment } from '@/src/api/payments';
import { fetchPlans } from '@/src/api/plans';
import { DateField } from '@/src/components/DateField';
import { PaymentMethodPicker } from '@/src/components/PaymentMethodPicker';
import { ErrorBanner, FormScroll, Label, MoneyAmountField, PrimaryButton, Screen } from '@/src/components/Form';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { useOfflineFlash, useSaveFlash } from '@/src/hooks/useSaveFlash';
import { PAYMENT_METHODS } from '@/src/constants/payments';
import { useOfflineMutation } from '@/src/offline/useOfflineMutation';
import { isOfflineQueued } from '@/src/offline/types';
import { todayString } from '@/src/utils/date';
import { boundsForPaymentOnTerm } from '@/src/utils/datePickerBounds';
import { hasGymPortalAccess } from '@/src/utils/roles';

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>('Cash');
  const [error, setError] = useState('');
  const flashSaved = useSaveFlash();
  const flashOffline = useOfflineFlash();
  const { t } = useTranslation();
  const canRecordPayment = Boolean(user && hasGymPortalAccess(user.role));
  const styles = useThemedStyles((colors) => ({
    memberChip: { paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
    memberName: { color: colors.text, fontSize: 16, fontWeight: '600' as const },
  }));

  const memberQuery = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => fetchMember(token!, memberId),
    enabled: Boolean(token && canRecordPayment) && Number.isFinite(memberId),
  });

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchPlans(token!),
    enabled: Boolean(token && canRecordPayment),
  });

  const member = memberQuery.data;
  const plans = plansQuery.data ?? [];
  const paymentBounds = boundsForPaymentOnTerm(member?.start_date);

  useEffect(() => {
    if (!member?.plan_id) return;
    const plan = plans.find((p) => p.id === member.plan_id);
    if (plan) setAmount(String(Number(plan.price) || 0));
  }, [member, plans]);

  const buildPayload = () => ({
    member_id: memberId,
    amount: Number(amount),
    date: paymentDate.trim(),
    method,
  });

  const mutation = useOfflineMutation({
    jobType: 'payment',
    memberId: memberId,
    mutationFn: (payload: ReturnType<typeof buildPayload>) => createPayment(token!, payload),
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
      flashSaved('flash.paymentRecorded');
      router.replace(`/member/${memberId}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit = useMemo(
    () => Number.isFinite(memberId) && Number(amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(paymentDate),
    [memberId, amount, paymentDate]
  );

  if (!canRecordPayment) {
    return <Redirect href="/login" />;
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          {member ? (
            <SoftSurface variant="quiet" style={styles.memberChip}>
              <Text style={styles.memberName}>{t('forms.paymentFor', { name: member.name })}</Text>
            </SoftSurface>
          ) : null}
          <ErrorBanner message={error} />

          <Label>{t('forms.amount')}</Label>
          <MoneyAmountField value={amount} onChangeText={setAmount} />

          <Label>{t('forms.paymentDate')}</Label>
          <DateField
            value={paymentDate}
            onChange={setPaymentDate}
            minimumDate={paymentBounds.minimumDate}
            maximumDate={paymentBounds.maximumDate}
          />

          <PaymentMethodPicker value={method} onChange={setMethod} />

          <PrimaryButton
            label={t('forms.recordPayment')}
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
