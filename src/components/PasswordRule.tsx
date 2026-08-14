import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

type Props = {
  show: boolean;
  ok: boolean;
  label: string;
};

/** Live password checklist row — empty circle → green check (not alarm X). */
export function PasswordRule({ show, ok, label }: Props) {
  const { colors: c } = useTheme();
  const styles = useThemedStyles((colors) => ({
    row: {
      marginTop: 6,
      marginBottom: 2,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    labelOk: { flex: 1, fontSize: 12, fontWeight: '500' as const, color: colors.success },
    labelPending: { flex: 1, fontSize: 12, fontWeight: '500' as const, color: colors.muted },
  }));

  if (!show) return null;

  return (
    <View style={styles.row} accessibilityRole="text" accessibilityState={{ checked: ok }}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={ok ? c.success : c.muted}
      />
      <Text style={ok ? styles.labelOk : styles.labelPending}>{label}</Text>
    </View>
  );
}
