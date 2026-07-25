import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Soft circular mark — must match app.json expo-splash-screen image. */
const SPLASH_ICON = require('@/assets/images/splash-icon.png');

export const BOOT_SPLASH_BG_DARK = '#000508';
export const BOOT_SPLASH_BG_LIGHT = '#000508';
const BOOT_SPLASH_ICON_WIDTH = 160;

type Props = {
  /** When false, keep the system splash up (used only for the very first paint). */
  releaseNative?: boolean;
};

export function AppBootSplash({ releaseNative = true }: Props) {
  // Starts at 1 so the native → JS handoff is pixel-stable, then breathes gently.
  const breathe = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!releaseNative) return;
    SplashScreen.setOptions({ duration: 0, fade: false });
    void SplashScreen.hideAsync();
  }, [releaseNative]);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1.025, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    glow.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [breathe, glow]);

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  const glowAnim = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View style={styles.root} accessibilityLabel="Loading">
      {/* Soft teal ambience so the field reads as brand-dark, not flat black */}
      <Animated.View style={[StyleSheet.absoluteFill, glowAnim]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="bootGlow" cx="50%" cy="50%" r="58%">
              <Stop offset="0%" stopColor="#14b8a6" stopOpacity={0.14} />
              <Stop offset="45%" stopColor="#0f766e" stopOpacity={0.05} />
              <Stop offset="100%" stopColor="#000508" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bootGlow)" />
        </Svg>
      </Animated.View>
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
  icon: {
    width: BOOT_SPLASH_ICON_WIDTH,
    height: BOOT_SPLASH_ICON_WIDTH,
  },
});
