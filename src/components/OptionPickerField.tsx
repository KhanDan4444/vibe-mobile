import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { useTheme } from '@/src/context/PreferencesContext';
import { formStyles } from '@/src/components/Form';

export type PickerOption<T extends string = string> = {
  value: T;
  label: string;
};

export function OptionPickerField<T extends string>({
  label,
  placeholder,
  options,
  value,
  onChange,
  sheetTitle,
}: {
  label?: string;
  placeholder: string;
  options: PickerOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  sheetTitle?: string;
}) {
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder;

  return (
    <View>
      {label ? <Text style={[formStyles.label, { color: c.muted }]}>{label}</Text> : null}
      <Pressable
        style={[
          formStyles.input,
          {
            backgroundColor: c.inputBg,
            borderColor: c.inputBorder,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 48,
          },
        ]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
      >
        <Text style={{ color: selected ? c.text : c.dim, fontSize: 16, flex: 1 }} numberOfLines={1}>
          {display}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.muted} />
      </Pressable>

      <BottomSheet visible={open} title={sheetTitle ?? label ?? placeholder} onClose={() => setOpen(false)}>
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
