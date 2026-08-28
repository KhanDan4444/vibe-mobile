import { View } from 'react-native';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

type StepState = 'complete' | 'current' | 'upcoming';

/**
 * Step progress for auth multi-step flows (0-based active index).
 * Matches web AuthStepDots — accessible labels + completed-step polish.
 */
export function AuthStepDots({
  activeIndex = 0,
  steps = 2,
  stepLabels = [],
  progressLabel,
  /** When true, omit bottom margin (for AuthScreen headerCenter). */
  compact = false,
}: {
  activeIndex?: number;
  steps?: number;
  stepLabels?: string[];
  progressLabel?: string;
  compact?: boolean;
}) {
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(steps - 1, 0));

  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      marginBottom: compact ? 0 : 14,
    },
    dot: {
      height: 6,
      borderRadius: 3,
    },
    dotActive: {
      width: 28,
      backgroundColor: c.accent,
      shadowColor: c.accent,
      shadowOpacity: 0.35,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 2,
    },
    dotComplete: {
      width: 10,
      backgroundColor: 'rgba(94,234,212,0.62)',
    },
    dotIdle: {
      width: 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
  }));

  const stepState = (index: number): StepState =>
    index < safeIndex ? 'complete' : index === safeIndex ? 'current' : 'upcoming';

  const currentLabel = stepLabels[safeIndex] || `Step ${safeIndex + 1} of ${steps}`;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={progressLabel || currentLabel}
      accessibilityValue={{ min: 1, max: steps, now: safeIndex + 1 }}
    >
      {Array.from({ length: steps }, (_, i) => {
        const state = stepState(i);
        const label = stepLabels[i] || `Step ${i + 1} of ${steps}`;

        return (
          <View
            key={i}
            style={[
              styles.dot,
              state === 'current'
                ? styles.dotActive
                : state === 'complete'
                  ? styles.dotComplete
                  : styles.dotIdle,
            ]}
            accessible
            accessibilityRole="none"
            accessibilityLabel={
              state === 'current'
                ? `${label} (current step)`
                : state === 'complete'
                  ? `${label} (completed)`
                  : label
            }
            accessibilityState={{ selected: state === 'current' }}
            importantForAccessibility={state === 'current' ? 'yes' : 'no-hide-descendants'}
          />
        );
      })}
    </View>
  );
}
