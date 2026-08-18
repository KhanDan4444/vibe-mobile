import { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';

const DISMISS_THRESHOLD = 72;

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
  const translateX = useRef(new Animated.Value(0)).current;
  const committed = useRef(false);

  useEffect(() => {
    translateX.setValue(0);
    committed.current = false;
  }, [translateX]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dx < -10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx < 0) translateX.setValue(Math.max(gesture.dx, -140));
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldDismiss = gesture.dx < -DISMISS_THRESHOLD || gesture.vx < -0.7;
          if (shouldDismiss && !committed.current) {
            committed.current = true;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Animated.timing(translateX, {
              toValue: -420,
              duration: 180,
              useNativeDriver: true,
            }).start(() => onDismiss());
            return;
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [onDismiss, translateX],
  );

  return (
    <View style={styles.clip}>
      <View style={[styles.behind, { backgroundColor: c.errorSolid }]}>
        <Text style={styles.behindLabel}>{label}</Text>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
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
