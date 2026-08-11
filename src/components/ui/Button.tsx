import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import { elevationStyle } from '@/src/theme/elevation';
import { springs } from '@/src/theme/motion';
import { radiusMd } from '@/src/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const { colors: c, theme } = useTheme();
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
      android_ripple={{ color: 'transparent' }}
      style={[
        animStyle,
        styles.base,
        primary
          ? {
              backgroundColor: c.accent,
              borderColor: c.accent,
              opacity: idle ? 0.55 : 1,
              ...(idle ? {} : elevationStyle('soft', theme)),
            }
          : {
              backgroundColor: 'transparent',
              borderColor: c.accentText,
              opacity: idle ? 0.55 : 1,
            },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? '#fff' : c.accentText} />
      ) : (
        <Text style={[styles.label, { color: primary ? '#fff' : c.accentText }]}>{label}</Text>
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
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
