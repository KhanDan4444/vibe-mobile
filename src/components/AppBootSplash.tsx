import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';

const APP_ICON = require('@/assets/images/icon.png');

/**
 * Must stay pixel-identical to the native splash in app.json (expo-splash-screen):
 * same icon, same width, same background — otherwise the handoff reads as two splashes.
 */
export const BOOT_SPLASH_BG_DARK = '#000508';
export const BOOT_SPLASH_BG_LIGHT = '#000508';
const BOOT_SPLASH_ICON_WIDTH = 180;

export function AppBootSplash() {
  useEffect(() => {
    SplashScreen.setOptions({ duration: 0, fade: false });
    void SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.root} accessibilityLabel="Loading">
      <Image source={APP_ICON} style={styles.icon} resizeMode="contain" />
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
