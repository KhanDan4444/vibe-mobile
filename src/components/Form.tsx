import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text, AppTextInput as TextInput } from '@/src/components/AppText';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import type { ThemeColors } from '@/src/theme/tokens';
import { appTextStyle } from '@/src/theme/typography';
import { dismissKeyboard } from '@/src/utils/dismissKeyboard';

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
 */
export function Screen({ children }: { children: React.ReactNode }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingBottom: Math.max(insets.bottom, 8) + 20 }}>
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
    // Clear of keyboard accessory / nav-bar shadow above the safe-area pad on Screen.
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
    onSubmitEditing?: () => void;
    returnKeyType?: 'done' | 'next' | 'go' | 'send' | 'default';
    blurOnSubmit?: boolean;
    error?: boolean;
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
    onSubmitEditing,
    returnKeyType,
    blurOnSubmit,
    error,
  },
  ref
) {
  const { colors: c } = useTheme();
  return (
    <TextInput
      ref={ref}
      style={[
        formStyles.input,
        {
          backgroundColor: c.inputBg,
          borderColor: error ? c.error : c.inputBorder,
          color: c.text,
        },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.dim}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? 'sentences'}
      autoCorrect={false}
      onBlur={onBlur}
      onSubmitEditing={onSubmitEditing}
      returnKeyType={returnKeyType}
      blurOnSubmit={blurOnSubmit}
    />
  );
});

export function ErrorBanner({ message }: { message: string }) {
  const { colors: c } = useTheme();
  if (!message) return null;
  return (
    <Text
      style={[
        formStyles.error,
        { color: c.error, backgroundColor: c.errorBg, borderColor: 'rgba(244,63,94,0.4)' },
      ]}
    >
      {message}
    </Text>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { colors: c } = useTheme();
  return (
    <Pressable
      style={[formStyles.button, { backgroundColor: c.accent }, (loading || disabled) && formStyles.buttonDisabled]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>{label}</Text>}
    </Pressable>
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
          <Pressable
            key={opt}
            style={[
              formStyles.chip,
              { borderColor: c.border, backgroundColor: c.card },
              active && { borderColor: c.accentText, backgroundColor: c.accentSoft },
            ]}
            onPress={() => onChange(opt)}
          >
            <Text
              style={appTextStyle(language, {
                ...formStyles.chipText,
                color: active ? c.accentText : c.muted,
              })}
            >
              {opt}
            </Text>
          </Pressable>
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
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  error: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: { fontSize: 13 },
});
