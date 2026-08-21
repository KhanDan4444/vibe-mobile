import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/src/components/ui/Button';
import { useTheme } from '@/src/context/PreferencesContext';
import { radiusLg, space } from '@/src/theme/tokens';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** warm = default accent; quiet = muted desk empties; brand = teal wash */
  tone?: 'warm' | 'quiet' | 'brand';
  compact?: boolean;
};

/** Designed empty list state — warm accent icon, title, one sentence, optional CTA. */
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  body,
  actionLabel,
  onAction,
  tone = 'warm',
  compact = false,
}: Props) {
  const { colors: c } = useTheme();
  const quiet = tone === 'quiet';
  const brand = tone === 'brand';
  const iconColor = quiet ? c.dim : brand ? c.accentText : c.warm;
  const iconBg = quiet ? c.inputBg : brand ? c.accentSoft : c.warmSoft;

  const styles = useThemedStyles((colors) => ({
    wrap: {
      alignItems: 'center' as const,
      paddingTop: compact ? space.lg : space.xxl + 16,
      paddingHorizontal: space.xl,
      paddingBottom: compact ? space.md : space.xl,
      alignSelf: 'center' as const,
      maxWidth: 360,
      width: '100%' as const,
    },
    iconWrap: {
      width: compact || quiet ? 44 : 56,
      height: compact || quiet ? 44 : 56,
      borderRadius: radiusLg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: compact ? space.md : space.lg,
      elevation: 0,
      shadowOpacity: 0,
    },
    title: {
      fontSize: quiet || compact ? 15 : 17,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
      color: quiet ? colors.muted : colors.text,
      textAlign: 'center' as const,
    },
    body: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 20,
      color: colors.dim,
      textAlign: 'center' as const,
    },
    action: {
      marginTop: 18,
      alignSelf: 'stretch' as const,
    },
  }));

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.wrap} accessibilityRole="summary">
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={compact || quiet ? 22 : 26} color={iconColor} />
      </View>
      <Text display={!quiet} style={styles.title}>
        {title}
      </Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </Animated.View>
  );
}
