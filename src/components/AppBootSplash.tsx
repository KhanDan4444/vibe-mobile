import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/context/PreferencesContext';
import { darkTheme } from '@/src/theme/tokens';

const APP_ICON = require('@/assets/images/splash-icon-round.png');

/** Native splash backgrounds — keep in sync with app.json expo-splash-screen. */
export const BOOT_SPLASH_BG_DARK = darkTheme.bg; // #0f172a — app dark appearance
export const BOOT_SPLASH_BG_LIGHT = '#ffffff';

const ICON_SIZE = 96;

/** Branded boot screen — centered round app icon on light or dark theme bg. */
export function AppBootSplash() {
  const { isDark } = useTheme();
  const backgroundColor = isDark ? BOOT_SPLASH_BG_DARK : BOOT_SPLASH_BG_LIGHT;

  return (
    <View style={[styles.root, { backgroundColor }]} accessibilityLabel="Loading">
      <View style={styles.iconClip}>
        <Image source={APP_ICON} style={styles.icon} resizeMode="cover" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconClip: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    overflow: 'hidden',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
});
