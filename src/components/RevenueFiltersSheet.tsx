import { View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { DateField } from '@/src/components/DateField';
import { PrimaryButton } from '@/src/components/ui/Button';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { boundsForCustomRangeFrom, boundsForCustomRangeTo } from '@/src/utils/datePickerBounds';
import { PAYMENT_METHODS, paymentMethodLabelKey } from '@/src/constants/payments';
import { REVENUE_SORT_OPTIONS, type RevenueSortId } from '@/src/utils/listSort';

type MethodFilter = 'All methods' | (typeof PAYMENT_METHODS)[number];

type Props = {
  visible: boolean;
  onClose: () => void;
  sort: RevenueSortId;
  onSortChange: (sort: RevenueSortId) => void;
  methodFilter: MethodFilter;
  onMethodChange: (method: MethodFilter) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  useCustomRange: boolean;
  onUseCustomRange: (v: boolean) => void;
};

export function RevenueFiltersSheet({
  visible,
  onClose,
  sort,
  onSortChange,
  methodFilter,
  onMethodChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  useCustomRange,
  onUseCustomRange,
}: Props) {
  const { t } = useTranslation();
  const fromBounds = boundsForCustomRangeFrom(customTo);
  const toBounds = boundsForCustomRangeTo(customFrom);
  const styles = useThemedStyles((c) => ({
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: c.dim,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginBottom: 10,
      marginTop: 8,
    },
    optionGroup: { marginBottom: 8 },
    dateRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 8, marginTop: 4 },
    doneBtn: { marginTop: 4 },
  }));

  return (
    <BottomSheet
      visible={visible}
      title={t('revenue.filters')}
      onClose={onClose}
      showCloseButton
      footer={<PrimaryButton label={t('common.done')} onPress={onClose} style={styles.doneBtn} />}
    >
      <Text style={styles.sectionLabel}>{t('revenue.sortLabel')}</Text>
      <View style={styles.optionGroup}>
        {REVENUE_SORT_OPTIONS.map((opt) => (
          <SheetOption
            key={opt.id}
            label={t(opt.labelKey)}
            selected={sort === opt.id}
            onPress={() => onSortChange(opt.id)}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t('revenue.paymentMethodLabel')}</Text>
      <View style={styles.optionGroup}>
        {(['All methods', ...PAYMENT_METHODS] as const).map((method) => (
          <SheetOption
            key={method}
            label={
              method === 'All methods'
                ? t('revenue.allMethods')
                : t(paymentMethodLabelKey(method)!)
            }
            selected={methodFilter === method}
            onPress={() => onMethodChange(method)}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t('revenue.customDateRange')}</Text>
      <SheetOption
        label={useCustomRange ? t('revenue.customRangeOn') : t('revenue.useCustomRange')}
        selected={useCustomRange}
        onPress={() => onUseCustomRange(!useCustomRange)}
      />
      {useCustomRange ? (
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <DateField
              value={customFrom}
              onChange={onCustomFromChange}
              maximumDate={fromBounds.maximumDate}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              value={customTo}
              onChange={onCustomToChange}
              minimumDate={toBounds.minimumDate}
              maximumDate={toBounds.maximumDate}
            />
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}
