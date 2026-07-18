import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '@/src/components/AppText';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import type { ThemeColors } from '@/src/theme/tokens';
import { appTextStyle } from '@/src/theme/typography';

/** @deprecated Use useTheme().colors in new code. */
export const colors = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  muted: '#94a3b8',
  dim: '#64748b',
  accent: '#2dd4bf',
  error: '#fda4af',
  errorBg: 'rgba(244,63,94,0.15)',
};

export function Screen({ children }: { children: React.ReactNode }) {
  const { colors: c } = useTheme();
  return <View style={{ flex: 1, backgroundColor: c.bg }}>{children}</View>;
}

export function Label({ children }: { children: string }) {
  const { colors: c } = useTheme();
  return <Text style={[formStyles.label, { color: c.muted }]}>{children}</Text>;
}

export function Field({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'decimal-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  const { colors: c } = useTheme();
  return (
    <TextInput
      style={[
        formStyles.input,
        { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={c.dim}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? 'sentences'}
      autoCorrect={false}
    />
  );
}

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
