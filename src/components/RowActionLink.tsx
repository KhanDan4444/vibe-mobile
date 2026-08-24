import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { AppText as Text } from '@/src/components/AppText';

type IonName = ComponentProps<typeof Ionicons>['name'];

/** Quiet row CTA (Renew / Restore) — icon + label, easy 44px hit target. */
export function RowActionLink({
  label,
  icon,
  color,
  busy,
  onPress,
  emphasized,
}: {
  label: string;
  icon: IonName;
  color: string;
  busy?: boolean;
  onPress: () => void;
  /** Slightly heavier type + icon (dashboard Renew). */
  emphasized?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      hitSlop={8}
      onPress={(e) => {
        e.stopPropagation?.();
        onPress();
      }}
      style={({ pressed }) => [
        {
          minHeight: 44,
          minWidth: 44,
          paddingVertical: 8,
          paddingHorizontal: 4,
          marginRight: -4,
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'flex-end' as const,
          gap: 5,
          opacity: busy ? 0.55 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={emphasized ? 21 : 18} color={color} />
      <Text
        style={{
          fontSize: emphasized ? 17 : 16,
          fontWeight: '700',
          letterSpacing: 0.15,
          color,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
