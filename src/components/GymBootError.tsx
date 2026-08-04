import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useGymBoot } from '@/src/context/GymBootContext';

export function GymBootError() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { bootError, retrying, retryBoot } = useGymBoot();

  if (!bootError) return null;

  const showDevDetail = typeof __DEV__ !== 'undefined' && __DEV__;

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>{t('gymBoot.errorTitle')}</Text>
        <Text style={[styles.body, { color: c.muted }]}>{t('gymBoot.errorBody')}</Text>
        {showDevDetail && bootError.message ? (
          <Text style={[styles.detail, { color: c.dim }]} selectable>
            {bootError.message}
          </Text>
        ) : null}
        {showDevDetail && bootError.message?.includes('localhost') ? (
          <Text style={[styles.hint, { color: c.muted }]}>{t('gymBoot.usbHint')}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('gymBoot.retry')}
          accessibilityState={{ disabled: retrying, busy: retrying }}
          disabled={retrying}
          onPress={retryBoot}
          android_ripple={
            Platform.OS === 'android' && !retrying ? { color: 'rgba(255,255,255,0.28)' } : undefined
          }
          style={({ pressed }) => [
            styles.btn,
            {
              backgroundColor: c.accent,
              opacity: retrying ? 0.72 : pressed ? 0.82 : 1,
              transform: [{ scale: pressed && !retrying ? 0.98 : 1 }],
            },
          ]}
        >
          {retrying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{t('gymBoot.retry')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  detail: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  btn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
