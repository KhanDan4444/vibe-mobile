import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Soft circular mark — must match app.json expo-splash-screen image. */
const SPLASH_ICON = require('@/assets/images/splash-icon.png');

export const BOOT_SPLASH_BG_DARK = '#000508';
export const BOOT_SPLASH_BG_LIGHT = '#000508';
const BOOT_SPLASH_ICON_WIDTH = 160;
const RING_SIZE = BOOT_SPLASH_ICON_WIDTH * 1.1;

type Props = {
  /** When false, keep the system splash up (used only for the very first paint). */
  releaseNative?: boolean;
};

export function AppBootSplash({ releaseNative = true }: Props) {
  // Starts at 1 so the native → JS handoff is pixel-stable, then breathes gently.
  const breathe = useSharedValue(1);
  const glow = useSharedValue(0);
  // Repeating 0→1 phase drives the halo pulse and the heartbeat ring.
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!releaseNative) return;
    SplashScreen.setOptions({ duration: 0, fade: false });
    void SplashScreen.hideAsync();
  }, [releaseNative]);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1.025, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    glow.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    // Small delay so the ring emerges just after the field lights up.
    pulse.value = withDelay(
      450,
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [breathe, glow, pulse]);

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  // Halo fades in, then breathes with the icon for a living glow.
  const glowAnim = useAnimatedStyle(() => ({
    opacity: glow.value * interpolate(breathe.value, [1, 1.025], [0.82, 1]),
  }));

  // One soft ring that expands outward and fades — a gentle heartbeat.
  const ringAnim = useAnimatedStyle(() => ({
    opacity: glow.value * interpolate(pulse.value, [0, 0.15, 1], [0, 0.38, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.7, 1.9]) }],
  }));

  return (
    <View style={styles.root} accessibilityLabel="Loading">
      {/* Soft teal ambience so the field reads as brand-dark, not flat black */}
      <Animated.View style={[StyleSheet.absoluteFill, glowAnim]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            {/* Same diagonal teal field as the web/mobile login background. */}
            <LinearGradient id="loginBridge" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#134e4a" stopOpacity={0.55} />
              <Stop offset="45%" stopColor="#0f172a" stopOpacity={1} />
              <Stop offset="100%" stopColor="#0f172a" stopOpacity={1} />
            </LinearGradient>
            <RadialGradient id="bootGlow" cx="50%" cy="50%" r="58%">
              <Stop offset="0%" stopColor="#14b8a6" stopOpacity={0.16} />
              <Stop offset="45%" stopColor="#0f766e" stopOpacity={0.05} />
              <Stop offset="100%" stopColor="#000508" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="#13161c" />
          <Rect width="100%" height="100%" fill="url(#loginBridge)" />
          <Rect width="100%" height="100%" fill="url(#bootGlow)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.ring, ringAnim]} pointerEvents="none" />
      <Animated.View style={iconAnim}>
        <Image source={SPLASH_ICON} style={styles.icon} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BOOT_SPLASH_BG_DARK,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(45, 212, 191, 0.68)',
  },
  icon: {
    width: BOOT_SPLASH_ICON_WIDTH,
    height: BOOT_SPLASH_ICON_WIDTH,
  },
});
