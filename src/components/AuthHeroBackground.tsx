import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Fires once the backdrop is ready so boot splash can lift. */
  onReady?: () => void;
};

/**
 * Auth hero: teal → slate gradient (matches web .auth-hero-bg).
 * CSS: linear-gradient(135deg, rgb(19 78 74 / 0.55) 0%, #0f172a 45%, #0f172a 100%)
 */
export function AuthHeroBackground({ children, style, onReady }: Props) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <View style={[styles.root, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id="authHero" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="rgb(19, 78, 74)" stopOpacity={0.55} />
            <Stop offset="45%" stopColor="#0f172a" stopOpacity={1} />
            <Stop offset="100%" stopColor="#0f172a" stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="#13161c" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#authHero)" />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
  },
});
