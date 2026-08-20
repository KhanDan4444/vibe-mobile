import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

export type EnrollStep = {
  id: string;
  label: string;
};

type Props = {
  steps: EnrollStep[];
  current: number;
  maxReached?: number;
  onSelect?: (step: number) => void;
  reduceMotion?: boolean;
};

function ConnectorFill({
  on,
  color,
  reduceMotion,
}: {
  on: boolean;
  color: string;
  reduceMotion: boolean;
}) {
  const progress = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? on
        ? 1
        : 0
      : withTiming(on ? 1 : 0, { duration: 280 });
  }, [on, reduceMotion, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          height: 2,
          width: '100%',
          backgroundColor: color,
          transformOrigin: 'left center',
        },
        fillStyle,
      ]}
    />
  );
}

/**
 * Numbered 3-step enroll progress (matches web EnrollStepProgress).
 * Active step has a ring; visited steps stay tappable; upcoming stay locked.
 */
export function EnrollStepProgress({
  steps,
  current,
  maxReached = current,
  onSelect,
  reduceMotion = false,
}: Props) {
  const { t } = useTranslation();
  const furthest = Math.max(current, maxReached);
  const styles = useThemedStyles((colors) => ({
    wrap: { marginBottom: 20 },
    row: { flexDirection: 'row' as const, alignItems: 'flex-start' as const },
    col: { flex: 1, minWidth: 0, alignItems: 'center' as const },
    top: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      width: '100%' as const,
      height: 44,
    },
    lineTrack: {
      flex: 1,
      height: 2,
      borderRadius: 1,
      overflow: 'hidden' as const,
      backgroundColor: colors.border,
    },
    ring: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    ringActive: { borderColor: colors.accent },
    ringQuiet: { borderColor: 'transparent' },
    circle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    circleOn: { backgroundColor: colors.accent },
    circleVisited: { backgroundColor: `${colors.accent}CC` },
    circleOff: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    numOn: { color: '#fff', fontSize: 13, fontWeight: '700' as const },
    numOff: { color: colors.muted, fontSize: 13, fontWeight: '700' as const },
    label: {
      marginTop: 6,
      minHeight: 32,
      width: '100%' as const,
      textAlign: 'center' as const,
      fontSize: 11,
      fontWeight: '600' as const,
      lineHeight: 15,
    },
    labelActive: { color: colors.text },
    labelOn: { color: colors.text },
    labelOff: { color: colors.muted },
  }));

  const active = steps[current - 1];
  const next = steps[current] ?? null;
  const total = steps.length;
  const nextLabel = next ? t('enroll.nextStep', { step: next.label }) : t('enroll.nextDone');

  const announcedRef = useRef('');
  useEffect(() => {
    if (!active) return;
    const message = `${t('enroll.stepOfShort', { current, total })}. ${active.label}. ${nextLabel}`;
    if (announcedRef.current === message) return;
    announcedRef.current = message;
    AccessibilityInfo.announceForAccessibility(message);
  }, [active, current, total, nextLabel, t]);

  const accent = styles.circleOn.backgroundColor as string;

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
      <View style={styles.row}>
        {steps.map((step, index) => {
          const n = index + 1;
          const isActive = n === current;
          const completed = n < current;
          const unlocked = n <= furthest;
          const clickable = Boolean(onSelect) && unlocked && !isActive;
          const leftOn = n > 1 && n <= furthest;
          const rightOn = n < furthest;

          return (
            <View key={step.id} style={styles.col}>
              <View style={styles.top}>
                <View style={[styles.lineTrack, { opacity: index === 0 ? 0 : 1 }]}>
                  <ConnectorFill on={leftOn} color={accent} reduceMotion={reduceMotion} />
                </View>
                <Pressable
                  onPress={() => {
                    if (clickable) onSelect?.(n);
                  }}
                  disabled={!clickable}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive, disabled: !unlocked }}
                  accessibilityLabel={step.label}
                  hitSlop={8}
                >
                  <View style={[styles.ring, isActive ? styles.ringActive : styles.ringQuiet]}>
                    <View
                      style={[
                        styles.circle,
                        isActive ? styles.circleOn : completed || unlocked ? styles.circleVisited : styles.circleOff,
                      ]}
                    >
                      {completed ? (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      ) : (
                        <Text style={unlocked ? styles.numOn : styles.numOff}>{n}</Text>
                      )}
                    </View>
                  </View>
                </Pressable>
                <View style={[styles.lineTrack, { opacity: index === steps.length - 1 ? 0 : 1 }]}>
                  <ConnectorFill on={rightOn} color={accent} reduceMotion={reduceMotion} />
                </View>
              </View>
              <Text
                style={[
                  styles.label,
                  isActive ? styles.labelActive : unlocked ? styles.labelOn : styles.labelOff,
                ]}
                numberOfLines={2}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
