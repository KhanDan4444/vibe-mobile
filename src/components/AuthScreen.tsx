import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthThemeProvider } from '@/src/context/AuthThemeContext';
import { colorsForTheme } from '@/src/theme/tokens';
import { AuthHeroBackground } from './AuthHeroBackground';

type Props = {
  children: React.ReactNode;
  /** Login uses gym hero; register/forgot use plain dark background. */
  hero?: boolean;
  onHeroReady?: () => void;
};

/**
 * Auth routes always render dark — matches web AuthScreen and the in-app default.
 * Does not overwrite the user's saved light/dark preference.
 */
export function AuthScreen({ children, hero = false, onHeroReady }: Props) {
  const insets = useSafeAreaInsets();
  const pad = { paddingBottom: Math.max(insets.bottom, 8) + 20 };

  const body = hero ? (
    <AuthHeroBackground onReady={onHeroReady}>
      <View style={[styles.flex, pad]}>{children}</View>
    </AuthHeroBackground>
  ) : (
    <View style={[styles.flex, { backgroundColor: colorsForTheme('dark').bg }, pad]}>{children}</View>
  );

  return <AuthThemeProvider>{body}</AuthThemeProvider>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
