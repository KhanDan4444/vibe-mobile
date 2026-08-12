import { useState } from 'react';
import { View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { PickerTrigger } from '@/src/components/PickerTrigger';
import { useTheme } from '@/src/context/PreferencesContext';
import { FieldError, Label } from '@/src/components/Form';
import { dismissKeyboard } from '@/src/utils/dismissKeyboard';

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
  error,
  errorMessage,
  required,
}: {
  label?: string;
  placeholder: string;
  options: PickerOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  sheetTitle?: string;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
}) {
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder;
  const showError = Boolean(error || errorMessage);

  return (
    <View>
      {label ? <Label required={required}>{label}</Label> : null}
      <PickerTrigger
        open={open}
        error={showError}
        onPress={() => {
          setOpen(true);
          dismissKeyboard();
        }}
      >
        <Text style={{ color: selected ? c.text : c.dim, fontSize: 16, flex: 1 }} numberOfLines={1}>
          {display}
        </Text>
      </PickerTrigger>
      <FieldError message={errorMessage} />

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
