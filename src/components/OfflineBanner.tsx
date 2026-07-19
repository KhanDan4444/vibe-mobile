import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useFlash } from '@/src/context/FlashContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { useNetwork } from '@/src/offline/NetworkProvider';

/**
 * In-layout strip when offline — sits above the navigator so it pushes headers down
 * instead of covering them.
 */
export function OfflineStatusStrip() {
  const { isOnline } = useNetwork();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (isOnline) return null;

  return (
    <View
      style={[
        styles.offlineStrip,
        {
          backgroundColor: isDark ? '#78350f' : '#fef3c7',
          paddingTop: Math.max(insets.top, 8),
        },
      ]}
    >
      <Text style={[styles.offlineText, { color: isDark ? '#fef3c7' : '#78350f' }]}>
        {t('offline.offline')}
      </Text>
    </View>
  );
}

/**
 * Online sync UI (modal + reminder chip). Rendered above the stack for touch targets.
 */
export function OfflineSyncOverlay() {
  const { isOnline, pendingCount, failedCount, lastError, isSyncing, syncNow, discardQueuedChanges } =
    useNetwork();
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const { showFlash } = useFlash();
  const insets = useSafeAreaInsets();
  const [modalDismissed, setModalDismissed] = useState(false);

  const needsSync = isOnline && (pendingCount > 0 || failedCount > 0);
  const total = pendingCount + failedCount;

  useEffect(() => {
    if (needsSync) setModalDismissed(false);
  }, [needsSync, pendingCount, failedCount]);

  if (!needsSync) return null;

  const showModal = needsSync && !modalDismissed;
  const title =
    failedCount > 0 ? t('offline.syncFailedTitle') : t('offline.syncPendingTitle');
  const body =
    failedCount > 0
      ? t('offline.syncFailedBody', {
          count: failedCount,
          error: lastError || t('offline.failedGeneric'),
        })
      : t('offline.syncPendingBody', { count: pendingCount });

  const onSync = async () => {
    const synced = await syncNow(true);
    if (synced > 0) {
      showFlash({
        title: t('offline.syncDoneTitle'),
        subtitle: t('offline.syncDoneBody', { count: synced }),
        variant: 'success',
      });
    }
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {modalDismissed ? (
        <Pressable
          onPress={() => setModalDismissed(false)}
          style={[
            styles.chip,
            {
              backgroundColor: c.accent,
              bottom: Math.max(insets.bottom, 12) + 72,
            },
          ]}
          accessibilityLabel={t('offline.syncNow')}
        >
          <Text style={styles.chipText}>{t('offline.syncChip', { count: total })}</Text>
        </Pressable>
      ) : null}

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setModalDismissed(true)}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setModalDismissed(true)} />
          <View
            style={[
              styles.card,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                marginBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <Text style={[styles.title, { color: c.text }]}>{title}</Text>
            <Text style={[styles.message, { color: c.muted }]}>{body}</Text>
            {lastError && failedCount === 0 ? (
              <Text style={[styles.errorDetail, { color: c.warning }]} numberOfLines={3}>
                {lastError}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.btnGhost, { borderColor: c.border }]}
                onPress={() => setModalDismissed(true)}
                disabled={isSyncing}
              >
                <Text style={[styles.btnText, { color: c.muted }]}>{t('offline.syncLater')}</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, { backgroundColor: c.accent, opacity: isSyncing ? 0.7 : 1 }]}
                onPress={() => void onSync()}
                disabled={isSyncing}
                accessibilityLabel={t('offline.syncNow')}
              >
                {isSyncing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.btnText, styles.btnTextOnAccent]}>{t('offline.syncNow')}</Text>
                )}
              </Pressable>
            </View>

            <Pressable
              onPress={() => void discardQueuedChanges()}
              disabled={isSyncing}
              style={styles.discardBtn}
              accessibilityLabel={t('offline.discardQueued')}
            >
              <Text style={[styles.discardText, { color: c.dim }]}>{t('offline.discardQueued')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** @deprecated Prefer OfflineStatusStrip + OfflineSyncOverlay */
export function OfflineBanner() {
  return (
    <>
      <OfflineStatusStrip />
      <OfflineSyncOverlay />
    </>
  );
}

const styles = StyleSheet.create({
  offlineStrip: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  offlineText: { fontSize: 13, fontWeight: '500' },
  chip: {
    position: 'absolute',
    alignSelf: 'center',
    left: 24,
    right: 24,
    zIndex: 180,
    elevation: 18,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  chipText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    zIndex: 1,
  },
  title: { fontSize: 17, fontWeight: '700' },
  message: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  errorDetail: { marginTop: 8, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  btnGhost: { borderWidth: 1, backgroundColor: 'transparent' },
  btnText: { fontSize: 15, fontWeight: '600' },
  btnTextOnAccent: { color: '#fff' },
  discardBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  discardText: { fontSize: 13, fontWeight: '500' },
});
