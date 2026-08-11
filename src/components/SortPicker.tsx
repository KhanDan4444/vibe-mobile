import { useState } from 'react';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
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
  const [open, setOpen] = useState(false);
  const styles = useThemedStyles((c) => ({
    btn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignSelf: 'flex-start' as const,
      justifyContent: 'center' as const,
    },
    btnText: { color: c.accentText, fontSize: 13, fontWeight: '600' as const },
  }));

  const resolve = (opt: SortOption | undefined) => {
    if (!opt) return label;
    if (opt.labelKey) return t(opt.labelKey);
    return opt.label ?? label;
  };

  const current = resolve(options.find((o) => o.id === value));

  return (
    <>
      <SoftSurface onPress={() => setOpen(true)} style={styles.btn} accessibilityRole="button">
        <Text style={styles.btnText}>{current}</Text>
      </SoftSurface>

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
