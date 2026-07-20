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
  return 'checkmark-circle';
}

function colorsForType(type: string, c: ThemeColors) {
  if (type === 'danger') return { icon: '#f87171', bg: 'rgba(248,113,113,0.12)' };
  if (type === 'warning') return { icon: c.warning, bg: 'rgba(251,191,36,0.12)' };
  return { icon: c.accentText, bg: c.accentSoft };
}

function NotificationRow({
  item,
  isRead,
  readOnly,
  colors: c,
  onOpenMember,
  onAction,
  onDismiss,
  isLast,
}: {
  item: DashboardNotification;
  isRead: boolean;
  readOnly: boolean;
  colors: ThemeColors;
  onOpenMember: () => void;
  onAction: () => void;
  onDismiss: () => void;
  isLast: boolean;
}) {
  const action = !readOnly ? notificationAction(item) : null;
  const palette = colorsForType(item.type, c);

  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        !isRead && { backgroundColor: c.accentSoft },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
        <Ionicons name={iconForType(item.type)} size={20} color={palette.icon} />
      </View>

      <Pressable style={styles.rowBody} onPress={onOpenMember}>
        <View style={styles.titleRow}>
          <Text style={[styles.rowTitle, { color: c.text }, !isRead && styles.rowTitleUnread]}>
            {item.title}
          </Text>
          {!isRead ? <View style={[styles.unreadDot, { backgroundColor: c.accentText }]} /> : null}
        </View>
        <Text style={[styles.rowMessage, { color: c.muted }]} numberOfLines={3}>
          {item.message}
        </Text>
        {action ? (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: c.accent }]}
            onPress={(e) => {
              e.stopPropagation?.();
              onAction();
            }}
          >
            <Text style={styles.actionText}>{notificationActionLabel(action)}</Text>
          </Pressable>
        ) : null}
      </Pressable>

      <Pressable onPress={onDismiss} hitSlop={10} style={styles.dismissBtn} accessibilityLabel="Dismiss">
        <Ionicons name="close" size={16} color={c.dim} />
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
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.bg, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: c.text }]}>{t('notifications.title')}</Text>
              <Text style={[styles.subtitle, { color: c.muted }]}>
                {unread > 0 ? t('notifications.unread', { count: unread }) : t('notifications.caughtUp')}
              </Text>
            </View>
            {unread > 0 ? (
              <Pressable onPress={markAllRead} hitSlop={8}>
                <Text style={[styles.markAll, { color: c.accentText }]}>{t('notifications.markAllRead')}</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <Text style={[styles.empty, { color: c.dim }]}>{t('notifications.loading')}</Text>
            ) : notifications.length === 0 ? (
              <Text style={[styles.empty, { color: c.dim }]}>{t('notifications.empty')}</Text>
            ) : (
              <View style={[styles.listCard, { backgroundColor: c.card, borderColor: c.border }]}>
                {notifications.map((item, index) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    isRead={isRead(item.id)}
                    readOnly={readOnly}
                    colors={c}
                    isLast={index === notifications.length - 1}
                    onOpenMember={() => openMember(item)}
                    onAction={() => runAction(item)}
                    onDismiss={() => dismiss(item.id)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    maxHeight: '85%',
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, marginRight: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { marginTop: 2, fontSize: 13 },
  markAll: { fontSize: 13, fontWeight: '600', paddingTop: 2 },
  scroll: { flexGrow: 0 },
  list: { padding: 16, paddingBottom: 24 },
  listCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  rowBody: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  rowTitleUnread: { fontWeight: '700' },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  rowMessage: { marginTop: 4, fontSize: 13, lineHeight: 19 },
  actionBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dismissBtn: { padding: 4, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 15 },
});
