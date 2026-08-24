import { useState } from 'react';
import { View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { PickerTrigger } from '@/src/components/PickerTrigger';
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
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const styles = useThemedStyles((colors) => ({
    dot: { width: 8, height: 8, borderRadius: 4 },
    label: { flex: 1, fontSize: 14, fontWeight: '600' as const, color: colors.accentText },
  }));

  return (
    <View>
      <PickerTrigger open={open} onPress={() => setOpen(true)}>
        {selected?.color ? <View style={[styles.dot, { backgroundColor: selected.color }]} /> : null}
        <Text style={styles.label} numberOfLines={1}>
          {selected?.label ?? label}
        </Text>
      </PickerTrigger>

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
