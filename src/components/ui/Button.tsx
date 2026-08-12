import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import { springs } from '@/src/theme/motion';
import { radiusMd } from '@/src/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonProps = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Primary only — solid error fill for delete / confirm-destructive. */
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
};

function AppButton({
  label,
  onPress,
  loading,
  disabled,
  destructive,
  style,
  variant,
}: ButtonProps & { variant: 'primary' | 'secondary' }) {
  const { colors: c } = useTheme();
  const idle = Boolean(disabled && !loading);
  const busy = Boolean(loading);
  const primary = variant === 'primary';
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const setPressed = (down: boolean) => {
    if (busy || idle) return;
    scale.value = withSpring(down ? 0.97 : 1, springs.press);
  };

  const primaryBg = idle ? c.border : destructive ? c.error : c.accent;
  const primaryFg = idle ? c.muted : '#ffffff';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        if (Platform.OS !== 'web') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      android_ripple={null}
      style={[
        animStyle,
        styles.base,
        primary
          ? {
              backgroundColor: primaryBg,
              borderWidth: 0,
            }
          : {
              backgroundColor: 'transparent',
              borderColor: c.accentText,
              borderWidth: 1.5,
              opacity: idle ? 0.55 : 1,
            },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? primaryFg : c.accentText} />
      ) : (
        <Text style={[styles.label, { color: primary ? primaryFg : c.accentText }]}>{label}</Text>
      )}
    </AnimatedPressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
