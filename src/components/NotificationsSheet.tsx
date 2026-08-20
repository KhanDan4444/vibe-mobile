import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { BottomSheet } from '@/src/components/BottomSheet';
import { PageSkeleton } from '@/src/components/Skeleton';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { SwipeDismissRow } from '@/src/components/SwipeDismissRow';
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
  notificationActionLabel,
  notificationActionRoute,
} from '@/src/utils/notificationActions';
import {
  groupNotifications,
  localizeNotification,
  notificationKind,
  stackNotificationGroups,
  stackPreview,
  stackTitle,
  type NotificationKind,
  type NotificationStack,
} from '@/src/utils/notificationText';

function iconForKind(kind: NotificationKind, type: string): keyof typeof Ionicons.glyphMap {
  if (kind === 'unpaid') return 'wallet-outline';
  if (kind === 'due_soon') return 'time-outline';
  if (kind === 'expired') return 'alert-circle';
  if (kind === 'payment_recorded') return 'checkmark-circle';
  if (type === 'danger') return 'alert-circle';
  if (type === 'warning') return 'time-outline';
  return 'checkmark-circle';
}

function colorsForKind(kind: NotificationKind, type: string, c: ThemeColors) {
  if (kind === 'unpaid') return { icon: c.statusUnpaid, bg: `${c.statusUnpaid}18` };
  if (kind === 'due_soon') return { icon: c.statusDueSoon, bg: `${c.statusDueSoon}18` };
  if (kind === 'expired') return { icon: c.statusExpired, bg: `${c.statusExpired}18` };
  if (type === 'danger') return { icon: c.statusExpired, bg: `${c.statusExpired}18` };
  if (type === 'warning') return { icon: c.warning, bg: `${c.warning}18` };
  return { icon: c.accentText, bg: c.accentSoft };
}

function branchLabel(item: DashboardNotification): string | undefined {
  const row = item as DashboardNotification & { branch_name?: string };
  return row.branchName ?? row.branch_name;
}

