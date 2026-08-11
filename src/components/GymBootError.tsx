import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useGymBoot } from '@/src/context/GymBootContext';
import { elevationStyle } from '@/src/theme/elevation';
import { radiusMd } from '@/src/theme/tokens';

export function GymBootError() {
  const { t } = useTranslation();
  const { colors: c, theme } = useTheme();
  const { bootError, retrying, retryBoot } = useGymBoot();

  if (!bootError) return null;

  const showDevDetail = typeof __DEV__ !== 'undefined' && __DEV__;
  const btnBg = c.accent;
  const btnFg = '#fff';

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <SoftSurface variant="panel" style={styles.card}>
        <Text display style={[styles.title, { color: c.text }]}>{t('gymBoot.errorTitle')}</Text>
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
          accessibilityLabel={retrying ? t('gymBoot.retrying') : t('gymBoot.retry')}
          accessibilityState={{ disabled: retrying, busy: retrying }}
          disabled={retrying}
          onPress={retryBoot}
          android_ripple={
            Platform.OS === 'android' && !retrying ? { color: 'rgba(255,255,255,0.28)' } : undefined
          }
          style={({ pressed }) => [
            styles.btn,
            elevationStyle('soft', theme),
            {
              backgroundColor: btnBg,
              borderRadius: radiusMd,
              opacity: pressed && !retrying ? 0.9 : 1,
              transform: [{ scale: pressed && !retrying ? 0.98 : 1 }],
            },
          ]}
        >
          {retrying ? (
            <View style={styles.btnBusy}>
              <ActivityIndicator color={btnFg} />
              <Text style={[styles.btnText, { color: btnFg }]}>{t('gymBoot.retrying')}</Text>
            </View>
          ) : (
            <Text style={[styles.btnText, { color: btnFg }]}>{t('gymBoot.retry')}</Text>
          )}
        </Pressable>
      </SoftSurface>
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
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btnBusy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
