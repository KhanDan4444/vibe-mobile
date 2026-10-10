import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import { useAuthThemeForced } from '@/src/context/AuthThemeContext';
import { AUTH, authFieldRing } from '@/src/theme/authChrome';
import { FIELD_MIN_HEIGHT, fieldRingStyle } from '@/src/theme/fieldChrome';
import { scaleLineHeight, scaleMinHeight } from '@/src/theme/typography';
import { ethiopianNationalDigits } from '@/src/utils/phone';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'go' | 'send' | 'default';
  blurOnSubmit?: boolean;
  error?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Split Ethiopian mobile: fixed +251 box + national digits (9… or 7…).
 * Parent value may be E.164, 09…/07…, or bare national digits.
 */
export const EthiopianPhoneField = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  Props
>(function EthiopianPhoneField(
  {
    value,
    onChangeText,
    onBlur,
    onSubmitEditing,
    returnKeyType,
    blurOnSubmit,
    error,
    disabled,
    style,
  },
  ref
) {
  const { colors: c } = useTheme();
  const authSurface = useAuthThemeForced();
  const [focused, setFocused] = React.useState(false);
  const national = ethiopianNationalDigits(value);
  const fieldMinHeight = authSurface ? scaleMinHeight(50) : scaleMinHeight(FIELD_MIN_HEIGHT);
  const authInputLineHeight = scaleLineHeight(22);

  const shellBase = [
    styles.shell,
    { minHeight: fieldMinHeight },
    authSurface
      ? { backgroundColor: AUTH.fieldBg, paddingHorizontal: 12 }
      : {
          backgroundColor: disabled ? c.inputBg : c.card,
          opacity: disabled ? 0.65 : 1,
          paddingHorizontal: 14,
        },
  ];

  const ring = authSurface
    ? authFieldRing({ focused, error, disabled })
    : fieldRingStyle(c, { focused, error, disabled });

  const handleChange = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, 9);
    if (!next) {
      onChangeText('');
      return;
    }
    onChangeText(`0${next}`);
  };

  return (
    <View style={[styles.row, style]}>
      <View
        style={[shellBase, ring, styles.prefix, { justifyContent: 'center' }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          latin
          style={[
            styles.prefixText,
            { color: authSurface ? AUTH.textDim : c.muted },
            authSurface ? { fontWeight: '500' } : null,
          ]}
        >
          +251
        </Text>
      </View>
      <View style={[shellBase, ring, styles.national]}>
        <TextInput
          ref={ref}
          latin
          style={[
            styles.inputText,
            { color: authSurface ? AUTH.text : c.text },
            authSurface ? { fontWeight: '400', letterSpacing: 0.1, lineHeight: authInputLineHeight } : null,
          ]}
          value={national}
          onChangeText={handleChange}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={9}
          editable={!disabled}
          selectionColor={authSurface ? AUTH.selection : c.fieldFocus}
          onFocus={() => {
            if (disabled) return;
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  shell: {
    borderRadius: 12,
    justifyContent: 'center',
  },
  prefix: {
    width: 88,
    alignItems: 'center',
  },
  prefixText: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  national: {
    flex: 1,
    minWidth: 0,
  },
  inputText: {
    fontSize: 16,
    paddingVertical: 0,
    margin: 0,
  },
});
