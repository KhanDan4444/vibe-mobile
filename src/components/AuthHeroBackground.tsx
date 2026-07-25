import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** Gym atmosphere only — brand mark/slogan removed so UI text never doubles. */
const LOGIN_BG = require('@/assets/images/login-bg.png');

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Login hero: gym atmosphere as a brand backdrop.
 * Uses a scrubbed asset (no baked-in logo/slogan) so form copy stays clean.
 */
export function AuthHeroBackground({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <Image source={LOGIN_BG} style={styles.scene} resizeMode="cover" />
      <View style={styles.dim} pointerEvents="none" />
      <View style={styles.tealWash} pointerEvents="none" />
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
    backgroundColor: 'rgba(2, 6, 23, 0.28)',
  },
  tealWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 118, 110, 0.08)',
  },
  content: {
    flex: 1,
  },
});
