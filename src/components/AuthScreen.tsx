import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthThemeProvider } from '@/src/context/AuthThemeContext';
import { colorsForTheme } from '@/src/theme/tokens';
import { AuthHeroBackground } from './AuthHeroBackground';
import { AuthLanguageButton, AUTH_LANG_BTN_SIZE } from './AuthLanguageButton';

type Props = {
  children: React.ReactNode;
  /** Teal→slate hero (default on for premium auth surfaces). */
  hero?: boolean;
  onHeroReady?: () => void;
  /** Top-right language control (default on for all auth routes). */
  showLanguage?: boolean;
  /**
   * Centered top-bar content (e.g. AuthStepDots). Kept screen-centered by
   * balancing against the language control width.
   */
  headerCenter?: ReactNode;
};

/**
 * Auth routes always render dark — matches web AuthScreen and the in-app default.
 * Does not overwrite the user's saved light/dark preference.
 */
export function AuthScreen({
  children,
  hero = true,
  onHeroReady,
  showLanguage = true,
  headerCenter,
}: Props) {
  const insets = useSafeAreaInsets();
  const pad = { paddingBottom: Math.max(insets.bottom, 8) + 20 };
  const showTopBar = showLanguage || Boolean(headerCenter);

  const topBar = showTopBar ? (
    <View
      style={[
        styles.topBar,
        {
          paddingTop: Math.max(insets.top, 8) + 2,
          paddingHorizontal: 16,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Balance the language button so headerCenter stays visually centered */}
      <View style={styles.topBarSide} pointerEvents="none" />
      <View style={styles.topBarCenter} pointerEvents="box-none">
        {headerCenter}
      </View>
      <View style={[styles.topBarSide, styles.topBarEnd]}>
        {showLanguage ? <AuthLanguageButton inline /> : null}
      </View>
    </View>
  ) : null;

  const body = hero ? (
    <AuthHeroBackground onReady={onHeroReady}>
      {topBar}
      <View style={[styles.flex, pad]}>{children}</View>
    </AuthHeroBackground>
  ) : (
    <View style={[styles.flex, { backgroundColor: colorsForTheme('dark').bg }, pad]}>
      {topBar}
      <View style={styles.flex}>{children}</View>
    </View>
  );

  return (
    <AuthThemeProvider>
      <View style={styles.flex}>{body}</View>
    </AuthThemeProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: AUTH_LANG_BTN_SIZE + 8,
    paddingBottom: 6,
  },
  topBarSide: {
    width: AUTH_LANG_BTN_SIZE,
  },
  topBarEnd: {
    alignItems: 'flex-end',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
