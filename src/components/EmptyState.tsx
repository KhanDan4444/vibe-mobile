import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/PreferencesContext';
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
      paddingTop: 48,
      paddingHorizontal: 24,
      paddingBottom: 24,
      alignSelf: 'center' as const,
      maxWidth: 360,
      width: '100%' as const,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.warmSoft,
      borderWidth: 1,
      borderColor: 'rgba(180,83,9,0.22)',
      marginBottom: 14,
    },
    title: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
      textAlign: 'center' as const,
    },
    body: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 20,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    action: {
      marginTop: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.accent,
    },
    actionText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600' as const,
    },
  }));

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.wrap} accessibilityRole="summary">
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={24} color={c.warmText} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.action} onPress={onAction} accessibilityRole="button">
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
