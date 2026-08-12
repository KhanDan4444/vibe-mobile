import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInput as RNTextInput,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text, AppTextInput as TextInput } from '@/src/components/AppText';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { AuthScreen } from '@/src/components/AuthScreen';
import { LoginBrandPanel } from '@/src/components/LoginBrandPanel';
import { useBootSplash } from '@/src/context/BootSplashContext';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { elevationStyle } from '@/src/theme/elevation';
import { springs } from '@/src/theme/motion';
import { radiusLg, radiusMd } from '@/src/theme/tokens';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { hasGymPortalAccess, isPlatformAdmin } from '@/src/utils/roles';
import { API_BASE_URL } from '@/src/config/api';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Field = 'identifier' | 'password';

/** Focus: teal border only — no inner fill or outer glow. */
const LOGIN_FIELD = {
  shell: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  focusBorder: 'rgba(94, 234, 212, 0.55)',
} as const;

export default function LoginScreen() {
  const { login, logout } = useAuth();
  const { colors: c, theme } = useTheme();
  const { language } = usePreferences();
  const { t } = useTranslation();
  const { dismissBootSplash } = useBootSplash();
  const { formMaxWidth, pagePadding, isTablet } = useResponsiveLayout();
  const s = isTablet ? tabletStyles : phoneStyles;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focused, setFocused] = useState<Field | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<RNTextInput>(null);

  // Amharic placeholders need Ethiopic; typed email/password stay DM Sans.
  const identifierLatin = language !== 'am' || identifier.length > 0;
  const passwordLatin = language !== 'am' || password.length > 0;

  const enter = useSharedValue(0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, [enter]);

  // Safety net if the hero image never fires onLoad (cached / edge cases).
  useEffect(() => {
    const timer = setTimeout(dismissBootSplash, 900);
    return () => clearTimeout(timer);
  }, [dismissBootSplash]);

  const cardAnim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 18 }],
  }));

  const buttonAnim = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.02 }],
  }));

  const fieldShell = (field: Field) => ({
    backgroundColor: LOGIN_FIELD.shell.backgroundColor,
    borderColor: focused === field ? LOGIN_FIELD.focusBorder : LOGIN_FIELD.shell.borderColor,
  });

  const handleSubmit = async () => {
    setError('');
    if (!identifier.trim() || !password) {
      setError(t('auth.identifierRequired'));
      return;
    }
    setLoading(true);
    try {
      const user = await login(identifier, password, rememberMe);
      if (isPlatformAdmin(user.role)) {
        await logout();
        setError(t('auth.adminBlocked'));
        return;
      }
      if (!hasGymPortalAccess(user.role)) {
        setError(t('auth.accessDenied'));
        return;
      }
      router.replace('/(tabs)');
    } catch (err) {
      setError(
        userFacingApiMessage(err, t('auth.connectionFailed'), t('auth.loginFailed'))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen hero onHeroReady={dismissBootSplash}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingHorizontal: pagePadding }]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.wrap}>
            <Animated.View style={[s.form, cardAnim, { maxWidth: formMaxWidth }]}>
              <LoginBrandPanel />

              {error ? (
                <Text
                  style={[
                    s.error,
                    {
                      color: c.error,
                      backgroundColor: c.errorBg,
                      borderColor: 'rgba(244,63,94,0.35)',
                    },
                  ]}
                >
                  {error}
                </Text>
              ) : null}

              <View style={s.inputRing}>
                <View style={[s.inputShell, fieldShell('identifier')]}>
                  <TextInput
                    latin={identifierLatin}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    keyboardType="email-address"
                    returnKeyType="next"
                    value={identifier}
                    onChangeText={setIdentifier}
                    onFocus={() => setFocused('identifier')}
                    onBlur={() => setFocused(null)}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    style={[s.inputField, { color: '#f8fafc' }]}
                    placeholder={t('auth.identifier')}
                    placeholderTextColor="rgba(226, 232, 240, 0.68)"
                    accessibilityLabel={t('auth.identifier')}
                    selectionColor="rgba(94, 234, 212, 0.45)"
                    cursorColor="#f8fafc"
                  />
                </View>
              </View>

              <View style={[s.inputRing, s.inputRingTight]}>
                <View style={[s.inputShell, fieldShell('password')]}>
                  <TextInput
                    latin={passwordLatin}
                    ref={passwordRef}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    returnKeyType="go"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    onSubmitEditing={handleSubmit}
                    style={[s.inputField, { color: '#f8fafc' }]}
                    placeholder={t('auth.password')}
                    placeholderTextColor="rgba(226, 232, 240, 0.68)"
                    accessibilityLabel={t('auth.password')}
                    selectionColor="rgba(94, 234, 212, 0.45)"
                    cursorColor="#f8fafc"
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={12}
                    style={s.eyeButton}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={isTablet ? 22 : 20}
                      color={focused === 'password' ? c.accentText : 'rgba(226, 232, 240, 0.62)'}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={s.rememberRow}>
                <Pressable
                  style={s.rememberHit}
                  onPress={() => setRememberMe((v) => !v)}
                  hitSlop={8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                  accessibilityLabel={t('auth.rememberMe')}
                >
                  <Ionicons
                    name={rememberMe ? 'checkbox' : 'square-outline'}
                    size={isTablet ? 22 : 20}
                    color={rememberMe ? c.accentText : 'rgba(226, 232, 240, 0.62)'}
                  />
                  <Text style={[s.rememberText, { color: 'rgba(226, 232, 240, 0.82)' }]}>
                    {t('auth.rememberMe')}
                  </Text>
                </Pressable>
                <Pressable style={s.forgotLinkInline} hitSlop={8} onPress={() => router.push('/forgot-password' as never)}>
                  <Text style={[s.linkText, { color: c.accentText }]}>{t('auth.forgotPassword')}</Text>
                </Pressable>
              </View>

              <AnimatedPressable
                style={[
                  s.button,
                  buttonAnim,
                  elevationStyle('raised', theme),
                  { backgroundColor: c.accent, shadowColor: c.accent },
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                onPressIn={() => {
                  pressed.value = withSpring(1, springs.press);
                }}
                onPressOut={() => {
                  pressed.value = withSpring(0, springs.press);
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.buttonText}>{t('auth.signIn')}</Text>
                )}
              </AnimatedPressable>

              <View style={s.registerRow}>
                <Text style={[s.registerPrompt, { color: 'rgba(226, 232, 240, 0.82)' }]}>
                  {t('auth.newGymOwner')}{' '}
                </Text>
                <Pressable hitSlop={8} onPress={() => router.push('/register-gym' as never)}>
                  <Text style={[s.linkText, { color: c.accentText }]}>{t('auth.registerGym')}</Text>
                </Pressable>
              </View>

              {__DEV__ ? (
                <Text style={[s.hint, { color: c.dim }]}>API: {API_BASE_URL}</Text>
              ) : null}
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
});

