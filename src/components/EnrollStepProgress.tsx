import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
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
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Enroll progress: current + next copy, animated circular “n of total” ring.
 */
export function EnrollStepProgress({ steps, current }: Props) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [displayStep, setDisplayStep] = useState(current);
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
  const targetOffset = circumference * (1 - progress);

  const dashOffset = useRef(new Animated.Value(targetOffset)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const labelOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const titleTranslate = useRef(new Animated.Value(0)).current;
  const prevStepRef = useRef(current);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduceMotion(Boolean(v));
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      dashOffset.setValue(targetOffset);
      ringScale.setValue(1);
      labelOpacity.setValue(1);
      titleOpacity.setValue(1);
      titleTranslate.setValue(0);
      setDisplayStep(current);
      prevStepRef.current = current;
      return;
    }

    const stepped = prevStepRef.current !== current;
    prevStepRef.current = current;

    Animated.timing(dashOffset, {
      toValue: targetOffset,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (!stepped) return;

    ringScale.setValue(0.92);
    titleOpacity.setValue(0);
    titleTranslate.setValue(8);

    Animated.parallel([
      Animated.spring(ringScale, {
        toValue: 1,
        friction: 6,
        tension: 140,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslate, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(labelOpacity, {
          toValue: 0,
          duration: 90,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
          delay: 0,
        }),
      ]),
    ]).start();

    // Swap the count mid-blink so it tracks the arc change.
    const swapId = setTimeout(() => setDisplayStep(current), 90);
    return () => clearTimeout(swapId);
  }, [
    current,
    targetOffset,
    reduceMotion,
    dashOffset,
    ringScale,
    labelOpacity,
    titleOpacity,
    titleTranslate,
  ]);

  const stepOfShort = t('enroll.stepOfShort', { current: displayStep, total });
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
      <Animated.View
        style={[
          styles.copy,
          { opacity: titleOpacity, transform: [{ translateY: titleTranslate }] },
        ]}
      >
        <Text display style={styles.title}>{active?.label ?? ''}</Text>
        <Text style={styles.next}>{nextLabel}</Text>
      </Animated.View>

      <Animated.View
        style={[styles.ringWrap, { transform: [{ scale: ringScale }] }]}
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
          <AnimatedCircle
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
        <Animated.Text style={[styles.ringLabel, { opacity: labelOpacity }]}>
          {stepOfShort}
        </Animated.Text>
      </Animated.View>
    </View>
  );
}
