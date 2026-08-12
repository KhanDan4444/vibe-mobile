import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { space } from '@/src/theme/tokens';
import { statusWashOpaque } from '@/src/utils/statusWash';

type Props = {
  label: string;
  value: string | number;
  accent?: string;
  /** attention = unpaid / due soon / expired; neutral = active / total. */
  tone?: 'attention' | 'neutral';
  layoutStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Center content (reports grid). Default is start-aligned like dashboard. */
  align?: 'start' | 'center';
};

/**
 * Elevated metric tile — attention counts get a status wash; zeros stay quiet.
 * Shared by dashboard + reports.
 */
export function MetricStatCard({
  label,
  value,
  accent,
  tone = 'neutral',
  layoutStyle,
  onPress,
  align = 'start',
}: Props) {
  const { colors: c } = useTheme();
  const count = Number(value) || 0;
  const hot = tone === 'attention' && count > 0 && Boolean(accent);
  const quiet = count === 0;
  const valueColor = quiet
    ? c.dim
    : hot && accent
      ? accent
      : accent && tone === 'neutral'
        ? accent
        : c.text;

  const card = (
    <SoftSurface
      variant="row"
      // Hot wash cards stay flat — Android elevation + tinted fills still halo on some devices.
      flat={hot}
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}`}
      style={[
        styles.card,
        align === 'center' ? styles.cardCenter : null,
        hot && accent
          ? {
              backgroundColor: statusWashOpaque(accent, c.card, 0.12),
              borderColor: statusWashOpaque(accent, c.cardEdge, 0.35),
            }
          : null,
      ]}
    >
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text
        style={[
          styles.label,
          { color: quiet ? c.dim : c.muted, textAlign: align === 'center' ? 'center' : 'left' },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </SoftSurface>
  );

  if (!layoutStyle) return card;
  return <View style={layoutStyle}>{card}</View>;
}

const styles = {
  card: {
    flex: 1,
    minHeight: 76,
    paddingVertical: space.md + 2,
    paddingHorizontal: space.md,
    justifyContent: 'center' as const,
  },
  cardCenter: {
    alignItems: 'center' as const,
  },
  value: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.6 },
  label: { marginTop: 4, fontSize: 12, lineHeight: 16 },
};
