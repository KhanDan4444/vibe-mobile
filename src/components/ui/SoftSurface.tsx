import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/src/context/PreferencesContext';
import { elevationStyle } from '@/src/theme/elevation';
import { springs } from '@/src/theme/motion';
import { radiusLg, radiusMd } from '@/src/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type SoftSurfaceVariant = 'row' | 'panel' | 'group' | 'quiet';

type SoftSurfaceProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** row = list cards, panel = summary blocks, group = settings clusters, quiet = nested */
  variant?: SoftSurfaceVariant;
  /** Disable elevation (rare). */
  flat?: boolean;
  onPress?: () => void;
  accessibilityRole?: 'button' | 'link' | 'none';
  accessibilityLabel?: string;
};

function elevationFor(variant: SoftSurfaceVariant) {
  if (variant === 'panel' || variant === 'group') return 'raised' as const;
  return 'soft' as const;
}

function radiusFor(variant: SoftSurfaceVariant) {
  if (variant === 'quiet') return radiusMd;
  return radiusLg;
}

/**
 * Shared soft surface — use for list rows, settings groups, and summary panels
 * so every screen inherits the same comfortable depth language.
 */
export function SoftSurface({
  children,
  style,
  variant = 'row',
  flat = false,
  onPress,
  accessibilityRole,
  accessibilityLabel,
}: SoftSurfaceProps) {
  const { colors: c, theme } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const surfaceStyle: ViewStyle = {
    backgroundColor: variant === 'quiet' ? c.inputBg : c.card,
    borderColor: variant === 'quiet' ? c.border : c.cardEdge,
    borderRadius: radiusFor(variant),
    borderWidth: StyleSheet.hairlineWidth,
    // Quiet = form/nested chrome — never SoftSurface elevation (avoids field "halo").
    ...(flat || variant === 'quiet' ? {} : elevationStyle(elevationFor(variant), theme)),
  };

  if (onPress) {
    return (
      <AnimatedPressable
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.982, springs.press);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, springs.press);
        }}
        style={[animStyle, surfaceStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={[surfaceStyle, style]}>{children}</View>;
}
