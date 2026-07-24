import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';

/** Soft circular mark — must match app.json expo-splash-screen image. */
const SPLASH_ICON = require('@/assets/images/splash-icon.png');

export const BOOT_SPLASH_BG_DARK = '#000508';
export const BOOT_SPLASH_BG_LIGHT = '#000508';
const BOOT_SPLASH_ICON_WIDTH = 160;

export function AppBootSplash() {
  useEffect(() => {
    SplashScreen.setOptions({ duration: 0, fade: false });
    void SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.root} accessibilityLabel="Loading">
      <Image source={SPLASH_ICON} style={styles.icon} resizeMode="contain" />
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