function NotificationRow({
  item,
  isRead,
  readOnly,
  showBranchBadge,
  nested,
  colors: c,
  onOpenMember,
  onAction,
}: {
  item: DashboardNotification;
  isRead: boolean;
  readOnly: boolean;
  showBranchBadge: boolean;
  nested?: boolean;
  colors: ThemeColors;
  onOpenMember: () => void;
  onAction: () => void;
}) {
  const { t } = useTranslation();
  const resolved = notificationAction(item);
  const action = resolved && resolved !== 'view' && !readOnly ? resolved : null;
  const kind = notificationKind(item);
  const palette = colorsForKind(kind, item.type, c);
  const localized = localizeNotification(item, t);
  const branch = branchLabel(item);
  const actionColor = action === 'payment' ? c.statusUnpaid : c.accentText;

  return (
    <View style={[styles.row, nested && styles.rowNested, { backgroundColor: c.card }]}>
      {!isRead ? <View style={[styles.unreadBar, { backgroundColor: c.accentText }]} /> : null}

      {nested ? null : (
        <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
          <Ionicons name={iconForKind(kind, item.type)} size={18} color={palette.icon} />
        </View>
      )}

      <View style={styles.rowBody}>
        <Pressable onPress={onOpenMember}>
          {nested || !localized.eyebrow ? null : (
            <Text style={[styles.eyebrow, { color: c.muted }]}>{localized.eyebrow}</Text>
          )}
          <Text
            style={[styles.rowTitle, { color: c.text }, !isRead && styles.rowTitleUnread]}
            numberOfLines={1}
          >
            {localized.title}
          </Text>
          {showBranchBadge && branch ? (
            <View
              style={[
                styles.branchBadge,
                { backgroundColor: `${c.accentText}14`, borderColor: `${c.accentText}33` },
              ]}
            >
              <Text style={[styles.branchBadgeText, { color: c.accentText }]}>{branch}</Text>
            </View>
          ) : null}
          <Text style={[styles.rowMessage, { color: c.muted }]} numberOfLines={2}>
            {localized.message}
          </Text>
        </Pressable>
        {action ? (
          <Pressable style={styles.actionBtn} onPress={onAction} hitSlop={6}>
            <Text style={[styles.actionText, { color: actionColor }]}>
              {notificationActionLabel(action)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={actionColor} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.metaCol}>
        {localized.date ? (
          <Text style={[styles.dateText, { color: c.dim }]}>{localized.date}</Text>
        ) : null}
        {!action ? <Ionicons name="chevron-forward" size={16} color={c.dim} /> : null}
      </View>
    </View>
  );
}

function KindStack({
  group,
  expanded,
  onToggle,
  isRead,
  readOnly,
  showBranchBadge,
  colors: c,
  dismissLabel,
  onOpenMember,
  onAction,
  onDismiss,
}: {
  group: NotificationStack;
  expanded: boolean;
  onToggle: () => void;
  isRead: (id: string) => boolean;
  readOnly: boolean;
  showBranchBadge: boolean;
  colors: ThemeColors;
  dismissLabel: string;
  onOpenMember: (item: DashboardNotification) => void;
  onAction: (item: DashboardNotification) => void;
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  const stacked = group.items.length > 1;

  const rowFor = (item: DashboardNotification, nested = false) => (
    <SwipeDismissRow key={item.id} label={dismissLabel} onDismiss={() => onDismiss(item.id)}>
      <NotificationRow
        item={item}
        nested={nested}
        isRead={isRead(item.id)}
        readOnly={readOnly}
        showBranchBadge={showBranchBadge}
        colors={c}
        onOpenMember={() => onOpenMember(item)}
        onAction={() => onAction(item)}
      />
    </SwipeDismissRow>
  );

  if (!stacked) return rowFor(group.items[0]);

  const palette = colorsForKind(group.kind, group.items[0].type, c);
  const anyUnread = group.items.some((item) => !isRead(item.id));

  return (
    <View>
      <SwipeDismissRow
        label={dismissLabel}
        onDismiss={() => group.items.forEach((item) => onDismiss(item.id))}
      >
        <Pressable
          onPress={onToggle}
          style={[styles.row, { backgroundColor: c.card }]}
        >
          {anyUnread ? <View style={[styles.unreadBar, { backgroundColor: c.accentText }]} /> : null}
          <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
            <Ionicons name={iconForKind(group.kind, group.items[0].type)} size={18} color={palette.icon} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowTitle, { color: c.text }, anyUnread && styles.rowTitleUnread]} numberOfLines={1}>
              {stackTitle(group.kind, group.items.length, t)}
            </Text>
            <Text style={[styles.rowMessage, { color: c.muted }]} numberOfLines={1}>
              {stackPreview(group.items, t)}
            </Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={c.dim} />
        </Pressable>
      </SwipeDismissRow>
      {expanded ? group.items.map((item) => rowFor(item, true)) : null}
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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const uniqueBranches = new Set(notifications.map((item) => branchLabel(item)).filter(Boolean));
  const showBranchBadge = selectedBranchId === 'all' && uniqueBranches.size > 1;
  const { attention, activity } = groupNotifications(notifications);
  const sections = [
    { key: 'attention' as const, label: t('notifications.section.attention'), items: attention },
    { key: 'activity' as const, label: t('notifications.section.activity'), items: activity },
  ].filter((section) => section.items.length > 0);
  const showHeaders = sections.length > 1;

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

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <BottomSheet visible={visible} title={t('notifications.title')} onClose={onClose} showCloseButton>
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
        <View style={styles.emptyWrap}>
          <Ionicons name="checkmark-circle-outline" size={40} color={`${c.accentText}66`} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>{t('notifications.caughtUp')}</Text>
          <Text style={[styles.emptySubtitle, { color: c.dim }]}>{t('notifications.empty')}</Text>
        </View>
      ) : (
        <SoftSurface variant="group" style={styles.listCard}>
          {sections.map((section, sectionIndex) => (
            <View
              key={section.key}
              style={sectionIndex > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border } : undefined}
            >
              {showHeaders ? (
                <Text style={[styles.sectionLabel, { color: c.muted }]}>{section.label}</Text>
              ) : null}
              {stackNotificationGroups(section.items).map((group) => (
                <KindStack
                  key={group.key}
                  group={group}
                  expanded={expanded.has(group.key)}
                  onToggle={() => toggle(group.key)}
                  isRead={isRead}
                  readOnly={readOnly}
                  showBranchBadge={showBranchBadge}
                  colors={c}
                  dismissLabel={t('common.dismiss')}
                  onOpenMember={openMember}
                  onAction={runAction}
                  onDismiss={dismiss}
                />
              ))}
            </View>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowNested: {
    paddingLeft: 56,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 2,
    borderRadius: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowBody: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  rowTitleUnread: { fontWeight: '700' },
  branchBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radiusMd,
    borderWidth: StyleSheet.hairlineWidth,
  },
  branchBadgeText: { fontSize: 10, fontWeight: '700' },
  rowMessage: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  actionBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: { fontSize: 13, fontWeight: '600' },
  metaCol: { alignItems: 'flex-end', gap: 6, paddingTop: 1 },
  dateText: { fontSize: 11 },
  emptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  emptySubtitle: { fontSize: 13 },
});
