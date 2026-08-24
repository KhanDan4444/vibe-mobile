import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppText as Text } from '@/src/components/AppText';
import { fabElevation } from '@/src/theme/elevation';
import { useTheme } from '@/src/context/PreferencesContext';

/** Deep teal fill — desk Scan QR dock (matches brand accent, not bright CTA teal). */
const DEEP_TEAL = '#0f766e';

function Corner({
  top,
  left,
  right,
  bottom,
}: {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.corner,
        top != null ? { top } : null,
        left != null ? { left } : null,
        right != null ? { right } : null,
        bottom != null ? { bottom } : null,
        top != null && left != null ? { borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 3 } : null,
        top != null && right != null
          ? { borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 3 }
          : null,
        bottom != null && left != null
          ? { borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 3 }
          : null,
        bottom != null && right != null
          ? { borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 3 }
          : null,
      ]}
    />
  );
}

/**
 * Centered Scan QR pill above the tab bar — CBE-style dock CTA for Check in.
 */
export function ScanQrDockButton({
  label,
  onPress,
  bottom = 20,
}: {
  label: string;
  onPress: () => void;
  bottom?: number;
}) {
  const { theme } = useTheme();

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          if (Platform.OS !== 'web') {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          onPress();
        }}
        style={({ pressed }) => [
          styles.pill,
          fabElevation(theme),
          { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <Corner top={8} left={12} />
        <Corner top={8} right={12} />
        <Corner bottom={8} left={12} />
        <Corner bottom={8} right={12} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  pill: {
    minWidth: 148,
    minHeight: 48,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: DEEP_TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: 'rgba(255,255,255,0.95)',
  },
});
