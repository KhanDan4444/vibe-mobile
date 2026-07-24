import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const GYM_SCENE = require('@/assets/images/splash.png');

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Login hero: gym atmosphere as a brand backdrop.
 * Kept very dark so the form card stays readable and primary.
 */
export function AuthHeroBackground({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <Image source={GYM_SCENE} style={styles.scene} resizeMode="cover" />
      {/* Kill most of the photo brightness so fields stay crisp */}
      <View style={styles.dim} pointerEvents="none" />
      <View style={styles.tealWash} pointerEvents="none" />
      <View style={styles.vignette} pointerEvents="none" />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scene: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
  },
  tealWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 118, 110, 0.18)',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.35)',
  },
  content: {
    flex: 1,
  },
});
