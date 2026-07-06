import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { NotificationsSheet } from '@/src/components/NotificationsSheet';
import { useTheme } from '@/src/context/PreferencesContext';
import { useNotificationInbox } from '@/src/notifications/NotificationInboxContext';
import { initialsFrom } from '@/src/utils/userDisplay';
import { useAuth } from '@/src/auth/AuthContext';

/** Bell + profile avatar for the top-right header (matches web). */
export function AppHeaderRight({ leading }: { leading?: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const { unread } = useNotificationInbox();
  const { colors: c } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <>
      <View style={styles.row}>
        {leading}
        <Pressable style={styles.bellBtn} onPress={() => setNotificationsOpen(true)}>
          <Ionicons name="notifications-outline" size={24} color={c.muted} />
          {unread > 0 ? (
            <View style={[styles.badge, { backgroundColor: c.error }]}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable style={styles.avatarBtn} onPress={() => router.push('/account')}>
          <View style={[styles.avatar, { backgroundColor: c.accent }]}>
            <Text style={styles.avatarText}>
              {initialsFrom(user?.name, user?.email, user?.username)}
            </Text>
          </View>
        </Pressable>
      </View>

      <NotificationsSheet visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginRight: 8, gap: 4 },
  avatarBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bellBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
