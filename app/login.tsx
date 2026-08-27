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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text, AppTextInput as TextInput } from '@/src/components/AppText';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { AuthFormEnter } from '@/src/components/AuthFormEnter';
import { AuthScreen } from '@/src/components/AuthScreen';
import { LoginBrandPanel } from '@/src/components/LoginBrandPanel';
import { useBootSplash } from '@/src/context/BootSplashContext';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { AUTH, authFieldRing } from '@/src/theme/authChrome';
import { elevationStyle } from '@/src/theme/elevation';
import { springs } from '@/src/theme/motion';
import { radiusMd } from '@/src/theme/tokens';
import { userFacingApiMessage } from '@/src/utils/apiErrorMessage';
import { hasGymPortalAccess, isPlatformAdmin } from '@/src/utils/roles';
import { API_BASE_URL } from '@/src/config/api';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Field = 'identifier' | 'password';

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

  const pressed = useSharedValue(0);

  // Safety net if the hero image never fires onLoad (cached / edge cases).
  useEffect(() => {
    const timer = setTimeout(dismissBootSplash, 900);
    return () => clearTimeout(timer);
  }, [dismissBootSplash]);

  const buttonAnim = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.02 }],
  }));

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
            <View style={[s.form, { maxWidth: formMaxWidth }]}>
              <AuthFormEnter delay={40}>
                <LoginBrandPanel />
              </AuthFormEnter>

              <AuthFormEnter delay={120}>
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

                <View style={[s.inputShell, authFieldRing({ focused: focused === 'identifier' })]}>
                  <Ionicons
                    name="person-outline"
                    size={isTablet ? 22 : 20}
                    color="rgba(94, 234, 212, 0.72)"
                    style={s.fieldIcon}
                  />
                  <TextInput
                    latin={identifierLatin}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    keyboardType="default"
                    returnKeyType="next"
                    value={identifier}
                    onChangeText={setIdentifier}
                    onFocus={() => setFocused('identifier')}
                    onBlur={() => setFocused(null)}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    style={s.inputField}
                    placeholder={t('auth.identifier')}
                    placeholderTextColor={AUTH.placeholder}
                    accessibilityLabel={t('auth.identifier')}
                    selectionColor={AUTH.selection}
                    cursorColor={AUTH.text}
                  />
                </View>

                <View
                  style={[
                    s.inputShell,
                    s.inputShellTight,
                    authFieldRing({ focused: focused === 'password' }),
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={isTablet ? 22 : 20}
                    color="rgba(94, 234, 212, 0.72)"
                    style={s.fieldIcon}
                  />
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
                    style={s.inputField}
                    placeholder={t('auth.password')}
                    placeholderTextColor={AUTH.placeholder}
                    accessibilityLabel={t('auth.password')}
                    selectionColor={AUTH.selection}
                    cursorColor={AUTH.text}
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
                      color={focused === 'password' ? AUTH.link : AUTH.textDim}
                    />
                  </Pressable>
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
                      color={rememberMe ? AUTH.link : AUTH.textDim}
                    />
                    <Text style={[s.rememberText, { color: AUTH.textMuted }]}>
                      {t('auth.rememberMe')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={s.forgotLinkInline}
                    hitSlop={8}
                    onPress={() => router.push('/forgot-password' as never)}
                  >
                    <Text style={[s.linkText, { color: AUTH.link }]}>{t('auth.forgotPassword')}</Text>
                  </Pressable>
                </View>

                <AnimatedPressable
                  style={[
                    s.button,
                    buttonAnim,
                    elevationStyle('raised', theme),
                    { backgroundColor: AUTH.cta, shadowColor: AUTH.cta },
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
                  <Text style={[s.registerPrompt, { color: AUTH.textMuted }]}>
                    {t('auth.newGymOwner')}{' '}
                  </Text>
                  <Pressable hitSlop={8} onPress={() => router.push('/register-gym' as never)}>
                    <Text style={[s.linkText, { color: AUTH.link }]}>{t('auth.registerGym')}</Text>
                  </Pressable>
                </View>

                {__DEV__ ? (
                  <Text style={[s.hint, { color: AUTH.textDim }]}>API: {API_BASE_URL}</Text>
                ) : null}
              </AuthFormEnter>
            </View>
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
    paddingVertical: 24,
  },
  form: {
    width: '100%',
    paddingHorizontal: 4,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AUTH.fieldBg,
    borderRadius: radiusMd,
    minHeight: 50,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputShellTight: {
    marginBottom: 10,
  },
  fieldIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    minHeight: 48,
    textAlignVertical: 'center',
    color: AUTH.text,
    letterSpacing: 0.1,
  },
  eyeButton: {
    paddingLeft: 10,
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
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.35 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  rememberHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rememberText: { fontSize: 13, fontWeight: '500', letterSpacing: 0.1 },
  forgotLinkInline: { flexShrink: 0 },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 24,
  },
  registerPrompt: { fontSize: 13, fontWeight: '400', letterSpacing: 0.1 },
  linkText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.15 },
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
    paddingVertical: 36,
  },
  form: {
    width: '100%',
    paddingHorizontal: 8,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AUTH.fieldBg,
    borderRadius: radiusMd,
    minHeight: 54,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  inputShellTight: {
    marginBottom: 12,
  },
  fieldIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
    minHeight: 52,
    textAlignVertical: 'center',
    color: AUTH.text,
    letterSpacing: 0.1,
  },
  eyeButton: {
    paddingLeft: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  button: {
    borderRadius: radiusMd,
    paddingVertical: 16,
    minHeight: 54,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.35 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  rememberHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rememberText: { fontSize: 14, fontWeight: '500', letterSpacing: 0.1 },
  forgotLinkInline: { flexShrink: 0 },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 26,
  },
  registerPrompt: { fontSize: 14, fontWeight: '400', letterSpacing: 0.1 },
  linkText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.15 },
  error: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusMd,
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
