import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/auth/AuthContext';
import { ResponsiveContent } from '@/src/components/ResponsiveContent';
import { TabScreenFrame } from '@/src/components/TabScreenFrame';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import type { AppLanguage } from '@/src/i18n';
import { initialsFrom, roleSubtitle } from '@/src/utils/userDisplay';
import { hasGymPortalAccess, isGymOwner } from '@/src/utils/roles';

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
  onPress: () => void;
};

function AccountRow({ icon, label, value, danger, onPress }: RowProps) {
  const { colors: c } = useTheme();
  return (
    <Pressable style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={danger ? c.error : c.muted} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { color: danger ? c.error : c.text }]}>{label}</Text>
      {value ? <Text style={[styles.rowValue, { color: c.dim }]}>{value}</Text> : null}
      {!value ? <Ionicons name="chevron-forward" size={18} color={c.dim} /> : null}
    </Pressable>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors: c } = useTheme();
  const { language, setLanguage, cycleTheme, theme } = usePreferences();
  const { t } = useTranslation();
  const { isTablet, pagePadding } = useResponsiveLayout();
  const owner = isGymOwner(user?.role);

  if (!user || !hasGymPortalAccess(user.role)) {
    return <Redirect href="/login" />;
  }

  const displayName = user.name || user.email || user.username || 'User';
  const themeLabel = theme === 'dark' ? t('profile.themeDark') : t('profile.themeLight');
  const langLabel = language === 'am' ? t('profile.amharic') : t('profile.english');

  const toggleLanguage = () => {
    const next: AppLanguage = language === 'en' ? 'am' : 'en';
    void setLanguage(next);
  };

  const handleLogout = () => {
    void logout();
  };

  return (
    <TabScreenFrame>
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <ResponsiveContent style={{ paddingHorizontal: pagePadding }}>
      <View style={[styles.profileCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.avatar, { backgroundColor: c.accent }]}>
          <Text style={styles.avatarText}>{initialsFrom(user.name, user.email, user.username)}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.meta, { color: c.muted }]} numberOfLines={1}>
            {user.username || user.email}
          </Text>
          <Text style={[styles.role, { color: c.dim }]}>{roleSubtitle(user.role)}</Text>
        </View>
      </View>

      <View style={[styles.menuGrid, isTablet && styles.menuGridTablet]}>
        <View style={isTablet ? styles.menuColumn : undefined}>
          <Text style={[styles.section, { color: c.dim }]}>{t('account.preferences')}</Text>
          <AccountRow icon={theme === 'dark' ? 'moon-outline' : 'sunny-outline'} label={t('profile.appearance')} value={themeLabel} onPress={cycleTheme} />
          <AccountRow icon="language-outline" label={t('profile.language')} value={langLabel} onPress={toggleLanguage} />
        </View>

        <View style={isTablet ? styles.menuColumn : undefined}>
          <Text style={[styles.section, { color: c.dim }]}>{t('account.security')}</Text>
          {owner ? (
            <AccountRow icon="storefront-outline" label={t('profile.gymProfile')} onPress={() => router.push('/profile')} />
          ) : null}
          <AccountRow icon="key-outline" label={t('profile.changePassword')} onPress={() => router.push('/change-password')} />

          <Text style={[styles.section, { color: c.dim }]}>{t('account.session')}</Text>
          <AccountRow icon="log-out-outline" label={t('profile.signOut')} danger onPress={handleLogout} />
        </View>
      </View>
      </ResponsiveContent>
    </ScrollView>
    </TabScreenFrame>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 22,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  profileText: { flex: 1 },
  name: { fontSize: 18, fontWeight: '800' },
  meta: { marginTop: 3, fontSize: 13 },
  role: { marginTop: 4, fontSize: 12, fontWeight: '600' },
  section: { marginTop: 10, marginBottom: 8, paddingHorizontal: 4, fontSize: 13, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  rowIcon: { marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  rowValue: { fontSize: 13, fontWeight: '700' },
  menuGrid: { gap: 0 },
  menuGridTablet: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  menuColumn: { flex: 1, minWidth: 280 },
});
