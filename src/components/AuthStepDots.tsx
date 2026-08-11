import { View } from 'react-native';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

/**
 * Quiet progress dots for auth multi-step flows (0-based active index).
 * Matches web AuthStepDots — compact, no labels (subtitle carries meaning).
 */
export function AuthStepDots({ activeIndex = 0, steps = 2 }: { activeIndex?: number; steps?: number }) {
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 6,
      marginBottom: 14,
    },
    dot: {
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dotActive: {
      width: 28,
      backgroundColor: c.accent,
    },
    dotIdle: {
      width: 10,
    },
  }));

  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: steps, now: activeIndex + 1 }}>
      {Array.from({ length: steps }, (_, i) => (
        <View key={i} style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotIdle]} />
      ))}
    </View>
  );
}
