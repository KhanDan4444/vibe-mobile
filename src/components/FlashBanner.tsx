import { Ionicons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
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
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';

export type FlashVariant = 'success' | 'offline' | 'danger';

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

/** Visible long enough to read title + subtitle without feeling sticky. */
const DISMISS_MS = 4000;

/** Matches tab bar content height in `(tabs)/_layout` (tablet 58 / phone 52). */
function tabBarClearance(isTablet: boolean) {
  return isTablet ? 58 : 52;
}

/**
 * Bottom snackbar — full-width enough to read, cleared above the tab bar on tabs
 * and tucked into the safe-area gutter on stack screens so it does not sit mid-card.
 */
export function FlashBanner({ toast, onDismiss }: FlashBannerProps) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsiveLayout();
  const segments = useSegments();
  const onTabs = segments[0] === '(tabs)';
  const translateY = useSharedValue(32);
  const opacity = useSharedValue(0);
  const dismissing = useRef(false);

  const dismissAnimated = () => {
    if (dismissing.current) return;
    dismissing.current = true;
    translateY.value = withTiming(24, { duration: 180, easing: Easing.in(Easing.quad) });
    opacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
  };

  useEffect(() => {
    if (!toast) {
      dismissing.current = false;
      translateY.value = 32;
      opacity.value = 0;
      return undefined;
    }

    dismissing.current = false;
    translateY.value = withSpring(0, { damping: 18, stiffness: 260, mass: 0.75 });
    opacity.value = withTiming(1, { duration: 200 });

    const timer = setTimeout(dismissAnimated, DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!toast) return null;

  const variant = toast.variant ?? 'success';
  const accent =
    variant === 'offline' ? c.warning : variant === 'danger' ? c.error : c.success;
  const iconName =
    toast.icon ??
    (variant === 'offline'
      ? 'cloud-offline-outline'
      : variant === 'danger'
        ? 'trash-outline'
        : 'checkmark-circle');
  const showSubtitle = Boolean(toast.subtitle);
  const bottomPad = Math.max(insets.bottom, 12) + (onTabs ? tabBarClearance(isTablet) + 10 : 16);

  const surface = isDark
    ? {
        backgroundColor: c.card,
        borderColor: c.border,
        titleColor: c.text,
        subtitleColor: c.muted,
        iconBg: `${accent}22`,
        shadowOpacity: 0.35,
      }
    : {
        backgroundColor:
          variant === 'danger' ? '#fff1f2' : variant === 'offline' ? '#fffbeb' : '#ecfdf5',
        borderColor:
          variant === 'danger'
            ? 'rgba(225,29,72,0.18)'
            : variant === 'offline'
              ? 'rgba(217,119,6,0.22)'
              : 'rgba(5,150,105,0.22)',
        titleColor: c.text,
        subtitleColor: c.muted,
        iconBg:
          variant === 'danger'
            ? 'rgba(225,29,72,0.1)'
            : variant === 'offline'
              ? 'rgba(217,119,6,0.12)'
              : 'rgba(5,150,105,0.12)',
        shadowOpacity: 0.12,
      };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: bottomPad }]}>
      <Animated.View style={shellStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toast.title}
          onPress={dismissAnimated}
          style={[
            styles.bar,
            {
              backgroundColor: surface.backgroundColor,
              borderColor: surface.borderColor,
              shadowColor: '#000',
              shadowOpacity: surface.shadowOpacity,
            },
          ]}
        >
          <View style={[styles.accent, { backgroundColor: accent }]} />
          <View style={[styles.iconWrap, { backgroundColor: surface.iconBg }]}>
            <Ionicons name={iconName} size={22} color={accent} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: surface.titleColor }]} numberOfLines={2}>
              {toast.title}
            </Text>
            {showSubtitle ? (
              <Text style={[styles.subtitle, { color: surface.subtitleColor }]} numberOfLines={2}>
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
    left: 14,
    right: 14,
    zIndex: 200,
    elevation: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingRight: 16,
    overflow: 'hidden',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: 12,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
