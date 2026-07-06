import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
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

const DISMISS_MS = 3800;

function variantStyles(variant: FlashVariant, isDark: boolean) {
  if (variant === 'offline') {
    return {
      accent: '#fbbf24',
      accentSoft: isDark ? 'rgba(251, 191, 36, 0.16)' : 'rgba(251, 191, 36, 0.12)',
      border: isDark ? 'rgba(251, 191, 36, 0.45)' : 'rgba(217, 119, 6, 0.35)',
      icon: 'cloud-offline-outline' as const,
    };
  }
  return {
    accent: '#34d399',
    accentSoft: isDark ? 'rgba(52, 211, 153, 0.16)' : 'rgba(5, 150, 105, 0.1)',
    border: isDark ? 'rgba(52, 211, 153, 0.42)' : 'rgba(5, 150, 105, 0.28)',
    icon: 'checkmark-circle' as const,
  };
}

export function FlashBanner({ toast, onDismiss }: FlashBannerProps) {
  const { t } = useTranslation();
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(24);
  const opacity = useSharedValue(0);
  const progress = useSharedValue(1);
  const dismissing = useRef(false);

  const dismissAnimated = () => {
    if (dismissing.current) return;
    dismissing.current = true;
    translateY.value = withTiming(18, { duration: 180, easing: Easing.in(Easing.quad) });
    opacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
  };

  useEffect(() => {
    if (!toast) {
      dismissing.current = false;
      translateY.value = 24;
      opacity.value = 0;
      progress.value = 1;
      return undefined;
    }

    dismissing.current = false;
    translateY.value = withSpring(0, { damping: 16, stiffness: 240, mass: 0.8 });
    opacity.value = withTiming(1, { duration: 220 });
    progress.value = 1;
    progress.value = withTiming(0, { duration: DISMISS_MS, easing: Easing.linear });

    const timer = setTimeout(dismissAnimated, DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.max(progress.value, 0) * 100}%`,
  }));

  if (!toast) return null;

  const variant = toast.variant ?? 'success';
  const palette = variantStyles(variant, isDark);
  const iconName = toast.icon ?? palette.icon;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 10 }]}>
      <Animated.View style={shellStyle}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: c.card,
              borderColor: palette.border,
              shadowColor: isDark ? '#000' : '#0f172a',
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: palette.accentSoft }]}>
            <Ionicons name={iconName} size={22} color={palette.accent} />
          </View>

          <View style={styles.copy}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
              {toast.title}
            </Text>
            {toast.subtitle ? (
              <Text style={[styles.subtitle, { color: c.muted }]} numberOfLines={2}>
                {toast.subtitle}
              </Text>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.dismiss')}
            hitSlop={10}
            onPress={dismissAnimated}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={18} color={c.dim} />
          </Pressable>

          <View style={[styles.progressTrack, { backgroundColor: palette.accentSoft }]}>
            <Animated.View style={[styles.progressFill, { backgroundColor: palette.accent }, progressStyle]} />
          </View>
        </View>
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
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 12,
    paddingTop: 14,
    paddingBottom: 16,
    overflow: 'hidden',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: {
    alignSelf: 'flex-start',
    padding: 2,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});
