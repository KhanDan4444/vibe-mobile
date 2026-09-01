import { ActivityIndicator, Pressable } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';

/** Secondary action chip — shared by member pass + gym QR sheets. */
export function QrSheetActionButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors: c } = useTheme();
  const idle = Boolean(disabled && !loading);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: pressed && !idle ? c.inputBg : c.card,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        opacity: idle ? 0.5 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={c.muted} size="small" />
      ) : (
        <Text style={{ fontSize: 13, fontWeight: '500', color: c.text }} numberOfLines={2}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
