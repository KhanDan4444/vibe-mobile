import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { formatDisplayDate } from '@/src/utils/date';
import {
  paymentSourceKey,
  paymentsForCurrentTerm,
  sumPaymentAmounts,
} from '@/src/utils/termPayments';
import type { PaymentRow } from '@/src/types/api';

type ChangePlanPaymentSummaryProps = {
  payments: PaymentRow[] | undefined;
  termStart: string | undefined;
  pendingAmount: number;
};

export function ChangePlanPaymentSummary({
  payments,
  termStart,
  pendingAmount,
}: ChangePlanPaymentSummaryProps) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const termPayments = paymentsForCurrentTerm(payments, termStart);
  const alreadyCollected = sumPaymentAmounts(termPayments);
  const pending = Number.isFinite(pendingAmount) && pendingAmount > 0 ? pendingAmount : 0;
  const totalAfter = alreadyCollected + pending;

  const styles = useThemedStyles((colors) => ({
    card: {
      marginTop: 16,
      marginBottom: 8,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    title: {
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.4,
      color: colors.muted,
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      paddingVertical: 6,
      gap: 12,
    },
    rowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rowLeft: { flex: 1 },
    rowLabel: { fontSize: 14, fontWeight: '500' as const, color: colors.text },
    rowMeta: { marginTop: 2, fontSize: 12, color: colors.dim },
    rowAmount: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
    totalRow: { marginTop: 4, paddingTop: 10 },
    totalLabel: { fontSize: 14, fontWeight: '700' as const, color: colors.text },
    totalAmount: { fontSize: 16, fontWeight: '700' as const, color: colors.accentText },
    note: { marginTop: 10, fontSize: 12, lineHeight: 17, color: colors.dim },
    empty: { fontSize: 13, color: colors.dim, marginBottom: 4 },
  }));

  if (!termStart) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('forms.termPaymentSummaryTitle')}</Text>

      {termPayments.length === 0 ? (
        <Text style={styles.empty}>{t('forms.termPaymentSummaryEmpty')}</Text>
      ) : (
        termPayments.map((p) => (
          <View key={p.id} style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>{t(paymentSourceKey(p.source))}</Text>
              <Text style={styles.rowMeta}>{formatDisplayDate(p.date)}</Text>
            </View>
            <Text style={styles.rowAmount}>{Number(p.amount).toLocaleString()} ETB</Text>
          </View>
        ))
      )}

      <View style={[styles.row, styles.rowBorder]}>
        <Text style={styles.rowLabel}>{t('forms.termPaymentAlreadyCollected')}</Text>
        <Text style={styles.rowAmount}>{alreadyCollected.toLocaleString()} ETB</Text>
      </View>

      {pending > 0 ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('forms.termPaymentThisChange')}</Text>
          <Text style={[styles.rowAmount, { color: c.success }]}>+{pending.toLocaleString()} ETB</Text>
        </View>
      ) : null}

      <View style={[styles.row, styles.totalRow, styles.rowBorder]}>
        <Text style={styles.totalLabel}>{t('forms.termPaymentTotalAfter')}</Text>
        <Text style={styles.totalAmount}>{totalAfter.toLocaleString()} ETB</Text>
      </View>

      <Text style={styles.note}>{t('forms.termPaymentRevenueNote')}</Text>
    </View>
  );
}
