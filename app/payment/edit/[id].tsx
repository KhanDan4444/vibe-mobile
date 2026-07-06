import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { deletePayment, updatePayment } from '@/src/api/payments';
import { DateField } from '@/src/components/DateField';
import { PaymentMethodPicker } from '@/src/components/PaymentMethodPicker';
import { ErrorBanner, Field, Label, PrimaryButton, Screen } from '@/src/components/Form';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTranslation } from 'react-i18next';
import { PAYMENT_METHODS, type PaymentMethod } from '@/src/constants/payments';
import { todayString } from '@/src/utils/date';
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

  const [amount, setAmount] = useState(String(params.amount ?? ''));
  const [paymentDate, setPaymentDate] = useState(params.date?.split('T')[0] || todayString());
  const [method, setMethod] = useState<PaymentMethod>(() => {
    if (params.method && PAYMENT_METHODS.includes(params.method as PaymentMethod)) {
      return params.method as PaymentMethod;
    }
    return 'Cash';
  });
  const [error, setError] = useState('');
  const styles = useThemedStyles((colors) => ({
    content: { padding: 16, paddingBottom: 40 },
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
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['member-payments', memberId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.back();
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit = useMemo(
    () => Number(amount) >= 0 && Number.isFinite(Number(amount)) && paymentDate.trim().length > 0,
    [amount, paymentDate]
  );

  const confirmDelete = () => {
    Alert.alert(t('paymentEdit.deleteTitle'), t('paymentEdit.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('member.delete'),
        style: 'destructive',
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {params.member_name ? <Text style={styles.memberName}>{params.member_name}</Text> : null}
          <ErrorBanner message={error} />

          <Label>{t('forms.amount')}</Label>
          <Field value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

          <Label>{t('forms.paymentDate')}</Label>
          <DateField value={paymentDate} onChange={setPaymentDate} />

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

          <Pressable style={styles.deleteBtn} onPress={confirmDelete} disabled={deleteMutation.isPending}>
            <Text style={styles.deleteText}>{t('paymentEdit.delete')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
