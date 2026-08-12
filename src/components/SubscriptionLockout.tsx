import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { PrimaryButton } from '@/src/components/ui/Button';
import { useTheme } from '@/src/context/PreferencesContext';

export function SubscriptionLockout() {
  const { logout, gymName, subscription } = useAuth();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const displayName = subscription?.gymName || gymName;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <SoftSurface variant="panel" style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: c.errorBg }]}>
          <Ionicons name="alert-circle-outline" size={34} color={c.error} />
        </View>
        <Text display style={[styles.title, { color: c.text }]}>
          {t('lockout.title')}
        </Text>
        {displayName ? <Text style={[styles.gym, { color: c.muted }]}>{displayName}</Text> : null}
        <Text style={[styles.body, { color: c.dim }]}>{t('lockout.body')}</Text>
        <PrimaryButton label={t('lockout.signOut')} onPress={() => void logout()} style={styles.button} />
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
    elevation: 0,
    shadowOpacity: 0,
  },
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center', letterSpacing: -0.3 },
  gym: { marginTop: 8, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  body: { marginTop: 10, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: {
    marginTop: 24,
    alignSelf: 'stretch',
  },
});
