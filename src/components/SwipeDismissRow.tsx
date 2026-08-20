import { useCallback, useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';

const DISMISS_THRESHOLD = 72;
const VELOCITY_THRESHOLD = 0.7;

export function SwipeDismissRow({
  children,
  label,
  onDismiss,
}: {
  children: React.ReactNode;
  label: string;
  onDismiss: () => void;
}) {
  const { colors: c } = useTheme();
  const translateX = useSharedValue(0);
  const committed = useRef(false);

  const fireDismiss = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }, [onDismiss]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderMove: (_, g) => {
          if (g.dx < 0) translateX.value = Math.max(g.dx, -140);
        },
        onPanResponderRelease: (_, g) => {
          if (
            (g.dx < -DISMISS_THRESHOLD || g.vx < -VELOCITY_THRESHOLD) &&
            !committed.current
          ) {
            committed.current = true;
            translateX.value = withTiming(-420, { duration: 180 }, () => {
              runOnJS(fireDismiss)();
            });
            return;
          }
          translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
        },
        onPanResponderTerminate: () => {
          translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
        },
      }),
    [fireDismiss, translateX],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.clip}>
      <View style={[styles.behind, { backgroundColor: c.errorSolid }]}>
        <Text style={styles.behindLabel}>{label}</Text>
      </View>
      <Animated.View style={animatedStyle} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  behind: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 18,
  },
  behindLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
