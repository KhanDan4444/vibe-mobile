import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { useGymReadOnly } from '@/src/hooks/useGymReadOnly';
import { timings } from '@/src/theme/motion';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { radiusLg, space } from '@/src/theme/tokens';
import { formatDisplayDate } from '@/src/utils/date';
import { statusWashOpaque } from '@/src/utils/statusWash';

export interface TrialBannerProps {
  isTrial?: boolean;
  trialDaysLeft?: number | null;
  trialEndDate?: string | null;
}

export function TrialBanner({ isTrial, trialDaysLeft, trialEndDate }: TrialBannerProps) {
  const { t } = useTranslation();
  const { colors: c, theme } = useTheme();
  const { readOnly } = useGymReadOnly();
  const isLight = theme === 'light';
  const accent = isLight ? c.accent : c.accentText;
  const titleColor = isLight ? c.accent : c.text;
  const endLabel = trialEndDate ? formatDisplayDate(trialEndDate) : '';

  const styles = useThemedStyles((colors) => ({
    banner: {
      marginTop: space.md,
      marginBottom: space.md,
      borderRadius: radiusLg,
      paddingVertical: 14,
      paddingHorizontal: space.lg,
      borderWidth: 1,
      overflow: 'hidden' as const,
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: space.md,
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
      marginTop: 2,
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
      paddingTop: 2,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 0.66,
      textTransform: 'uppercase' as const,
      marginBottom: 2,
    },
    title: {
      fontSize: 14,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
      lineHeight: 20,
    },
    body: {
      marginTop: space.xs,
      fontSize: 13,
      lineHeight: 20,
      color: colors.muted,
    },
    daysBadge: {
      marginTop: 1,
      minWidth: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: space.sm,
      paddingVertical: space.sm,
      borderRadius: 12,
      borderWidth: 1,
    },
    daysValue: {
      fontSize: 20,
      fontWeight: '700' as const,
      letterSpacing: -0.6,
      lineHeight: 22,
      fontVariant: ['tabular-nums'] as const,
    },
    daysLabel: {
      marginTop: 1,
      fontSize: 10,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
    },
  }));

  if (!isTrial || readOnly || trialDaysLeft == null || trialDaysLeft < 0) {
    return null;
  }

  const accessibilityLabel = [
    t('alerts.trialEyebrow'),
    t('alerts.trialTitle', { count: trialDaysLeft }),
    t('alerts.trialBody', { date: endLabel }),
  ].join('. ');

  return (
    <Animated.View
      entering={FadeIn.duration(timings.fadeMs)}
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
    >
      <SoftSurface
        flat
        variant="panel"
        style={[
          styles.banner,
          {
            backgroundColor: isLight
              ? statusWashOpaque(c.accent, c.card, 0.14)
              : statusWashOpaque(c.accent, c.card, 0.2),
            borderColor: isLight
              ? statusWashOpaque(c.accent, c.cardEdge, 0.5)
              : statusWashOpaque(c.accentText, c.cardEdge, 0.38),
            paddingLeft: 18,
          },
        ]}
      >
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <View
          style={[
            styles.iconOuter,
            {
              backgroundColor: statusWashOpaque(accent, c.bg, isLight ? 0.12 : 0.18),
              borderColor: statusWashOpaque(accent, c.cardEdge, isLight ? 0.45 : 0.42),
            },
          ]}
        >
          <View
            style={[
              styles.iconInner,
              { backgroundColor: statusWashOpaque(accent, c.card, isLight ? 0.2 : 0.26) },
            ]}
          >
            <Ionicons name="sparkles-outline" size={16} color={accent} />
          </View>
        </View>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: accent }]}>{t('alerts.trialEyebrow')}</Text>
          <Text style={[styles.title, { color: titleColor }]}>
            {t('alerts.trialTitle', { count: trialDaysLeft })}
          </Text>
          <Text style={styles.body}>
            {t('alerts.trialBody', { date: endLabel })}
          </Text>
        </View>
        <View
          style={[
            styles.daysBadge,
            {
              backgroundColor: statusWashOpaque(accent, c.card, isLight ? 0.22 : 0.28),
              borderColor: statusWashOpaque(accent, c.cardEdge, isLight ? 0.42 : 0.36),
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Text display latin style={[styles.daysValue, { color: accent }]}>
            {trialDaysLeft}
          </Text>
          <Text style={[styles.daysLabel, { color: accent }]}>
            {trialDaysLeft === 1 ? t('alerts.trialDayUnit') : t('alerts.trialDaysUnit')}
          </Text>
        </View>
      </SoftSurface>
    </Animated.View>
  );
}
