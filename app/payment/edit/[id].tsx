import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { fetchMember } from '@/src/api/members';
import { deletePayment, updatePayment } from '@/src/api/payments';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { DateField } from '@/src/components/DateField';
import { PaymentMethodPicker } from '@/src/components/PaymentMethodPicker';
import { ErrorBanner, Field, FormScroll, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { PAYMENT_METHODS, type PaymentMethod } from '@/src/constants/payments';
import { useDeleteFlash } from '@/src/hooks/useSaveFlash';
import { todayString } from '@/src/utils/date';
import { boundsForPaymentOnTerm } from '@/src/utils/datePickerBounds';
import { isGymOwner } from '@/src/utils/roles';

export default function EditPaymentScreen() {
  const params = useLocalSearchParams<{
    id: string;
    amount?: string;
    date?: string;
    method?: string;
    member_id?: string;
    member_name?: string;
  }>();
  const paymentId = Number(params.id);
  const memberId = Number(params.member_id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, subscription } = useAuth();
  const { t } = useTranslation();
  const flashDeleted = useDeleteFlash();

  const [amount, setAmount] = useState(String(params.amount ?? ''));
  const [paymentDate, setPaymentDate] = useState(params.date?.split('T')[0] || todayString());
  const [method, setMethod] = useState<PaymentMethod>(() => {
    if (params.method && PAYMENT_METHODS.includes(params.method as PaymentMethod)) {
      return params.method as PaymentMethod;
    }
    return 'Cash';
  });
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const styles = useThemedStyles((colors) => ({
    memberName: { fontSize: 18, fontWeight: '600' as const, color: colors.text, marginBottom: 8 },
    readOnly: { color: colors.muted, padding: 16, fontSize: 15, lineHeight: 22 },
    deleteBtn: {
      marginTop: 20,
      paddingVertical: 14,
      alignItems: 'center' as const,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(248,113,113,0.5)',
    },
    deleteText: { color: colors.error, fontSize: 15, fontWeight: '600' as const },
  }));
  const canManagePayment = Boolean(user && isGymOwner(user.role));

  const memberQuery = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => fetchMember(token!, memberId),
    enabled: Boolean(token && canManagePayment) && Number.isFinite(memberId),
  });

  const paymentBounds = boundsForPaymentOnTerm(memberQuery.data?.start_date);

  const mutation = useMutation({
    mutationFn: () =>
      updatePayment(token!, paymentId, {
        amount: Number(amount),
        date: paymentDate.trim(),
        method,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['member-payments', memberId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.back();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePayment(token!, paymentId),
    onSuccess: () => {
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['member-payments', memberId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      flashDeleted('flash.paymentDeleted');
      router.back();
    },
    onError: (e: Error) => {
      setDeleteOpen(false);
      setError(e.message);
    },
  });

  const canSubmit = useMemo(
    () => Number(amount) >= 0 && Number.isFinite(Number(amount)) && paymentDate.trim().length > 0,
    [amount, paymentDate]
  );

  if (!canManagePayment) {
    return <Redirect href="/login" />;
  }

  if (subscription?.readOnly) {
    return (
      <Screen>
        <Text style={styles.readOnly}>{t('common.readOnly')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FormScroll>
          {params.member_name ? <Text style={styles.memberName}>{params.member_name}</Text> : null}
          <ErrorBanner message={error} />

          <Label>{t('forms.amount')}</Label>
          <Field value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

          <Label>{t('forms.paymentDate')}</Label>
          <DateField
            value={paymentDate}
            onChange={setPaymentDate}
            minimumDate={paymentBounds.minimumDate}
            maximumDate={paymentBounds.maximumDate}
          />

          <PaymentMethodPicker value={method} onChange={setMethod} />

          <PrimaryButton
            label={t('common.save')}
            onPress={() => {
              setError('');
              mutation.mutate();
            }}
            loading={mutation.isPending}
            disabled={!canSubmit}
          />

          <Pressable style={styles.deleteBtn} onPress={() => setDeleteOpen(true)} disabled={deleteMutation.isPending}>
            <Text style={styles.deleteText}>{t('paymentEdit.delete')}</Text>
          </Pressable>
        </FormScroll>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={deleteOpen}
        title={t('paymentEdit.deleteTitle')}
        message={t('paymentEdit.deleteBody')}
        confirmLabel={t('paymentEdit.delete')}
        destructive
        confirmLoading={deleteMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </Screen>
  );
}
