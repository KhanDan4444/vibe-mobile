import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAuthThemeForced } from '@/src/context/AuthThemeContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { AUTH, authFieldRing } from '@/src/theme/authChrome';
import { FIELD_MIN_HEIGHT, FIELD_RADIUS, fieldRingStyle } from '@/src/theme/fieldChrome';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

type PickerTriggerProps = {
  children: React.ReactNode;
  onPress: () => void;
  /** Compact toolbar control (sort) vs full-width field/filter trigger. */
  size?: 'compact' | 'field';
  open?: boolean;
  error?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Shared face for sheet pickers — flat card chrome + trailing chevron (matches Field).
 */
export function PickerTrigger({
  children,
  onPress,
  size = 'field',
  open,
  error,
  style,
  accessibilityLabel,
}: PickerTriggerProps) {
  const { colors: c } = useTheme();
  const authSurface = useAuthThemeForced();
  const styles = useThemedStyles((colors) => ({
    field: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      paddingHorizontal: authSurface ? 16 : 14,
      paddingVertical: 12,
      minHeight: authSurface ? 50 : FIELD_MIN_HEIGHT,
      borderRadius: FIELD_RADIUS,
      backgroundColor: authSurface ? AUTH.fieldBg : colors.card,
      elevation: 0,
      shadowOpacity: 0,
    },
    compact: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignSelf: 'flex-start' as const,
      minHeight: 36,
      borderRadius: FIELD_RADIUS,
      backgroundColor: colors.card,
      elevation: 0,
      shadowOpacity: 0,
    },
    body: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      minWidth: 0,
    },
    bodyField: {
      flex: 1,
    },
  }));

  return (
    <Pressable
      onPress={onPress}
      style={[
        size === 'compact' ? styles.compact : styles.field,
        authSurface && size === 'field'
          ? authFieldRing({ open, error })
          : fieldRingStyle(c, { open, error }),
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={null}
    >
      <View style={[styles.body, size === 'field' && styles.bodyField]}>{children}</View>
      <Ionicons
        name="chevron-down"
        size={size === 'compact' ? 16 : 18}
        color={open ? (authSurface ? AUTH.link : c.accentText) : authSurface ? AUTH.textDim : c.muted}
      />
    </Pressable>
  );
}
