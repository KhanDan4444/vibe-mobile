import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

export type FilterOption<T extends string = string> = {
  value: T;
  label: string;
  color?: string;
};

export function FilterPickerButton<T extends string>({
  label,
  options,
  value,
  onChange,
  sheetTitle,
}: {
  label: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  sheetTitle?: string;
}) {
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const styles = useThemedStyles((colors) => ({
    btn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.card,
      minHeight: 48,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    label: { flex: 1, fontSize: 14, fontWeight: '600' as const, color: colors.text },
  }));

  return (
    <View>
      <Pressable style={styles.btn} onPress={() => setOpen(true)} accessibilityRole="button">
        {selected?.color ? <View style={[styles.dot, { backgroundColor: selected.color }]} /> : null}
        <Text style={styles.label} numberOfLines={1}>
          {selected?.label ?? label}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.muted} />
      </Pressable>

      <BottomSheet visible={open} title={sheetTitle ?? label} onClose={() => setOpen(false)}>
        {options.map((opt) => (
          <SheetOption
            key={opt.value}
            label={opt.label}
            selected={opt.value === value}
            onPress={() => {
              onChange(opt.value);
              setOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </View>
  );
}
