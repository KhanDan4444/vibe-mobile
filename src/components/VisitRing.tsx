import { useEffect, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import { springs, timings } from '@/src/theme/motion';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function startOfWeekLocal(date: Date, weekStartsOn: 'monday' | 'sunday' = 'monday') {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const startDow = weekStartsOn === 'sunday' ? 0 : 1;
  const diff = (day - startDow + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function isLastWeekOfMonth(date = new Date(), weekStartsOn: 'monday' | 'sunday' = 'monday') {
  const weekStart = startOfWeekLocal(date, weekStartsOn);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  lastDay.setHours(0, 0, 0, 0);
  return lastDay >= weekStart && lastDay < weekEnd;
}

type VisitRingProps = {
  visits?: number;
  limit?: number | null;
  size?: number;
  stroke?: number;
  weekStartsOn?: 'monday' | 'sunday';
  badge?: ReactNode;
  /** Brief checkmark pulse after a successful check-in. */
  celebrate?: boolean;
};

/** Weekly visit progress ring — mirrors web VisitRing color rules. */
export function VisitRing({
  visits = 0,
  limit = null,
  size = 88,
  stroke = 7,
  weekStartsOn = 'monday',
  badge,
  celebrate = false,
}: VisitRingProps) {
  const { t } = useTranslation();
  const { colors: c, theme } = useTheme();
  const capped = limit != null && limit > 0;
  const safeVisits = Math.max(0, Number(visits) || 0);
  const progress = capped
    ? Math.min(1, safeVisits / (limit as number))
    : Math.min(1, safeVisits > 0 ? 0.12 + Math.min(safeVisits, 7) * 0.08 : 0);
  const atLimit = capped && safeVisits >= (limit as number);
  const nearLimit = capped && !atLimit && safeVisits === (limit as number) - 1 && (limit as number) > 1;
  const empty = capped && safeVisits === 0;
  const lastWeekOfMonth = isLastWeekOfMonth(new Date(), weekStartsOn);
  const warnAmber = nearLimit || (atLimit && !lastWeekOfMonth);
  const warnRed = atLimit && lastWeekOfMonth;
  const emptyStroke = Math.max(stroke + 1, 8);
  const drawStroke = empty ? emptyStroke : stroke;
  const r = (size - drawStroke) / 2;
  const circ = 2 * Math.PI * r;

  const fill = warnRed ? c.statusExpired : warnAmber ? c.statusDueSoon : c.accent;
  const track = empty
    ? theme === 'light'
      ? 'rgba(15,23,42,0.28)'
      : 'rgba(148,163,184,0.42)'
    : theme === 'light'
      ? 'rgba(15,23,42,0.08)'
      : 'rgba(148,163,184,0.18)';
  const countColor = warnRed ? c.statusExpired : warnAmber ? c.statusDueSoon : c.text;
  const discBg =
    warnRed
      ? 'rgba(225,29,72,0.08)'
      : warnAmber
        ? 'rgba(2,132,215,0.08)'
        : c.inputBg;

  const progressSv = useSharedValue(progress);
  const tickScale = useSharedValue(0);
  const tickOpacity = useSharedValue(0);
  const countOpacity = useSharedValue(1);

  useEffect(() => {
    progressSv.value = withTiming(progress, { duration: timings.enterMs });
  }, [progress, progressSv]);

  useEffect(() => {
    if (!celebrate) {
      tickScale.value = 0;
      tickOpacity.value = 0;
      countOpacity.value = 1;
      return;
    }
    countOpacity.value = withTiming(0, { duration: 120 });
    tickOpacity.value = withTiming(1, { duration: 120 });
    tickScale.value = withSequence(
      withSpring(1.12, springs.press),
      withSpring(1, springs.enter)
    );
    const clear = setTimeout(() => {
      tickOpacity.value = withTiming(0, { duration: 220 });
      countOpacity.value = withTiming(1, { duration: 220 });
      tickScale.value = withTiming(0.85, { duration: 220 });
    }, 720);
    return () => clearTimeout(clear);
  }, [celebrate, tickScale, tickOpacity, countOpacity]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - progressSv.value),
  }));

  const tickStyle = useAnimatedStyle(() => ({
    opacity: tickOpacity.value,
    transform: [{ scale: tickScale.value }],
  }));

  const countStyle = useAnimatedStyle(() => ({
    opacity: countOpacity.value,
  }));

  const styles = useThemedStyles((themeColors) => ({
    wrap: {
      width: size,
      height: size,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    disc: {
      position: 'absolute' as const,
      width: size - stroke * 2 - 10,
      height: size - stroke * 2 - 10,
      borderRadius: 999,
    },
    center: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    count: {
      fontSize: size >= 84 ? 20 : 18,
      fontWeight: '700' as const,
      fontVariant: ['tabular-nums' as const],
      letterSpacing: -0.3,
    },
    limit: { fontWeight: '500' as const, color: themeColors.muted, fontSize: size >= 84 ? 16 : 14 },
    unit: {
      marginTop: 3,
      fontSize: 9,
      fontWeight: '700' as const,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      color: themeColors.dim,
    },
    tick: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    badge: {
      position: 'absolute' as const,
      right: -1,
      bottom: -1,
      borderRadius: 999,
      borderWidth: 2.5,
      borderColor: themeColors.card,
      overflow: 'hidden' as const,
      backgroundColor: themeColors.card,
    },
  }));

  const emptyDash = `${Math.round(emptyStroke * 1.2)} ${Math.round(emptyStroke * 0.65)}`;
  const tickSize = Math.round(size * 0.34);

  const label = useMemo(
    () =>
      capped
        ? t('checkIn.ringProgress', { count: safeVisits, limit })
        : t('checkIn.ringUnlimited', { count: safeVisits }),
    [capped, safeVisits, limit, t]
  );

  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={label}>
      <View style={[styles.disc, { backgroundColor: discBg }]} pointerEvents="none" />
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={drawStroke}
          fill="none"
          strokeDasharray={empty ? emptyDash : undefined}
          strokeLinecap={empty ? 'butt' : 'round'}
        />
        {!empty ? (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={fill}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circ} ${circ}`}
            animatedProps={animatedProps}
          />
        ) : null}
      </Svg>
      <Animated.View style={[styles.center, countStyle]} pointerEvents="none">
        {capped ? (
          <>
            <Text display style={[styles.count, { color: countColor }]}>
              {safeVisits}
              <Text style={styles.limit}>/{limit}</Text>
            </Text>
            <Text style={styles.unit}>{t('checkIn.ringUnit')}</Text>
          </>
        ) : (
          <>
            <Text display style={[styles.count, { color: c.text }]}>
              {safeVisits}
            </Text>
            <Text style={styles.unit}>{t('checkIn.ringUnit')}</Text>
          </>
        )}
      </Animated.View>
      <Animated.View style={[styles.tick, tickStyle]} pointerEvents="none">
        <Svg width={tickSize} height={tickSize} viewBox="0 0 24 24">
          <Path
            d="M5.5 12.5l4.2 4.2L18.5 7.5"
            stroke={c.accentCta}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
      {badge ? <View style={styles.badge}>{badge}</View> : null}
    </View>
  );
}
