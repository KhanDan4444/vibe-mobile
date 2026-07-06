import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useNetwork } from '@/src/offline/NetworkProvider';

export function OfflineBanner() {
  const { isOnline, pendingCount, syncNow } = useNetwork();
  const { colors: c, isDark } = useTheme();
  const { t } = useTranslation();

  if (isOnline && pendingCount === 0) return null;

  const offlineBg = isDark ? '#78350f' : '#fef3c7';
  const pendingBg = isDark ? '#1e3a8a' : '#dbeafe';
  const textColor = isDark ? '#fef3c7' : '#78350f';
  const pendingText = isDark ? '#dbeafe' : '#1e3a8a';

  return (
    <View style={[styles.banner, !isOnline ? { backgroundColor: offlineBg } : { backgroundColor: pendingBg }]}>
      <Text style={[styles.text, { color: !isOnline ? textColor : pendingText }]}>
        {!isOnline
          ? t('offline.offline')
          : t('offline.pending', { count: pendingCount })}
      </Text>
      {isOnline && pendingCount > 0 ? (
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
