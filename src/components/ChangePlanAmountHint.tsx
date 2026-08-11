import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { formatDisplayDate } from '@/src/utils/date';
import type { ChangePlanAmountHint as ChangePlanAmountHintData } from '@/src/utils/changePlan';

function formatMoney(n: number) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

type ChangePlanAmountHintProps = {
  upgradeHint: ChangePlanAmountHintData | null;
  amountEdited: boolean;
  selectedPlanName?: string | null;
  currentPlanName?: string | null;
  endDate?: string | null;
  onUseSuggested: () => void;
};

/** Scannable amount hint: bold suggested total + muted one-line explanation (matches web). */
export function ChangePlanAmountHint({
  upgradeHint,
  amountEdited,
  selectedPlanName,
  currentPlanName,
  endDate,
  onUseSuggested,
}: ChangePlanAmountHintProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles((colors) => ({
    wrap: { marginTop: 8, gap: 4 },
    suggested: { color: colors.text, fontSize: 14, fontWeight: '600' as const },
    detail: { color: colors.muted, fontSize: 13, lineHeight: 18 },
    adjust: { color: colors.dim, fontSize: 12, lineHeight: 17 },
    useSuggested: { color: colors.accentText, fontSize: 13, fontWeight: '600' as const, marginTop: 4 },
  }));

  if (!upgradeHint) {
    return <Text style={styles.detail}>{t('forms.amountCollectedHint')}</Text>;
  }

  const planFallback = selectedPlanName ?? t('forms.newPlanFallback');
  const currentName = currentPlanName ?? '—';
  let detail: string;
  if (upgradeHint.freshTerm) {
    detail = t('forms.suggestedFreshTermDetail', {
      planName: planFallback,
      paidThrough: formatDisplayDate(endDate),
    });
  } else if (upgradeHint.prePayment) {
    detail = t('forms.suggestedPrePaymentDetail', { planName: planFallback });
  } else if (upgradeHint.isDowngrade) {
    detail = t('forms.suggestedDowngradeDetail', {
      endDate: formatDisplayDate(endDate),
      planName: currentName,
    });
  } else {
    detail = t('forms.suggestedUpgradeDetail', {
      credit: formatMoney(upgradeHint.credit),
      days: upgradeHint.remainingDays,
      dayLabel: t(upgradeHint.remainingDays === 1 ? 'forms.day' : 'forms.days'),
      planName: currentName,
    });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.suggested}>
        {t('forms.suggestedAmountOnly', { amount: formatMoney(upgradeHint.suggestedAmount) })}
      </Text>
      <Text style={styles.detail}>{detail}</Text>
      {!amountEdited && !upgradeHint.isDowngrade ? (
        <Text style={styles.adjust}>{t('forms.upgradeAdjust')}</Text>
      ) : null}
      {amountEdited ? (
        <Pressable onPress={onUseSuggested} accessibilityRole="button">
          <Text style={styles.useSuggested}>
            {t('forms.useSuggestedAmount', { amount: formatMoney(upgradeHint.suggestedAmount) })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
