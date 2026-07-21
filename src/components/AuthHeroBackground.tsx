import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const DARK_STOPS = [
  <Stop key="0" offset="0%" stopColor="#134e4a" stopOpacity={0.55} />,
  <Stop key="45" offset="45%" stopColor="#0f172a" stopOpacity={1} />,
  <Stop key="100" offset="100%" stopColor="#0f172a" stopOpacity={1} />,
];

/** Login-only hero: dark brand gradient (auth is always dark). */
export function AuthHeroBackground({ children, style }: Props) {
  return (
    <View style={[styles.root, style]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="authBg" x1="0%" y1="0%" x2="100%" y2="100%">
            {DARK_STOPS}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#authBg)" />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
