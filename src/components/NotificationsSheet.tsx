import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet } from '@/src/components/BottomSheet';
import { PageSkeleton } from '@/src/components/Skeleton';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBranchScope } from '@/src/context/BranchContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useNotificationInbox } from '@/src/notifications/NotificationInboxContext';
import type { DashboardNotification } from '@/src/types/api';
import type { ThemeColors } from '@/src/theme/tokens';
import { radiusMd, space } from '@/src/theme/tokens';
import {
  notificationAction,
  notificationActionColor,
  notificationActionLabel,
  notificationActionRoute,
} from '@/src/utils/notificationActions';
import { stripBranchBracketPrefix } from '@/src/utils/notificationText';

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

function branchLabel(item: DashboardNotification): string | undefined {
  const row = item as DashboardNotification & { branchName?: string; branch_name?: string };
  return row.branchName ?? row.branch_name;
}

function NotificationRow({
  item,
  isRead,
  readOnly,
  showBranchBadge,
  colors: c,
  onOpenMember,
  onAction,
  onDismiss,
  isLast,
}: {
  item: DashboardNotification;
  isRead: boolean;
  readOnly: boolean;
  showBranchBadge: boolean;
  colors: ThemeColors;
  onOpenMember: () => void;
  onAction: () => void;
  onDismiss: () => void;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const resolved = notificationAction(item);
  const action = resolved && (resolved === 'view' || !readOnly) ? resolved : null;
  const palette = colorsForType(item.type, c);
  const message = stripBranchBracketPrefix(item.message);
  const branch = branchLabel(item);

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
        {showBranchBadge && branch ? (
          <View
            style={[
              styles.branchBadge,
              {
                backgroundColor: 'rgba(15,118,110,0.10)',
                borderColor: 'rgba(15,118,110,0.25)',
              },
            ]}
          >
            <Text style={[styles.branchBadgeText, { color: c.accentText }]}>{branch}</Text>
          </View>
        ) : null}
        <Text style={[styles.rowMessage, { color: c.muted }]} numberOfLines={3}>
          {message}
        </Text>
        {action ? (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: notificationActionColor(action, c) }]}
            onPress={(e) => {
              e.stopPropagation?.();
              onAction();
            }}
          >
            <Text style={styles.actionText}>{notificationActionLabel(action)}</Text>
          </Pressable>
        ) : null}
      </Pressable>

      <Pressable onPress={onDismiss} hitSlop={10} style={styles.dismissBtn} accessibilityLabel={t('common.dismiss')}>
        <Ionicons name="close" size={16} color={c.dim} />
      </Pressable>
    </View>
  );
}

export function NotificationsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { readOnly } = useGymReadOnly();
  const { selectedBranchId } = useBranchScope();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { notifications, unread, isRead, markRead, markAllRead, dismiss, loading } = useNotificationInbox();
  const showBranchBadge = selectedBranchId === 'all';

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
    <BottomSheet
      visible={visible}
      title={t('notifications.title')}
      onClose={onClose}
      showCloseButton
    >
      <View style={styles.metaRow}>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          {unread > 0 ? t('notifications.unread', { count: unread }) : t('notifications.caughtUp')}
        </Text>
        {unread > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={[styles.markAll, { color: c.accentText }]}>{t('notifications.markAllRead')}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <PageSkeleton variant="list-rows" count={4} padded={false} />
      ) : notifications.length === 0 ? (
        <Text style={[styles.empty, { color: c.dim }]}>{t('notifications.empty')}</Text>
      ) : (
        <SoftSurface variant="group" style={styles.listCard}>
          {notifications.map((item, index) => (
            <NotificationRow
              key={item.id}
              item={item}
              isRead={isRead(item.id)}
              readOnly={readOnly}
              showBranchBadge={showBranchBadge}
              colors={c}
              isLast={index === notifications.length - 1}
              onOpenMember={() => openMember(item)}
              onAction={() => runAction(item)}
              onDismiss={() => dismiss(item.id)}
            />
          ))}
        </SoftSurface>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
    gap: space.sm,
  },
  subtitle: { fontSize: 13, flex: 1 },
  markAll: { fontSize: 13, fontWeight: '600' },
  listCard: {
    overflow: 'hidden',
    paddingVertical: 0,
    paddingHorizontal: 0,
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
  branchBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
  },
  branchBadgeText: { fontSize: 10, fontWeight: '700' },
  rowMessage: { marginTop: 4, fontSize: 13, lineHeight: 19 },
  actionBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radiusMd,
  },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dismissBtn: { padding: 4, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 15 },
});
