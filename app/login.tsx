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
import { ApiError } from '@/src/api/client';
import { AuthScreen } from '@/src/components/AuthScreen';
import { LoginBrandPanel } from '@/src/components/LoginBrandPanel';
import { useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { hasGymPortalAccess, isPlatformAdmin } from '@/src/utils/roles';
import { API_BASE_URL } from '@/src/config/api';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Field = 'identifier' | 'password';

export default function LoginScreen() {
  const { login, logout } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { formMaxWidth, pagePadding, isTablet } = useResponsiveLayout();
  const s = isTablet ? tabletStyles : phoneStyles;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<Field | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<RNTextInput>(null);

  const enter = useSharedValue(0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
  }, [enter]);

  const cardAnim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 18 }],
  }));

  const buttonAnim = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.02 }],
  }));

  const fieldColors = (field: Field) => ({
    backgroundColor: focused === field ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.07)',
    borderColor: focused === field ? 'rgba(45, 212, 191, 0.55)' : 'rgba(255, 255, 255, 0.14)',
  });

  const handleSubmit = async () => {
    setError('');
    if (!identifier.trim() || !password) {
      setError(t('auth.identifierRequired'));
      return;
    }
    setLoading(true);
    try {
      const user = await login(identifier, password, true);
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
      setError(err instanceof ApiError ? err.message : t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen hero>
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
                <Text style={[s.error, { color: c.error, backgroundColor: c.errorBg, borderColor: 'rgba(244,63,94,0.4)' }]}>
                  {error}
                </Text>
              ) : null}

              <View style={[s.inputShell, fieldColors('identifier')]}>
                <TextInput
                  latin
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
                  placeholderTextColor="rgba(226, 232, 240, 0.45)"
                  accessibilityLabel={t('auth.identifier')}
                />
              </View>

              <View style={[s.inputShell, s.inputShellTight, fieldColors('password')]}>
                <TextInput
                  latin
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
                  placeholderTextColor="rgba(226, 232, 240, 0.45)"
                  accessibilityLabel={t('auth.password')}
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
                    color={focused === 'password' ? c.accentText : 'rgba(226, 232, 240, 0.45)'}
                  />
                </Pressable>
              </View>

              <Pressable style={s.forgotLink} hitSlop={8} onPress={() => router.push('/forgot-password' as never)}>
                <Text style={[s.linkText, { color: c.accentText }]}>{t('auth.forgotPassword')}</Text>
              </Pressable>

              <AnimatedPressable
                style={[
                  s.button,
                  buttonAnim,
                  { backgroundColor: c.accent, shadowColor: c.accent },
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                onPressIn={() => {
                  pressed.value = withSpring(1, { damping: 18, stiffness: 260 });
                }}
                onPressOut={() => {
                  pressed.value = withSpring(0, { damping: 18, stiffness: 260 });
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
                <Text style={[s.registerPrompt, { color: 'rgba(226, 232, 240, 0.72)' }]}>
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
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputShellTight: {
    marginBottom: 8,
  },
  inputField: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  eyeButton: {
    paddingLeft: 10,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
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
    borderWidth: 1,
    borderRadius: 14,
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
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  inputShellTight: {
    marginBottom: 10,
  },
  inputField: {
    flex: 1,
    paddingVertical: 17,
    fontSize: 17,
  },
  eyeButton: {
    paddingLeft: 12,
  },
  button: {
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 6,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 5,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
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
    borderWidth: 1,
    borderRadius: 16,
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
