import { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

export type EnrollStep = {
  id: string;
  label: string;
};

type Props = {
  steps: EnrollStep[];
  current: number;
};

/**
 * Compact mobile enroll progress — step copy + thin bar (not a desktop stepper).
 */
export function EnrollStepProgress({ steps, current }: Props) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const styles = useThemedStyles((colors) => ({
    wrap: { marginBottom: 16, gap: 10 },
    stepMeta: {
      color: colors.dim,
      fontSize: 12,
      fontWeight: '600' as const,
      letterSpacing: 0.3,
      textTransform: 'uppercase' as const,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700' as const,
      letterSpacing: -0.2,
    },
    track: {
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
      overflow: 'hidden' as const,
    },
    fill: {
      height: '100%' as const,
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    dots: {
      flexDirection: 'row' as const,
      gap: 8,
      marginTop: 2,
    },
  }));

  const active = steps[current - 1];
  const progress = useMemo(() => {
    if (!steps.length) return 0;
    return Math.min(1, Math.max(0, current / steps.length));
  }, [current, steps.length]);

  const stepOfLabel = t('enroll.stepOf', { current, total: steps.length });
  const announcedRef = useRef('');
  useEffect(() => {
    if (!active) return;
    const message = `${stepOfLabel}. ${active.label}`;
    if (announcedRef.current === message) return;
    announcedRef.current = message;
    AccessibilityInfo.announceForAccessibility(message);
  }, [active, stepOfLabel]);

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={active ? `${stepOfLabel}, ${active.label}` : undefined}
      accessibilityValue={{ min: 1, max: steps.length, now: current }}
    >
      <Text style={styles.stepMeta}>{stepOfLabel}</Text>
      <Text style={styles.title}>{active?.label ?? ''}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {steps.map((step, index) => {
          const n = index + 1;
          const filled = n <= current;
          return (
            <View
              key={step.id}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 999,
                backgroundColor: filled ? c.accent : c.border,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
