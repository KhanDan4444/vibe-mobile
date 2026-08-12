import { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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

const RING_SIZE = 58;
const RING_STROKE = 4.5;

/**
 * Enroll progress: current + next copy, circular “n of total” ring.
 * No enter/step motion — keeps the form from tweaking between steps.
 */
export function EnrollStepProgress({ steps, current }: Props) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const styles = useThemedStyles((colors) => ({
    wrap: {
      marginBottom: 20,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: 16,
    },
    copy: { flex: 1, minWidth: 0, gap: 6 },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '600' as const,
      letterSpacing: -0.45,
      lineHeight: 30,
    },
    next: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      letterSpacing: 0.05,
    },
    ringWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    ringLabel: {
      position: 'absolute' as const,
      color: colors.text,
      fontSize: 12,
      fontWeight: '700' as const,
      letterSpacing: -0.25,
    },
  }));

  const active = steps[current - 1];
  const next = steps[current] ?? null;
  const total = steps.length;

  const progress = useMemo(() => {
    if (!total) return 0;
    return Math.min(1, Math.max(0, current / total));
  }, [current, total]);

  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const stepOfShort = t('enroll.stepOfShort', { current, total });
  const nextLabel = next
    ? t('enroll.nextStep', { step: next.label })
    : t('enroll.nextDone');

  const announcedRef = useRef('');
  useEffect(() => {
    if (!active) return;
    const message = `${t('enroll.stepOfShort', { current, total })}. ${active.label}. ${nextLabel}`;
    if (announcedRef.current === message) return;
    announcedRef.current = message;
    AccessibilityInfo.announceForAccessibility(message);
  }, [active, current, total, nextLabel, t]);

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={
        active
          ? `${t('enroll.stepOfShort', { current, total })}, ${active.label}. ${nextLabel}`
          : undefined
      }
      accessibilityValue={{ min: 1, max: total, now: current }}
    >
      <View style={styles.copy}>
        <Text display style={styles.title}>{active?.label ?? ''}</Text>
        <Text style={styles.next}>{nextLabel}</Text>
      </View>

      <View
        style={styles.ringWrap}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            stroke={c.border}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            stroke={c.accent}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <Text style={styles.ringLabel}>{stepOfShort}</Text>
      </View>
    </View>
  );
}
