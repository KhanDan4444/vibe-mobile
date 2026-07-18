import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/PreferencesContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useNotificationInbox } from '@/src/notifications/NotificationInboxContext';
import type { DashboardNotification } from '@/src/types/api';
import type { ThemeColors } from '@/src/theme/tokens';
import {
  notificationAction,
  notificationActionLabel,
  notificationActionRoute,
} from '@/src/utils/notificationActions';

function iconForType(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'danger') return 'alert-circle';
  if (type === 'warning') return 'warning';
  return 'information-circle';
}

function colorForType(type: string, c: ThemeColors) {
  if (type === 'danger') return '#f87171';
  if (type === 'warning') return c.warning;
  return c.accentText;
}

function NotificationRow({
  item,
  isRead,
  readOnly,
  colors: c,
  onOpenMember,
  onAction,
  onDismiss,
}: {
  item: DashboardNotification;
  isRead: boolean;
  readOnly: boolean;
  colors: ThemeColors;
  onOpenMember: () => void;
  onAction: () => void;
  onDismiss: () => void;
}) {
  const action = !readOnly ? notificationAction(item) : null;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: c.bg, borderColor: c.border },
        !isRead && { borderColor: c.accentText, backgroundColor: c.accentSoft },
      ]}
    >
      <Pressable style={styles.rowTap} onPress={onOpenMember}>
        <Ionicons
          name={iconForType(item.type)}
          size={22}
          color={colorForType(item.type, c)}
          style={styles.rowIcon}
        />
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: c.text }]}>{item.title}</Text>
          <Text style={[styles.rowMessage, { color: c.muted }]} numberOfLines={3}>
            {item.message}
          </Text>
          {action ? (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: c.accentSoft, borderColor: c.accentText }]}
              onPress={(e) => {
                e.stopPropagation?.();
                onAction();
              }}
            >
              <Text style={[styles.actionText, { color: c.accentText }]}>{notificationActionLabel(action)}</Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
      <Pressable onPress={onDismiss} hitSlop={12} style={styles.dismissBtn}>
        <Ionicons name="close" size={18} color={c.dim} />
      </Pressable>
    </View>
  );
}

export function NotificationsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { readOnly } = useGymReadOnly();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { notifications, unread, isRead, markRead, markAllRead, dismiss, loading } = useNotificationInbox();

  const openMember = (item: DashboardNotification) => {
    markRead(item.id);
    onClose();
    if (item.memberId) router.push(`/member/${item.memberId}`);
  };

  const runAction = (item: DashboardNotification) => {
    const action = notificationAction(item);
    if (!action || !item.memberId) return;
    markRead(item.id);
    onClose();
    router.push(notificationActionRoute(action, item.memberId) as never);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.card, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[styles.handle, { backgroundColor: c.border }]} />
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <View>
            <Text style={[styles.title, { color: c.text }]}>{t('notifications.title')}</Text>
            <Text style={[styles.subtitle, { color: c.muted }]}>
              {unread > 0 ? t('notifications.unread', { count: unread }) : t('notifications.caughtUp')}
            </Text>
          </View>
          {unread > 0 ? (
            <Pressable onPress={markAllRead}>
              <Text style={[styles.markAll, { color: c.accentText }]}>{t('notifications.markAllRead')}</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {loading ? (
            <Text style={[styles.empty, { color: c.dim }]}>{t('notifications.loading')}</Text>
          ) : notifications.length === 0 ? (
            <Text style={[styles.empty, { color: c.dim }]}>{t('notifications.empty')}</Text>
          ) : (
            notifications.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                isRead={isRead(item.id)}
                readOnly={readOnly}
                colors={c}
                onOpenMember={() => openMember(item)}
                onAction={() => runAction(item)}
                onDismiss={() => dismiss(item.id)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { marginTop: 2, fontSize: 13 },
  markAll: { fontSize: 13, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  rowTap: { flex: 1, flexDirection: 'row', padding: 12, paddingRight: 4 },
  rowIcon: { marginRight: 10, marginTop: 2 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowMessage: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  actionBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: { fontSize: 12, fontWeight: '700' },
  dismissBtn: { padding: 12, paddingLeft: 4 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 15 },
});
