import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text, AppTextInput as TextInput } from '@/src/components/AppText';
import { PrimaryButton as UiPrimaryButton } from '@/src/components/ui/Button';
import { FilterChip } from '@/src/components/FilterChip';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useAuthThemeForced } from '@/src/context/AuthThemeContext';
import { AUTH, authFieldRing } from '@/src/theme/authChrome';
import { fieldChrome, fieldRingStyle } from '@/src/theme/fieldChrome';
import { radiusMd } from '@/src/theme/tokens';
import type { ThemeColors } from '@/src/theme/tokens';

export { SecondaryButton } from '@/src/components/ui/Button';
export { MoneyAmountField } from '@/src/components/MoneyAmountField';
export { FIELD_MIN_HEIGHT, FIELD_RADIUS, fieldChrome, fieldRingStyle } from '@/src/theme/fieldChrome';

/** @deprecated Use useTheme().colors in new code. */
export const colors = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  muted: '#94a3b8',
  dim: '#64748b',
  accent: '#0f766e',
  error: '#fda4af',
  errorBg: 'rgba(244,63,94,0.15)',
};

/**
 * Form screens — pads the system nav / gesture bar so the primary CTA is not
 * covered by the Android navigation shadow.
 * Pass `flushBottom` when the screen owns a sticky footer that pads the inset itself.
 */
export function Screen({
  children,
  flushBottom = false,
}: {
  children: React.ReactNode;
  flushBottom?: boolean;
}) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        paddingBottom: flushBottom ? 0 : Math.max(insets.bottom, 8) + 20,
      }}
    >
      {children}
    </View>
  );
}

/** Scroll content padding with extra room under the last button / field. */
export function useFormScrollPadding() {
  const { pagePadding } = useResponsiveLayout();
  return {
    paddingHorizontal: pagePadding,
    paddingTop: pagePadding,
    paddingBottom: 56,
    alignItems: 'center' as const,
  };
}

/**
 * ScrollView that centers form fields and caps width on tablet (`formMaxWidth`).
 */
