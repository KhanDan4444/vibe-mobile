import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/context/PreferencesContext';
import { darkTheme } from '@/src/theme/tokens';

const APP_ICON = require('@/assets/images/icon.png');

/** Native splash backgrounds — keep in sync with app.json expo-splash-screen. */
export const BOOT_SPLASH_BG_DARK = darkTheme.bg;
export const BOOT_SPLASH_BG_LIGHT = '#ffffff';

/** Branded boot screen — centered app icon on light or dark (matches system / app theme). */
export function AppBootSplash() {
  const { isDark } = useTheme();
  const backgroundColor = isDark ? BOOT_SPLASH_BG_DARK : BOOT_SPLASH_BG_LIGHT;

  return (
    <View style={[styles.root, { backgroundColor }]} accessibilityLabel="Loading">
      <Image source={APP_ICON} style={styles.icon} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 22,
  },
});
