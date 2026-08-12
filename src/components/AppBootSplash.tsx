import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Soft circular mark — must match app.json expo-splash-screen image. */
const SPLASH_ICON = require('@/assets/images/splash-icon.png');

export const BOOT_SPLASH_BG_DARK = '#000508';
export const BOOT_SPLASH_BG_LIGHT = '#000508';
const BOOT_SPLASH_ICON_WIDTH = 160;
const RING_SIZE = BOOT_SPLASH_ICON_WIDTH * 1.1;

/** Exit: fade only — scaling the full-screen overlay made the next screen feel like it shook. */
export const BOOT_SPLASH_EXIT_MS = 320;

export function bootSplashExiting() {
  'worklet';
  const easing = Easing.out(Easing.cubic);
  return {
    initialValues: {
      opacity: 1,
    },
    animations: {
      opacity: withTiming(0, { duration: BOOT_SPLASH_EXIT_MS, easing }),
    },
  };
}

type Props = {
  /** When false, keep the system splash up (used only for the very first paint). */
  releaseNative?: boolean;
};

export function AppBootSplash({ releaseNative = true }: Props) {
  const { t } = useTranslation();
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
    // A few living cycles, then settle — avoids feeling like an infinite loader on slow boots.
    breathe.value = withSequence(
      withRepeat(
        withTiming(1.025, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        4,
        true,
      ),
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    glow.value = withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) });
    // Tighter heartbeat; stop after three rings and hold the calm mark.
    pulse.value = withDelay(
      320,
      withRepeat(withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }), 3, false),
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
    opacity: glow.value * interpolate(pulse.value, [0, 0.18, 1], [0, 0.38, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.72, 1.75]) }],
  }));

  return (
    <View style={styles.root} accessibilityLabel={t('common.loading')}>
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
