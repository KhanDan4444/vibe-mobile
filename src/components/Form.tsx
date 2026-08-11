import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text, AppTextInput as TextInput } from '@/src/components/AppText';
import { PrimaryButton as UiPrimaryButton } from '@/src/components/ui/Button';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { fieldChrome } from '@/src/theme/fieldChrome';
import { radiusMd } from '@/src/theme/tokens';
import type { ThemeColors } from '@/src/theme/tokens';
import { appTextStyle } from '@/src/theme/typography';
import { dismissKeyboard } from '@/src/utils/dismissKeyboard';

export { SecondaryButton } from '@/src/components/ui/Button';
export { MoneyAmountField } from '@/src/components/MoneyAmountField';
export { FIELD_MIN_HEIGHT, FIELD_RADIUS, fieldChrome } from '@/src/theme/fieldChrome';

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
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={dismissKeyboard}
    >
      <View style={{ width: '100%', maxWidth: formMaxWidth }}>{children}</View>
    </ScrollView>
  );
}

export function Label({ children }: { children: string }) {
  const { colors: c } = useTheme();
  return <Text style={[formStyles.label, { color: c.muted }]}>{children}</Text>;
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
  if (opts.focused) return c.accentText;
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
  const [focused, setFocused] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);
  const showToggle = Boolean(secureTextEntry);
  const borderColor = useFieldBorderColor({ error, focused, disabled });

  return (
    <SoftSurface
      variant="quiet"
      flat={!focused || Boolean(disabled)}
      style={[
        formStyles.inputShell,
        {
          backgroundColor: disabled ? c.card : c.inputBg,
          borderColor,
          opacity: disabled ? 0.65 : 1,
        },
        style,
      ]}
    >
      <TextInput
        ref={ref}
        latin={latin}
        style={[formStyles.inputText, { color: c.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.dim}
        selectionColor={c.accentText}
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
            color={focused ? c.accentText : c.muted}
          />
        </Pressable>
      ) : null}
    </SoftSurface>
  );
});

export function ErrorBanner({ message }: { message: string }) {
  const { colors: c } = useTheme();
  if (!message) return null;
  return (
    <SoftSurface
      flat
      style={[
        formStyles.error,
        { backgroundColor: c.errorBg, borderColor: 'rgba(244,63,94,0.35)' },
      ]}
    >
      <Text style={{ color: c.error, fontSize: 14 }}>{message}</Text>
    </SoftSurface>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <UiPrimaryButton
      label={label}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
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
  const { colors: c } = useTheme();
  const { language } = usePreferences();
  return (
    <View style={formStyles.chipRow}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <SoftSurface
            key={opt}
            flat={!active}
            onPress={() => onChange(opt)}
            style={[
              formStyles.chip,
              active && { borderColor: c.accentText, backgroundColor: c.accentSoft },
            ]}
          >
            <Text
              style={appTextStyle(language, {
                ...formStyles.chipText,
                color: active ? c.accentText : c.muted,
              })}
            >
              {opt}
            </Text>
          </SoftSurface>
        );
      })}
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
