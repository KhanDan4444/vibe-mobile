import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import { radiusMd } from '@/src/theme/tokens';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

function AppButton({
  label,
  onPress,
  loading,
  disabled,
  style,
  variant,
}: ButtonProps & { variant: 'primary' | 'secondary' }) {
  const { colors: c } = useTheme();
  const idle = Boolean(disabled && !loading);
  const busy = Boolean(loading);
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      android_ripple={{ color: 'transparent' }}
      style={({ pressed }) => {
        const active = pressed && !busy && !idle;
        return [
          styles.base,
          primary
            ? {
                backgroundColor: c.accent,
                borderColor: c.accent,
                opacity: idle ? 0.55 : active ? 0.88 : 1,
              }
            : {
                backgroundColor: active ? c.accentSoft : 'transparent',
                borderColor: c.accentText,
                opacity: idle ? 0.55 : active ? 0.92 : 1,
              },
          style,
        ];
      }}
    >
      {busy ? (
        <ActivityIndicator color={primary ? '#fff' : c.accentText} />
      ) : (
        <Text style={[styles.label, { color: primary ? '#fff' : c.accentText }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return <AppButton {...props} variant="primary" />;
}

export function SecondaryButton(props: ButtonProps) {
  return <AppButton {...props} variant="secondary" />;
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radiusMd,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
