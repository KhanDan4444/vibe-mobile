import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { space } from '@/src/theme/tokens';
import { statusWashOpaque } from '@/src/utils/statusWash';

type Props = {
  label: string;
  value: string | number;
  accent?: string;
  /** attention = expired / unpaid wash when count > 0; neutral = active / due soon. */
  tone?: 'attention' | 'neutral';
  /** Optional line under the label (e.g. period). */
  caption?: string;
  captionColor?: string;
  /** Optional status icon (top-right), sized for dense metric tiles. */
  icon?: keyof typeof Ionicons.glyphMap;
  layoutStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Center content (reports grid). Default is start-aligned like dashboard. */
  align?: 'start' | 'center';
};

/**
 * Elevated metric tile — expired counts get a status wash; zeros stay quiet.
 * Shared by dashboard + reports.
 */
export function MetricStatCard({
  label,
  value,
  accent,
  tone = 'neutral',
  caption,
  captionColor,
  icon,
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
  const iconColor = quiet ? c.dim : accent || c.muted;
  const alignText = align === 'center' ? ('center' as const) : ('left' as const);
  const showIcon = Boolean(icon) && align !== 'center';

  const card = (
    <SoftSurface
      variant="row"
      // Hot wash cards stay flat — Android elevation + tinted fills still halo on some devices.
      flat={hot}
      onPress={onPress}
      accessibilityLabel={caption ? `${label}: ${value}. ${caption}` : `${label}: ${value}`}
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
      {showIcon ? (
        <View style={styles.header}>
          <Text
            style={[styles.labelHeader, { color: quiet ? c.dim : c.muted }]}
            numberOfLines={2}
          >
            {label}
          </Text>
          <Ionicons
            name={icon}
            size={15}
            color={iconColor}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
      ) : null}
      <Text display style={[styles.value, { color: valueColor }]}>
        {value}
      </Text>
      {!showIcon ? (
        <Text
          style={[styles.label, { color: quiet ? c.dim : c.muted, textAlign: alignText }]}
          numberOfLines={2}
        >
          {label}
        </Text>
      ) : null}
      {caption ? (
        <Text
          style={[styles.caption, { color: captionColor ?? c.success, textAlign: alignText }]}
          numberOfLines={1}
        >
          {caption}
        </Text>
      ) : null}
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
  header: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
    marginBottom: 6,
  },
  labelHeader: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  value: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.6 },
  label: { marginTop: 4, fontSize: 12, lineHeight: 16 },
  caption: { marginTop: 1, fontSize: 10, fontWeight: '500' as const, lineHeight: 12 },
};
