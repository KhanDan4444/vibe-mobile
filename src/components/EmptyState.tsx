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
};

/** Designed empty list state — warm accent icon, title, one sentence, optional CTA. */
export function EmptyState({ icon = 'file-tray-outline', title, body, actionLabel, onAction }: Props) {
  const { colors: c } = useTheme();
  const styles = useThemedStyles((colors) => ({
    wrap: {
      alignItems: 'center' as const,
      paddingTop: space.xxl + 16,
      paddingHorizontal: space.xl,
      paddingBottom: space.xl,
      alignSelf: 'center' as const,
      maxWidth: 360,
      width: '100%' as const,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: radiusLg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.warmSoft,
      marginBottom: space.lg,
      elevation: 0,
      shadowOpacity: 0,
    },
    title: {
      fontSize: 17,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
      color: colors.text,
      textAlign: 'center' as const,
    },
    body: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 22,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    action: {
      marginTop: 18,
      alignSelf: 'stretch' as const,
    },
  }));

  return (
    <Animated.View entering={FadeIn.duration(320)} style={styles.wrap} accessibilityRole="summary">
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={c.warm} />
      </View>
      <Text display style={styles.title}>
        {title}
      </Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </Animated.View>
  );
}
