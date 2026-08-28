import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';
import { metricDisplayStyle } from '@/src/theme/typography';
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
  accessibilityLabel?: string;
  onPress?: () => void;
};

/** Weekly visit progress ring — mirrors web VisitRing color rules.
 * Teal for normal progress; amber when one visit left (or at cap most weeks).
 * Red = at weekly limit only in the last week of the month.
 * Inner disc stays dark — no tinted status washes.
 */
export function VisitRing({
  visits = 0,
  limit = null,
  size = 88,
  stroke = 7,
  weekStartsOn = 'monday',
  badge,
  celebrate = false,
  accessibilityLabel,
  onPress,
}: VisitRingProps) {
  const { t } = useTranslation();
  const { colors: c, theme } = useTheme();
  const limitNum = limit == null ? null : Number(limit);
  const capped = limitNum != null && Number.isFinite(limitNum) && limitNum > 0;
  const safeVisits = Math.max(0, Number(visits) || 0);
  const progress = capped
    ? Math.min(1, safeVisits / (limitNum as number))
    : Math.min(1, safeVisits > 0 ? 0.12 + Math.min(safeVisits, 7) * 0.08 : 0);
  const atLimit = capped && safeVisits >= (limitNum as number);
  const nearLimit =
    capped && !atLimit && safeVisits === (limitNum as number) - 1 && (limitNum as number) > 1;
  const empty = capped && safeVisits === 0;
  const lastWeekOfMonth = isLastWeekOfMonth(new Date(), weekStartsOn);
  const warnAmber = nearLimit || (atLimit && !lastWeekOfMonth);
  const warnRed = atLimit && lastWeekOfMonth;
  const emptyStroke = Math.max(stroke + 1, 8);
  const drawStroke = empty ? emptyStroke : stroke;
  const r = (size - drawStroke) / 2;
  const circ = 2 * Math.PI * r;

  /** Web `--color-brand` — light #0f766e, dark #2dd4bf (= accentText). */
  const brand = c.accentText;
  /** Web `--color-accent-warm` — light #d97706, dark #fbbf24 (= warm). */
  const ringAmber = c.warm;
  const fill = warnRed ? c.statusExpired : warnAmber ? ringAmber : brand;
  /** Celebrate tick: warm or brand only (web never paints the check red). */
  const tickStroke = warnAmber ? ringAmber : brand;
  const track = empty
    ? theme === 'light'
      ? 'rgba(15,23,42,0.28)'
      : 'rgba(148,163,184,0.42)'
    : theme === 'light'
      ? 'rgba(15,23,42,0.08)'
      : 'rgba(148,163,184,0.18)';
  const countColor = warnRed ? c.statusExpired : c.text;
  /** Dark disc: sit near card/input, not a near-black hole inside the ring. */
  const discBg = theme === 'light' ? c.bg : c.inputBg;

  const progressSv = useSharedValue(progress);
  const tickScale = useSharedValue(0);
  const tickOpacity = useSharedValue(0);
  const countOpacity = useSharedValue(1);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      progressSv.value = progress;
      return;
    }
    progressSv.value = withTiming(progress, { duration: 280 });
  }, [progress, progressSv]);

  useEffect(() => {
    if (!celebrate) {
      tickScale.value = 0;
      tickOpacity.value = 0;
      countOpacity.value = 1;
      return;
    }
    // Ring progress + tick + count swap land with the success toast (~80–100ms).
    countOpacity.value = withTiming(0, { duration: 90 });
    tickOpacity.value = withTiming(1, { duration: 90 });
    tickScale.value = withTiming(1, { duration: 110 });
    const clear = setTimeout(() => {
      tickOpacity.value = withTiming(0, { duration: 160 });
      countOpacity.value = withTiming(1, { duration: 160 });
      tickScale.value = withTiming(0.92, { duration: 160 });
    }, 520);
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
      letterSpacing: -0.3,
    },
    limit: { color: themeColors.muted, fontSize: size >= 84 ? 16 : 14 },
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
      accessibilityLabel ||
      (capped
        ? t('checkIn.ringProgress', { count: safeVisits, limit: limitNum })
        : t('checkIn.ringUnlimited', { count: safeVisits })),
    [accessibilityLabel, capped, safeVisits, limitNum, t]
  );

  const ring = (
    <View style={styles.wrap} accessibilityRole={onPress ? undefined : 'image'} accessibilityLabel={label}>
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
            <Text latin display style={[metricDisplayStyle(styles.count), { color: countColor }]}>
              {safeVisits}
              <Text style={styles.limit}>/{limitNum}</Text>
            </Text>
            <Text style={styles.unit}>{t('checkIn.ringUnit')}</Text>
          </>
        ) : (
          <>
            <Text latin display style={[metricDisplayStyle(styles.count), { color: c.text }]}>
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
            stroke={tickStroke}
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

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        {ring}
      </Pressable>
    );
  }

  return ring;
}
