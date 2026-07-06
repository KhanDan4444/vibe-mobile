import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';

export function ReadOnlyBanner() {
  const { t } = useTranslation();
  const { readOnly, subscriptionReadOnly, branchReadOnly, selectedBranch } = useGymReadOnly();

  if (!readOnly) return null;

  if (branchReadOnly && selectedBranch && !subscriptionReadOnly) {
    return (
      <View style={styles.banner}>
        <Text style={styles.title}>{t('alerts.branchReadOnlyTitle')}</Text>
        <Text style={styles.body}>{t('alerts.branchReadOnlyBody', { name: selectedBranch.name })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.body}>{t('dashboard.readOnlyBanner')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginTop: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.16)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: '#92400e',
  },
});
