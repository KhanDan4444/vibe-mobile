import { useState } from 'react';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { PickerTrigger } from '@/src/components/PickerTrigger';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

type SortOption = { id: string; label?: string; labelKey?: string };

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
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  const styles = useThemedStyles(() => ({
    btnText: { fontSize: 13, fontWeight: '600' as const },
  }));

  const resolve = (opt: SortOption | undefined) => {
    if (!opt) return label;
    if (opt.labelKey) return t(opt.labelKey);
    return opt.label ?? label;
  };

  const current = resolve(options.find((o) => o.id === value));

  return (
    <>
      <PickerTrigger size="compact" open={open} onPress={() => setOpen(true)}>
        <Text style={[styles.btnText, { color: c.accentText }]}>{current}</Text>
      </PickerTrigger>

      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.map((opt) => (
          <SheetOption
            key={opt.id}
            label={resolve(opt)}
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
