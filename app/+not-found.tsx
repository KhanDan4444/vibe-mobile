import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Text style={[styles.title, { color: c.text }]}>{t('notFound.body')}</Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: c.accentText }]}>{t('notFound.goHome')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
