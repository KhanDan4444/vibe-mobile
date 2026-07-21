import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

export default function LoginScreen() {
  const { login, logout } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { formMaxWidth, pagePadding } = useResponsiveLayout();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          contentContainerStyle={[styles.scroll, { paddingHorizontal: pagePadding }]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.wrap}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                  maxWidth: formMaxWidth,
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                },
              ]}
            >
              <View style={[styles.cardAccent, { backgroundColor: c.accent }]} />
              <LoginBrandPanel />
              <Text style={[styles.subtitle, { color: c.muted }]}>{t('auth.subtitle')}</Text>

              {error ? (
                <Text style={[styles.error, { color: c.error, backgroundColor: c.errorBg, borderColor: 'rgba(244,63,94,0.4)' }]}>
                  {error}
                </Text>
              ) : null}

              <Text style={[styles.label, { color: c.muted }]}>{t('auth.identifier')}</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                value={identifier}
                onChangeText={setIdentifier}
                style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                placeholder="owner@gym.com"
                placeholderTextColor={c.dim}
              />

              <Text style={[styles.label, { color: c.muted }]}>{t('auth.password')}</Text>
              <TextInput
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={[styles.input, styles.inputTight, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }]}
                placeholder="••••••••"
                placeholderTextColor={c.dim}
              />

              <Pressable style={styles.forgotLink} onPress={() => router.push('/forgot-password' as never)}>
                <Text style={[styles.linkText, { color: c.accent }]}>{t('auth.forgotPassword')}</Text>
              </Pressable>

              <Pressable
                style={[styles.button, { backgroundColor: c.accent }, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t('auth.signIn')}</Text>
                )}
              </Pressable>

              <View style={styles.registerRow}>
                <Text style={[styles.registerPrompt, { color: c.muted }]}>{t('auth.newGymOwner')} </Text>
                <Pressable onPress={() => router.push('/register-gym' as never)}>
                  <Text style={[styles.linkText, { color: c.accent }]}>{t('auth.registerGym')}</Text>
                </Pressable>
              </View>

              {__DEV__ ? (
                <Text style={[styles.hint, { color: c.dim }]}>API: {API_BASE_URL}</Text>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    paddingTop: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 28,
    elevation: 6,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  subtitle: {
    marginTop: -8,
    marginBottom: 24,
    fontSize: 14,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  inputTight: {
    marginBottom: 8,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 12 },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  registerPrompt: { fontSize: 14 },
  linkText: { fontSize: 14, fontWeight: '700' },
  error: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  hint: {
    marginTop: 20,
    fontSize: 11,
    textAlign: 'center',
  },
});
