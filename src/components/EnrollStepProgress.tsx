import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
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
  /** Kept for call-site compatibility; connectors no longer animate. */
  reduceMotion?: boolean;
};

function labelAlign(index: number, total: number): 'left' | 'center' | 'right' {
  if (index === 0) return 'left';
  if (index === total - 1) return 'right';
  return 'center';
}

/**
 * Numbered enroll progress — edge-aligned steps, sized under form fields (~50px).
 * Connectors are plain horizontal bars (no scaleX — that breaks on RN).
 */
export function EnrollStepProgress({
  steps,
  current,
  maxReached = current,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const furthest = Math.max(current, maxReached);
  const styles = useThemedStyles((colors) => ({
    wrap: { marginBottom: 18, width: '100%' as const },
    trackRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      width: '100%' as const,
      height: 44,
    },
    line: {
      flex: 1,
      height: 2,
      borderRadius: 1,
      marginHorizontal: 8,
    },
    // Footprint stays under form field height (~50) so steps don't dominate the page.
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
    // Matches web `h-10 w-10` (40px) relative to ~50px inputs.
    circle: {
      width: 36,
      height: 36,
      borderRadius: 18,
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
    numOn: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
    numOff: { color: colors.muted, fontSize: 14, fontWeight: '700' as const },
    labelsRow: {
      flexDirection: 'row' as const,
      marginTop: 6,
      width: '100%' as const,
    },
    labelCol: { flex: 1, minWidth: 0 },
    label: {
      fontSize: 11,
      fontWeight: '600' as const,
      lineHeight: 15,
    },
    labelActive: { color: colors.text },
    labelOn: { color: colors.text },
    labelOff: { color: colors.muted },
    lineOn: { backgroundColor: colors.accent },
    lineOff: { backgroundColor: colors.border },
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

  const nodes: ReactNode[] = [];
  steps.forEach((step, index) => {
    const n = index + 1;
    const isActive = n === current;
    const completed = n < current;
    const unlocked = n <= furthest;
    const clickable = Boolean(onSelect) && unlocked && !isActive;

    if (index > 0) {
      const connectorOn = furthest >= n;
      nodes.push(
        <View
          key={`line-${step.id}`}
          style={[styles.line, connectorOn ? styles.lineOn : styles.lineOff]}
        />
      );
    }

    nodes.push(
      <Pressable
        key={step.id}
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
              isActive
                ? styles.circleOn
                : completed || unlocked
                  ? styles.circleVisited
                  : styles.circleOff,
            ]}
          >
            {completed ? (
              <Ionicons name="checkmark" size={18} color="#fff" />
            ) : (
              <Text style={unlocked ? styles.numOn : styles.numOff}>{n}</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  });

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
      <View style={styles.trackRow}>{nodes}</View>

      <View style={styles.labelsRow}>
        {steps.map((step, index) => {
          const n = index + 1;
          const isActive = n === current;
          const unlocked = n <= furthest;
          const align = labelAlign(index, steps.length);

          return (
            <View key={`${step.id}-label`} style={styles.labelCol}>
              <Text
                style={[
                  styles.label,
                  { textAlign: align },
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
