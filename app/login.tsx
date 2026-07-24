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
    backgroundColor: c.inputBg,
    borderColor: focused === field ? c.accentText : c.inputBorder,
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
            <Animated.View
              style={[
                s.card,
                cardAnim,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                  maxWidth: formMaxWidth,
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                },
              ]}
            >
              <LoginBrandPanel />

              {error ? (
                <Text style={[s.error, { color: c.error, backgroundColor: c.errorBg, borderColor: 'rgba(244,63,94,0.4)' }]}>
                  {error}
                </Text>
              ) : null}

              <Text style={[s.label, { color: c.muted }]}>{t('auth.identifier')}</Text>
              <View style={[s.inputShell, fieldColors('identifier')]}>
                <TextInput
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
                  style={[s.inputField, { color: c.text }]}
                  placeholder="owner@gym.com"
                  placeholderTextColor={c.dim}
                />
              </View>

              <Text style={[s.label, { color: c.muted }]}>{t('auth.password')}</Text>
              <View style={[s.inputShell, s.inputShellTight, fieldColors('password')]}>
                <TextInput
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
                  style={[s.inputField, { color: c.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={c.dim}
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
                    color={c.muted}
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
                <Text style={[s.registerPrompt, { color: c.muted }]}>{t('auth.newGymOwner')} </Text>
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
  card: {
    width: '100%',
    borderRadius: 18,
    padding: 22,
    paddingTop: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 7,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inputShellTight: {
    marginBottom: 8,
  },
  inputField: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
  },
  eyeButton: {
    paddingLeft: 10,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 14 },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 18,
  },
  registerPrompt: { fontSize: 13 },
  linkText: { fontSize: 13, fontWeight: '700' },
  error: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
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
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 32,
    paddingTop: 32,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  inputShellTight: {
    marginBottom: 10,
  },
  inputField: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  eyeButton: {
    paddingLeft: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 5,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 16 },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  registerPrompt: { fontSize: 14 },
  linkText: { fontSize: 14, fontWeight: '700' },
  error: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  hint: {
    marginTop: 18,
    fontSize: 11,
    textAlign: 'center',
  },
});
