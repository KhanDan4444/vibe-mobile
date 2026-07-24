import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';

const SPLASH = require('@/assets/images/splash.png');

/** Native splash backgrounds — keep in sync with app.json expo-splash-screen. */
export const BOOT_SPLASH_BG_DARK = '#000508';
export const BOOT_SPLASH_BG_LIGHT = '#000508';

/** Full-bleed branded splash — gym scene + ንቁ lockup (matches design mockup). */
export function AppBootSplash() {
  useEffect(() => {
    // Swap native (logo-only on Android) for this full-bleed scene ASAP.
    void SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.root} accessibilityLabel="Loading">
      <Image source={SPLASH} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BOOT_SPLASH_BG_DARK,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
