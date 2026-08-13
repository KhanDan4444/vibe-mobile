import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { statusWashOpaque } from '@/src/utils/statusWash';

export function ReadOnlyBanner() {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const { readOnly, subscriptionReadOnly, branchReadOnly, selectedBranch } = useGymReadOnly();

  const isBranchOnly = Boolean(branchReadOnly && selectedBranch && !subscriptionReadOnly);
  const accent = isBranchOnly ? c.muted : c.warning;

  const styles = useThemedStyles((colors) => ({
    banner: {
      marginBottom: 12,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderWidth: 1,
      overflow: 'hidden' as const,
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: 12,
    },
    accentBar: {
      position: 'absolute' as const,
      left: 0,
      top: 10,
      bottom: 10,
      width: 3,
      borderRadius: 2,
    },
    iconOuter: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 1,
    },
    iconInner: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      paddingTop: 1,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 0.6,
      textTransform: 'uppercase' as const,
      marginBottom: 4,
    },
    title: {
      fontSize: 15,
      fontWeight: '700' as const,
      letterSpacing: -0.2,
      lineHeight: 20,
      color: colors.text,
    },
    body: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
    },
  }));

  if (!readOnly) return null;

  const title = isBranchOnly
    ? t('alerts.branchReadOnlyTitle')
    : t('dashboard.readOnlyTitle');
  const body = isBranchOnly
    ? t('alerts.branchReadOnlyBody', { name: selectedBranch!.name })
    : t('dashboard.readOnlyBody');
  const iconName = isBranchOnly ? 'business-outline' : 'shield-half-outline';

  return (
    <SoftSurface
      flat
      variant="panel"
      style={[
        styles.banner,
        {
          backgroundColor: statusWashOpaque(accent, c.card, 0.1),
          borderColor: statusWashOpaque(accent, c.cardEdge, 0.45),
          paddingLeft: 18,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View
        style={[
          styles.iconOuter,
          {
            backgroundColor: statusWashOpaque(accent, c.bg, 0.16),
            borderColor: statusWashOpaque(accent, c.cardEdge, 0.4),
          },
        ]}
      >
        <View
          style={[
            styles.iconInner,
            { backgroundColor: statusWashOpaque(accent, c.card, 0.22) },
          ]}
        >
          <Ionicons name={iconName} size={16} color={accent} />
        </View>
      </View>
      <View style={styles.copy}>
        {!isBranchOnly ? (
          <Text style={[styles.eyebrow, { color: accent }]}>{t('dashboard.readOnlyEyebrow')}</Text>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </SoftSurface>
  );
}