const phoneStyles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  form: {
    width: '100%',
    paddingHorizontal: 4,
  },
  inputRing: {
    borderRadius: radiusLg,
    marginBottom: 12,
  },
  inputRingTight: {
    marginBottom: 8,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusMd,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
    lineHeight: 20,
    minHeight: 46,
    textAlignVertical: 'center',
  },
  eyeButton: {
    paddingLeft: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  button: {
    borderRadius: radiusMd,
    paddingVertical: 14,
    minHeight: 48,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  rememberHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rememberText: { fontSize: 13, fontWeight: '600' },
  forgotLinkInline: { flexShrink: 0 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 14 },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  registerPrompt: { fontSize: 13 },
  linkText: { fontSize: 13, fontWeight: '700' },
  error: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusMd,
    padding: 12,
    marginBottom: 14,
    fontSize: 13,
  },
  hint: {
    marginTop: 16,
    fontSize: 11,
    textAlign: 'center',
  },
});

const tabletStyles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  form: {
    width: '100%',
    paddingHorizontal: 8,
  },
  inputRing: {
    borderRadius: radiusLg,
    marginBottom: 14,
  },
  inputRingTight: {
    marginBottom: 10,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusMd,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  inputField: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 17,
    lineHeight: 22,
    minHeight: 50,
    textAlignVertical: 'center',
  },
  eyeButton: {
    paddingLeft: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  button: {
    borderRadius: radiusMd,
    paddingVertical: 15,
    minHeight: 52,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  rememberHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rememberText: { fontSize: 14, fontWeight: '600' },
  forgotLinkInline: { flexShrink: 0 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 16 },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 22,
  },
  registerPrompt: { fontSize: 14 },
  linkText: { fontSize: 14, fontWeight: '700' },
  error: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusLg,
    padding: 14,
    marginBottom: 16,
    fontSize: 14,
  },
  hint: {
    marginTop: 18,
    fontSize: 11,
    textAlign: 'center',
  },
});