export function FormScroll({
  children,
  contentContainerStyle,
  style,
}: {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  const { formMaxWidth } = useResponsiveLayout();
  const scrollPad = useFormScrollPadding();
  return (
    <ScrollView
      style={style}
      contentContainerStyle={[scrollPad, contentContainerStyle]}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="on-drag"
    >
      <View style={{ width: '100%', maxWidth: formMaxWidth }}>{children}</View>
    </ScrollView>
  );
}

export function Label({ children, required }: { children: string; required?: boolean }) {
  const { colors: c } = useTheme();
  const authSurface = useAuthThemeForced();
  return (
    <Text
      style={[
        formStyles.label,
        { color: authSurface ? AUTH.textMuted : c.muted },
        authSurface ? { letterSpacing: 0.2, fontWeight: '500' } : null,
      ]}
    >
      {children}
      {required ? (
        <Text style={{ color: c.error }} accessibilityLabel="required">
          {' *'}
        </Text>
      ) : null}
    </Text>
  );
}

export function FieldError({ message }: { message?: string }) {
  const { colors: c } = useTheme();
  if (!message) return null;
  return (
    <Text style={[formStyles.fieldError, { color: c.error }]} accessibilityRole="alert">
      {message}
    </Text>
  );
}

export function useFieldBorderColor(opts: {
  error?: boolean;
  focused?: boolean;
  disabled?: boolean;
}): string {
  const { colors: c } = useTheme();
  if (opts.error) return c.error;
  if (opts.disabled) return c.inputBorder;
  if (opts.focused) return c.fieldFocus;
  return c.inputBorder;
}

export const Field = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  {
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'decimal-pad' | 'email-address';
    autoCapitalize?: 'none' | 'sentences' | 'words';
    onBlur?: () => void;
    onFocus?: () => void;
    onSubmitEditing?: () => void;
    returnKeyType?: 'done' | 'next' | 'go' | 'send' | 'default';
    blurOnSubmit?: boolean;
    error?: boolean;
    disabled?: boolean;
    latin?: boolean;
    style?: StyleProp<ViewStyle>;
  }
>(function Field(
  {
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    onBlur,
    onFocus,
    onSubmitEditing,
    returnKeyType,
    blurOnSubmit,
    error,
    disabled,
    latin,
    style,
  },
  ref,
) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const authSurface = useAuthThemeForced();
  const [focused, setFocused] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);
  const showToggle = Boolean(secureTextEntry);
  // ASCII-oriented keyboards / passwords should not use Ethiopic metrics (layout jump on focus).
  // Also force Latin face when the visible placeholder/value is ASCII (e.g. "e.g. Monthly").
  const asciiVisible = /^[\x00-\x7F]*$/.test((value || placeholder || '').trim());
  const useLatin =
    latin ??
    Boolean(
      secureTextEntry ||
        keyboardType === 'phone-pad' ||
        keyboardType === 'numeric' ||
        keyboardType === 'decimal-pad' ||
        keyboardType === 'email-address' ||
        (asciiVisible && Boolean(value || placeholder))
    );

  return (
    <View
      style={[
        formStyles.inputShell,
        authSurface
          ? {
              backgroundColor: AUTH.fieldBg,
              minHeight: 50,
              paddingHorizontal: 16,
            }
          : {
              backgroundColor: disabled ? c.inputBg : c.card,
              opacity: disabled ? 0.65 : 1,
            },
        authSurface
          ? authFieldRing({ focused, error, disabled })
          : fieldRingStyle(c, { focused, error, disabled }),
        style,
      ]}
    >
      <TextInput
        ref={ref}
        latin={useLatin}
        style={[
          formStyles.inputText,
          { color: authSurface ? AUTH.text : c.text },
          authSurface ? { fontWeight: '400', letterSpacing: 0.1, lineHeight: 22 } : null,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={authSurface ? AUTH.placeholder : c.dim}
        selectionColor={authSurface ? AUTH.selection : c.fieldFocus}
        secureTextEntry={secureTextEntry && !revealed}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
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
        blurOnSubmit={blurOnSubmit}
      />
      {showToggle ? (
        <Pressable
          onPress={() => setRevealed((v) => !v)}
          hitSlop={10}
          style={formStyles.affixHit}
          accessibilityRole="button"
          accessibilityLabel={revealed ? t('auth.hidePassword') : t('auth.showPassword')}
          disabled={disabled}
        >
          <Ionicons
            name={revealed ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={focused ? (authSurface ? AUTH.link : c.fieldFocus) : authSurface ? AUTH.textDim : c.muted}
          />
        </Pressable>
      ) : null}
    </View>
  );
});

export function ErrorBanner({ message }: { message: string }) {
  const { colors: c } = useTheme();
  if (!message) return null;
  return (
    <View
      style={[
        formStyles.error,
        { backgroundColor: c.errorBg, borderColor: 'rgba(244,63,94,0.35)' },
      ]}
    >
      <Text style={{ color: c.error, fontSize: 14 }}>{message}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  destructive,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <UiPrimaryButton
      label={label}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      destructive={destructive}
      style={[formStyles.buttonSpacing, style]}
    />
  );
}

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={formStyles.chipRow}>
      {options.map((opt) => (
        <FilterChip
          key={opt}
          label={opt}
          selected={value === opt}
          onPress={() => onChange(opt)}
        />
      ))}
    </View>
  );
}

export function useThemedStyles<T>(factory: (c: ThemeColors) => T): T {
  const { colors: c } = useTheme();
  return factory(c);
}

export const formStyles = StyleSheet.create({
  screen: { flex: 1 },
  label: { ...fieldChrome.label },
  inputShell: { ...fieldChrome.inputShell },
  inputText: { ...fieldChrome.inputText },
  input: { ...fieldChrome.input },
  affixHit: { ...fieldChrome.affixHit },
  affixText: { ...fieldChrome.affixText },
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  error: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusMd,
    padding: 12,
    marginBottom: 12,
  },
  buttonSpacing: {
    marginTop: 24,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radiusMd,
  },
  chipText: { fontSize: 13 },
});
