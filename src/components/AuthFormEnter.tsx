import { useEffect, type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  children: ReactNode;
  /** Stagger delay before fade begins (ms). */
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Soft opacity enter for auth forms — no vertical slide (avoids shake on dark hero).
 */
export function AuthFormEnter({ children, delay = 0, style }: Props) {
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withDelay(
      delay,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, enter]);

  const anim = useAnimatedStyle(() => ({
    opacity: enter.value,
  }));

  return <Animated.View style={[styles.root, anim, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { width: '100%' },
});
