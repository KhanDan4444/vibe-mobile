import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useNetwork } from '@/src/offline/NetworkProvider';

export function OfflineBanner() {
  const { isOnline, pendingCount, failedCount, lastError, syncNow } = useNetwork();
  const { isDark } = useTheme();
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
        <Pressable
          onPress={() => void syncNow()}
          style={[styles.syncBtn, { borderColor: color }]}
          accessibilityLabel={t('offline.syncNow')}
        >
          <Text style={[styles.syncText, { color }]}>{t('offline.syncNow')}</Text>
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
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  syncText: { fontSize: 12, fontWeight: '600' },
});
