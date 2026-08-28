import { View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { metricDisplayStyle } from '@/src/theme/typography';
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
      marginTop: 12,
      marginBottom: 6,
      padding: 14,
    },
    title: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      paddingVertical: 5,
      gap: 12,
    },
    rowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rowLeft: { flex: 1 },
    rowLabel: { fontSize: 14, fontWeight: '500' as const, color: colors.text },
    rowMeta: { marginTop: 2, fontSize: 12, color: colors.dim },
    rowAmount: { fontSize: 14, color: colors.text },
    totalRow: { marginTop: 4, paddingTop: 10 },
    totalLabel: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
    totalAmount: { fontSize: 16, letterSpacing: -0.2, color: colors.accentText },
    note: { marginTop: 8, fontSize: 12, lineHeight: 16, color: colors.dim },
    empty: { fontSize: 13, color: colors.dim, marginBottom: 4 },
  }));

  if (!termStart) return null;

  return (
    <SoftSurface variant="panel" style={styles.card}>
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
            <Text latin display style={metricDisplayStyle(styles.rowAmount)}>
              {Number(p.amount).toLocaleString()} ETB
            </Text>
          </View>
        ))
      )}

      <View style={[styles.row, styles.rowBorder]}>
        <Text style={styles.rowLabel}>{t('forms.termPaymentAlreadyCollected')}</Text>
        <Text latin display style={metricDisplayStyle(styles.rowAmount)}>
          {alreadyCollected.toLocaleString()} ETB
        </Text>
      </View>

      {pending > 0 ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('forms.termPaymentThisChange')}</Text>
          <Text latin display style={metricDisplayStyle({ ...styles.rowAmount, color: c.success })}>
            +{pending.toLocaleString()} ETB
          </Text>
        </View>
      ) : null}

      <View style={[styles.row, styles.totalRow, styles.rowBorder]}>
        <Text style={styles.totalLabel}>{t('forms.termPaymentTotalAfter')}</Text>
        <Text latin display style={metricDisplayStyle(styles.totalAmount)}>
          {totalAfter.toLocaleString()} ETB
        </Text>
      </View>

      <Text style={styles.note}>{t('forms.termPaymentRevenueNote')}</Text>
    </SoftSurface>
  );
}
