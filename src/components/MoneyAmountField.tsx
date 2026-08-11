import React from 'react';
import { AppText as Text, AppTextInput as TextInput } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { fieldChrome } from '@/src/theme/fieldChrome';
import { CURRENCY_CODE } from '@/src/utils/formatMoney';

function useMoneyBorder(opts: { error?: boolean; focused?: boolean; disabled?: boolean }) {
  const { colors: c } = useTheme();
  if (opts.error) return c.error;
  if (opts.disabled) return c.inputBorder;
  if (opts.focused) return c.accentText;
  return c.inputBorder;
}

/**
 * Amount input with a trailing currency suffix (matches web MoneyAmountInput).
 */
export const MoneyAmountField = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  {
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    error?: boolean;
    disabled?: boolean;
    onBlur?: () => void;
    onFocus?: () => void;
    onSubmitEditing?: () => void;
    returnKeyType?: 'done' | 'next' | 'go' | 'send' | 'default';
  }
>(function MoneyAmountField(
  {
    value,
    onChangeText,
    placeholder = '0',
    error,
    disabled,
    onBlur,
    onFocus,
    onSubmitEditing,
    returnKeyType,
  },
  ref,
) {
  const { colors: c } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const borderColor = useMoneyBorder({ error, focused, disabled });

  return (
    <SoftSurface
      variant="quiet"
      flat={!focused || Boolean(disabled)}
      style={[
        fieldChrome.inputShell,
        {
          backgroundColor: disabled ? c.card : c.inputBg,
          borderColor,
          opacity: disabled ? 0.65 : 1,
        },
      ]}
    >
      <TextInput
        ref={ref}
        latin
        style={[fieldChrome.inputText, { color: c.text, paddingRight: 4 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.dim}
        selectionColor={c.accentText}
        keyboardType="decimal-pad"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        onFocus={() => {
          if (disabled) return;
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        accessibilityLabel={CURRENCY_CODE}
      />
      <Text style={[fieldChrome.affixText, { color: c.dim }]}>{CURRENCY_CODE}</Text>
    </SoftSurface>
  );
});
