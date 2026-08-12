import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { PrimaryButton } from '@/src/components/ui/Button';
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
      <SoftSurface variant="panel" style={styles.card}>
        <Text display style={[styles.title, { color: c.text }]}>
          {t('gymBoot.errorTitle')}
        </Text>
        <Text style={[styles.body, { color: c.muted }]}>{t('gymBoot.errorBody')}</Text>
        {showDevDetail && bootError.message ? (
          <Text style={[styles.detail, { color: c.dim }]} selectable>
            {bootError.message}
          </Text>
        ) : null}
        {showDevDetail && bootError.message?.includes('localhost') ? (
          <Text style={[styles.hint, { color: c.muted }]}>{t('gymBoot.usbHint')}</Text>
        ) : null}
        <PrimaryButton
          label={retrying ? t('gymBoot.retrying') : t('gymBoot.retry')}
          onPress={retryBoot}
          loading={retrying}
          disabled={retrying}
          style={styles.btn}
        />
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
  },
});
