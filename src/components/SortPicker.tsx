import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

type SortOption = { id: string; label: string };

export function SortPicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly SortOption[];
  value: T;
  onChange: (id: T) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const styles = useThemedStyles((c) => ({
    btn: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      minHeight: 48,
      justifyContent: 'center' as const,
    },
    btnText: { color: c.accentText, fontSize: 14, fontWeight: '600' as const },
  }));

  const current = options.find((o) => o.id === value)?.label ?? label;

  return (
    <>
      <Pressable style={styles.btn} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={styles.btnText}>{current}</Text>
      </Pressable>

      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((opt) => (
          <SheetOption
            key={opt.id}
            label={opt.label}
            selected={opt.id === value}
            onPress={() => {
              onChange(opt.id as T);
              setOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </>
  );
}
