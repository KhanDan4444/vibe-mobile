import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { elevationStyle } from '@/src/theme/elevation';
import { radiusMd } from '@/src/theme/tokens';

export function SubscriptionLockout() {
  const { logout, gymName, subscription } = useAuth();
  const { colors: c, theme } = useTheme();
  const { t } = useTranslation();
  const displayName = subscription?.gymName || gymName;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <SoftSurface variant="panel" style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: c.errorBg }, elevationStyle('soft', theme)]}>
          <Ionicons name="alert-circle-outline" size={34} color={c.error} />
        </View>
        <Text display style={[styles.title, { color: c.text }]}>{t('lockout.title')}</Text>
        {displayName ? <Text style={[styles.gym, { color: c.muted }]}>{displayName}</Text> : null}
        <Text style={[styles.body, { color: c.dim }]}>{t('lockout.body')}</Text>
        <Pressable
          style={[styles.button, { backgroundColor: c.accent }, elevationStyle('soft', theme)]}
          onPress={() => void logout()}
        >
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.buttonText}>{t('lockout.signOut')}</Text>
        </Pressable>
      </SoftSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center', letterSpacing: -0.3 },
  gym: { marginTop: 8, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  body: { marginTop: 10, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radiusMd,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
