import { useMemo, useRef } from 'react';
import { PanResponder, View, type ViewProps } from 'react-native';

const SWIPE_DISTANCE = 56;
const SWIPE_VELOCITY = 0.35;
const SWIPE_VERTICAL_LIMIT = 48;

function isHorizontalSwipe(gesture: { dx: number; dy: number; vx: number }) {
  return (
    Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35 &&
    Math.abs(gesture.dy) < SWIPE_VERTICAL_LIMIT &&
    (Math.abs(gesture.dx) > SWIPE_DISTANCE || Math.abs(gesture.vx) > SWIPE_VELOCITY)
  );
}

type TabSwipeShellProps = ViewProps & {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
};

/**
 * Detects horizontal swipes between tabs without moving/scaling the screen.
 * Avoids PanResponder capture so lists, buttons, and the tab bar stay responsive.
 */
export function TabSwipeShell({ children, onSwipeLeft, onSwipeRight, style, ...rest }: TabSwipeShellProps) {
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeLeftRef.current = onSwipeLeft;
  onSwipeRightRef.current = onSwipeRight;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => isHorizontalSwipe(gesture),
        onMoveShouldSetPanResponderCapture: () => false,
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_, gesture) => {
          if (!isHorizontalSwipe(gesture)) return;
          if (gesture.dx < -SWIPE_DISTANCE || gesture.vx < -SWIPE_VELOCITY) {
            onSwipeLeftRef.current?.();
            return;
          }
          if (gesture.dx > SWIPE_DISTANCE || gesture.vx > SWIPE_VELOCITY) {
            onSwipeRightRef.current?.();
          }
        },
      }),
    []
  );

  return (
    <View style={[{ flex: 1 }, style]} {...rest} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
