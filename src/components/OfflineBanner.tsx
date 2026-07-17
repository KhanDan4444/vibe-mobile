import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useNetwork } from '@/src/offline/NetworkProvider';

export function OfflineBanner() {
  const { isOnline, pendingCount, failedCount, lastError, syncNow } = useNetwork();
  const { colors: c, isDark } = useTheme();
  const { t } = useTranslation();

  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  const offlineBg = isDark ? '#78350f' : '#fef3c7';
  const pendingBg = isDark ? '#1e3a8a' : '#dbeafe';
  const failedBg = isDark ? '#7f1d1d' : '#fee2e2';
  const textColor = isDark ? '#fef3c7' : '#78350f';
  const pendingText = isDark ? '#dbeafe' : '#1e3a8a';
  const failedText = isDark ? '#fecaca' : '#991b1b';

  const showFailed = failedCount > 0 && isOnline;
  const bg = !isOnline ? offlineBg : showFailed ? failedBg : pendingBg;
  const color = !isOnline ? textColor : showFailed ? failedText : pendingText;

  let message: string;
  if (!isOnline) {
    message = t('offline.offline');
  } else if (showFailed) {
    message = t('offline.failed', { count: failedCount, error: lastError || t('offline.failedGeneric') });
  } else {
    message = t('offline.pending', { count: pendingCount });
  }

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]} numberOfLines={2}>
        {message}
      </Text>
      {isOnline && (pendingCount > 0 || failedCount > 0) ? (
        <Pressable onPress={() => void syncNow()} style={styles.syncBtn}>
          <Text style={styles.syncText}>{t('offline.syncNow')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: { fontSize: 13, flex: 1, fontWeight: '500' },
  syncBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  syncText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
