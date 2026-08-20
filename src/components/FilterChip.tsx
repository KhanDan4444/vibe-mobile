import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { usePreferences } from '@/src/context/PreferencesContext';
import { radiusMd } from '@/src/theme/tokens';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { appTextStyle } from '@/src/theme/typography';

type FilterChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** Optional leading status dot. */
  dotColor?: string;
  /** Optional selected fill/text (Former uses stone instead of teal). */
  selectedColor?: string;
  /** Solid selected pill (Team Staff | Trainers). Default soft wash. */
  solid?: boolean;
  /** Optional trailing count badge. */
  count?: number | string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared quiet filter chip — period pills, member status filters, etc.
 * Selected: soft fill by default; `solid` for high-contrast segment controls.
 */
export function FilterChip({
  label,
  selected,
  onPress,
  dotColor,
  selectedColor,
  solid = false,
  count,
  style,
}: FilterChipProps) {
  const { language } = usePreferences();
  const styles = useThemedStyles((colors) => ({
    chip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radiusMd,
      minHeight: 36,
      backgroundColor: 'transparent',
      flexShrink: 0,
    },
    chipActive: {
      backgroundColor: colors.accentSoft,
    },
    chipActiveSolid: {
      backgroundColor: colors.accent,
    },
    label: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.muted,
    },
    labelActive: {
      color: colors.accentText,
    },
    labelActiveSolid: {
      color: '#fff',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    countBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 5,
      backgroundColor: colors.border,
    },
    countBadgeActive: {
      backgroundColor: colors.accentText,
    },
    countBadgeActiveSolid: {
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    countText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.muted,
    },
    countTextActive: {
      color: '#fff',
    },
  }));

  const solidSelected = Boolean(selected && solid);
  const softCustom = Boolean(selected && selectedColor && !solid);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected && !solid ? styles.chipActive : null,
        solidSelected ? styles.chipActiveSolid : null,
        softCustom ? { backgroundColor: `${selectedColor}18` } : null,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
    >
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <Text
        style={appTextStyle(language, {
          ...styles.label,
          ...(selected && !solid ? styles.labelActive : {}),
          ...(solidSelected ? styles.labelActiveSolid : {}),
          ...(softCustom ? { color: selectedColor } : {}),
        })}
      >
        {label}
      </Text>
      {count != null ? (
        <View
          style={[
            styles.countBadge,
            selected && !solid ? styles.countBadgeActive : null,
            solidSelected ? styles.countBadgeActiveSolid : null,
            softCustom ? { backgroundColor: selectedColor } : null,
          ]}
        >
          <Text
            style={appTextStyle(language, {
              ...styles.countText,
              ...(selected ? styles.countTextActive : {}),
            })}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
