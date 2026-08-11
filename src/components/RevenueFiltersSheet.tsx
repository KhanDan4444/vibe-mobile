import { View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/src/components/BottomSheet';
import { DateField } from '@/src/components/DateField';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { elevationStyle } from '@/src/theme/elevation';
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
  const { theme } = useTheme();
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
    optionGroup: { gap: 8, marginBottom: 8 },
    option: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      minHeight: 48,
      justifyContent: 'center' as const,
    },
    optionActive: { borderColor: c.accentText, backgroundColor: c.accentSoft },
    optionText: { fontSize: 15, color: c.muted },
    optionTextActive: { color: c.accentText, fontWeight: '600' as const },
    toggle: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 10,
      minHeight: 48,
      justifyContent: 'center' as const,
    },
    toggleActive: { borderColor: c.accentText, backgroundColor: c.accentSoft },
    toggleText: { fontSize: 15, color: c.muted },
    dateRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 8 },
    doneBtn: {
      marginTop: 4,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 0,
      minHeight: 48,
    },
    doneText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  }));

  return (
    <BottomSheet
      visible={visible}
      title={t('revenue.filters')}
      onClose={onClose}
      showCloseButton
      footer={
        <SoftSurface
          onPress={onClose}
          style={[styles.doneBtn, elevationStyle('soft', theme)]}
          accessibilityRole="button"
        >
          <Text style={styles.doneText}>{t('common.done')}</Text>
        </SoftSurface>
      }
    >
      <Text style={styles.sectionLabel}>{t('revenue.sortLabel')}</Text>
      <View style={styles.optionGroup}>
        {REVENUE_SORT_OPTIONS.map((opt) => (
          <SoftSurface
            key={opt.id}
            onPress={() => onSortChange(opt.id)}
            style={[styles.option, sort === opt.id && styles.optionActive]}
          >
            <Text style={[styles.optionText, sort === opt.id && styles.optionTextActive]}>
              {t(opt.labelKey)}
            </Text>
          </SoftSurface>
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t('revenue.paymentMethodLabel')}</Text>
      <View style={styles.optionGroup}>
        {(['All methods', ...PAYMENT_METHODS] as const).map((method) => (
          <SoftSurface
            key={method}
            onPress={() => onMethodChange(method)}
            style={[styles.option, methodFilter === method && styles.optionActive]}
          >
            <Text style={[styles.optionText, methodFilter === method && styles.optionTextActive]}>
              {method === 'All methods'
                ? t('revenue.allMethods')
                : t(paymentMethodLabelKey(method)!)}
            </Text>
          </SoftSurface>
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t('revenue.customDateRange')}</Text>
      <SoftSurface
        onPress={() => onUseCustomRange(!useCustomRange)}
        style={[styles.toggle, useCustomRange && styles.toggleActive]}
      >
        <Text style={styles.toggleText}>
          {useCustomRange ? t('revenue.customRangeOn') : t('revenue.useCustomRange')}
        </Text>
      </SoftSurface>
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
