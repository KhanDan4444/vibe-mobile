import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { useGymBoot } from '@/src/context/GymBootContext';

export function GymBootError() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { bootError, booting, retryBoot } = useGymBoot();

  if (!bootError || booting) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>{t('gymBoot.errorTitle')}</Text>
        <Text style={[styles.body, { color: c.muted }]}>{t('gymBoot.errorBody')}</Text>
        {bootError.message ? (
          <Text style={[styles.detail, { color: c.dim }]} selectable>
            {bootError.message}
          </Text>
        ) : null}
        {bootError.message?.includes('localhost') ? (
          <Text style={[styles.hint, { color: c.muted }]}>
            {t('gymBoot.usbHint')}
          </Text>
        ) : null}
        <Pressable style={[styles.btn, { backgroundColor: c.accent }]} onPress={retryBoot}>
          <Text style={styles.btnText}>{t('gymBoot.retry')}</Text>
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
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
