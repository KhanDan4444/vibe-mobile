import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/context/PreferencesContext';

export type FlashVariant = 'success' | 'offline';

export type FlashToast = {
  title: string;
  subtitle?: string;
  variant?: FlashVariant;
  icon?: keyof typeof Ionicons.glyphMap;
};

type FlashBannerProps = {
  toast: FlashToast | null;
  onDismiss: () => void;
};

/** Short enough to read; long enough to notice without blocking the screen. */
const DISMISS_MS = 2800;

function variantAccent(variant: FlashVariant) {
  if (variant === 'offline') {
    return { accent: '#fbbf24', icon: 'cloud-offline-outline' as const };
  }
  return { accent: '#34d399', icon: 'checkmark-circle' as const };
}

/**
 * Compact bottom snackbar — sits above the system nav (not under the status bar),
 * so gesture / notification chrome does not cover it.
 */
export function FlashBanner({ toast, onDismiss }: FlashBannerProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(28);
  const opacity = useSharedValue(0);
  const dismissing = useRef(false);

  const dismissAnimated = () => {
    if (dismissing.current) return;
    dismissing.current = true;
    translateY.value = withTiming(20, { duration: 160, easing: Easing.in(Easing.quad) });
    opacity.value = withTiming(0, { duration: 160 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
  };

  useEffect(() => {
    if (!toast) {
      dismissing.current = false;
      translateY.value = 28;
      opacity.value = 0;
      return undefined;
    }

    dismissing.current = false;
    translateY.value = withSpring(0, { damping: 18, stiffness: 280, mass: 0.7 });
    opacity.value = withTiming(1, { duration: 180 });

    const timer = setTimeout(dismissAnimated, DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!toast) return null;

  const variant = toast.variant ?? 'success';
  const { accent, icon: fallbackIcon } = variantAccent(variant);
  const iconName = toast.icon ?? fallbackIcon;
  // Success: title-only keeps the bar slim. Offline keeps subtitle for context.
  const showSubtitle = variant === 'offline' && Boolean(toast.subtitle);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          // Clear Android/iOS system nav; also clears typical tab bar height.
          bottom: Math.max(insets.bottom, 10) + 56,
        },
      ]}
    >
      <Animated.View style={shellStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toast.title}
          onPress={dismissAnimated}
          style={[
            styles.bar,
            {
              backgroundColor: isDark ? '#1c2330' : '#0f172a',
              borderColor: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.08)',
              shadowColor: '#000',
            },
          ]}
        >
          <View style={[styles.accent, { backgroundColor: accent }]} />
          <Ionicons name={iconName} size={18} color={accent} style={styles.icon} />
          <View style={styles.copy}>
            <Text style={[styles.title, { color: '#f8fafc' }]} numberOfLines={1}>
              {toast.title}
            </Text>
            {showSubtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {toast.subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 200,
    elevation: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingRight: 14,
    overflow: 'hidden',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
    marginRight: 10,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  icon: {
    marginRight: 8,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#94a3b8',
  },
});
