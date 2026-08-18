import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { AppText as Text } from '@/src/components/AppText';

type IonName = ComponentProps<typeof Ionicons>['name'];

/** Green row CTA (Renew / Restore) — 44px tap target so it is easy to hit. */
export function RowActionLink({
  label,
  icon,
  color,
  busy,
  onPress,
}: {
  label: string;
  icon: IonName;
  color: string;
  busy?: boolean;
  onPress: () => void;
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
          paddingHorizontal: 8,
          marginRight: -8,
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'flex-end' as const,
          gap: 6,
          opacity: busy ? 0.55 : pressed ? 0.65 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={{ fontSize: 14, fontWeight: '600', color }}>{label}</Text>
    </Pressable>
  );
}
