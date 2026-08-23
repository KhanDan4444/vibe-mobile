import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/src/context/PreferencesContext';

/**
 * Frosted tab chrome — blur + translucent tint so the bar reads as material, not a flat slab.
 */
export function AppTabBarBackground() {
  const { colors: c, isDark } = useTheme();

  return (
    <View style={styles.root} pointerEvents="none">
      <BlurView
        intensity={isDark ? 42 : 64}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? 'rgba(22, 25, 32, 0.62)' : 'rgba(255, 255, 255, 0.68)',
          },
        ]}
      />
      <View style={[styles.edge, { backgroundColor: c.tabBarBorder }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});
