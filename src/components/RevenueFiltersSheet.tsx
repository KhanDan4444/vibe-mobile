import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateField } from '@/src/components/DateField';
import { PAYMENT_METHODS } from '@/src/constants/payments';
import { REVENUE_SORT_OPTIONS, type RevenueSortId } from '@/src/utils/listSort';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { useTheme } from '@/src/context/PreferencesContext';

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
  onExport?: () => void;
  exporting?: boolean;
  canExport?: boolean;
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
  onExport,
  exporting,
  canExport,
}: Props) {
  const { colors: c } = useTheme();
  const styles = useThemedStyles((c) => ({
    overlay: { flex: 1, justifyContent: 'flex-end' as const },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingBottom: 28,
      maxHeight: '85%',
    },
    handle: {
      alignSelf: 'center' as const,
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginTop: 10,
      marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: '700' as const, color: c.text, marginBottom: 16 },
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
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    optionActive: { borderColor: c.accentText, backgroundColor: c.accentSoft },
    optionText: { fontSize: 15, color: c.muted },
    optionTextActive: { color: c.accentText, fontWeight: '600' as const },
    toggle: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 10,
    },
    toggleActive: { borderColor: c.accentText, backgroundColor: c.accentSoft },
    toggleText: { fontSize: 15, color: c.muted },
    dateRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 8 },
    dateInput: {
      flex: 1,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: c.text,
      fontSize: 14,
    },
    exportBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    exportText: { color: c.accentText, fontSize: 15, fontWeight: '600' as const },
    doneBtn: {
      marginTop: 16,
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    doneText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Filters</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Sort</Text>
            <View style={styles.optionGroup}>
              {REVENUE_SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.option, sort === opt.id && styles.optionActive]}
                  onPress={() => onSortChange(opt.id)}
                >
                  <Text style={[styles.optionText, sort === opt.id && styles.optionTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Payment method</Text>
            <View style={styles.optionGroup}>
              {(['All methods', ...PAYMENT_METHODS] as const).map((method) => (
                <Pressable
                  key={method}
                  style={[styles.option, methodFilter === method && styles.optionActive]}
                  onPress={() => onMethodChange(method)}
                >
                  <Text style={[styles.optionText, methodFilter === method && styles.optionTextActive]}>{method}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Custom date range</Text>
            <Pressable
              style={[styles.toggle, useCustomRange && styles.toggleActive]}
              onPress={() => onUseCustomRange(!useCustomRange)}
            >
              <Text style={styles.toggleText}>{useCustomRange ? 'Custom range on' : 'Use custom range'}</Text>
            </Pressable>
            {useCustomRange ? (
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <DateField value={customFrom} onChange={onCustomFromChange} />
                </View>
                <View style={{ flex: 1 }}>
                  <DateField value={customTo} onChange={onCustomToChange} />
                </View>
              </View>
            ) : null}

            {canExport && onExport ? (
              <Pressable style={styles.exportBtn} onPress={onExport} disabled={exporting}>
                <Ionicons name="share-outline" size={18} color={styles.exportText.color} />
                <Text style={styles.exportText}>{exporting ? 'Preparing…' : 'Share CSV'}</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
