import { Ionicons } from '@expo/vector-icons';
import { useSegments } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import Animated, {
  cancelAnimation,
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
  durationMs?: number;
  urgent?: boolean;
  actionHint?: string;
  action?: { label: string; onPress: () => void };
};

export type FlashToastRecord = FlashToast & { id: string };

type FlashToasterProps = {
  toasts: FlashToastRecord[];
  onDismiss: (id: string) => void;
};

/** Match web — long enough to read title + subtitle. */
export const FLASH_DISMISS_MS = 4500;
const EXIT_MS = 180;
const MAX_VISIBLE_TOASTS = 5;

/** Matches tab bar content height in `(tabs)/_layout` (tablet 58 / phone 52). */
function tabBarClearance(isTablet: boolean) {
  return isTablet ? 58 : 52;
}

function toastIcon(variant: FlashVariant, icon?: FlashToast['icon']) {
  if (icon) return icon;
  if (variant === 'offline') return 'cloud-offline-outline';
  if (variant === 'danger') return 'trash-outline';
  return 'checkmark-circle-outline';
}

function toastAccent(variant: FlashVariant, colors: ReturnType<typeof useTheme>['colors']) {
  if (variant === 'offline') return colors.warning;
  if (variant === 'danger') return colors.error;
  return colors.success;
}

const SWIPE_DISMISS_PX = 72;

function FlashToastItem({
  toast,
  onDismiss,
}: {
  toast: FlashToastRecord;
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { colors: c, isDark } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const durationMs = toast.durationMs ?? FLASH_DISMISS_MS;
  const translateY = useSharedValue(18);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const progress = useSharedValue(1);
  const dismissingRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const finishDismiss = useCallback(() => {
    dismissingRef.current = false;
    onDismissRef.current(toast.id);
  }, [toast.id]);

  const dismiss = useCallback(
    (immediate = false) => {
      if (dismissingRef.current) return;
      dismissingRef.current = true;
      clearTimers();
      cancelAnimation(progress);

      if (immediate || reduceMotion) {
        finishDismiss();
        return;
      }

      translateY.value = withTiming(14, { duration: EXIT_MS, easing: Easing.in(Easing.quad) });
      opacity.value = withTiming(0, { duration: EXIT_MS }, (finished) => {
        if (finished) runOnJS(finishDismiss)();
      });
    },
    [clearTimers, finishDismiss, opacity, progress, reduceMotion, translateY]
  );

  const startProgress = useCallback(() => {
    cancelAnimation(progress);
    progress.value = 1;
    progress.value = withTiming(0, { duration: durationMs, easing: Easing.linear });
  }, [durationMs, progress]);

  const pauseProgress = useCallback(() => {
    cancelAnimation(progress);
    clearTimers();
  }, [clearTimers, progress]);

  const resumeProgress = useCallback(() => {
    const remaining = Math.max(progress.value * durationMs, 0);
    if (remaining <= 0) return;
    progress.value = withTiming(0, { duration: remaining, easing: Easing.linear });
    dismissTimerRef.current = setTimeout(() => dismiss(false), remaining);
  }, [dismiss, durationMs, progress]);

  useEffect(() => {
    dismissingRef.current = false;
    translateX.value = 0;
    if (reduceMotion) {
      translateY.value = 0;
      opacity.value = 1;
    } else {
      translateY.value = withSpring(0, { damping: 18, stiffness: 260, mass: 0.75 });
      opacity.value = withTiming(1, { duration: 200 });
    }
    startProgress();
    dismissTimerRef.current = setTimeout(() => dismiss(false), durationMs);

    return () => {
      clearTimers();
      cancelAnimation(progress);
    };
  }, [toast.id, clearTimers, dismiss, durationMs, opacity, progress, reduceMotion, startProgress, translateX, translateY]);

  const dismissRef = useRef(dismiss);
  useEffect(() => {
    dismissRef.current = dismiss;
  }, [dismiss]);

  const hasAction = Boolean(toast.action?.label);
  const panResponder = useMemo(
    () =>
      hasAction
        ? PanResponder.create({})
        : PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) =>
              Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
            onPanResponderMove: (_, gesture) => {
              translateX.value = gesture.dx;
            },
            onPanResponderRelease: (_, gesture) => {
              if (Math.abs(gesture.dx) > SWIPE_DISMISS_PX || Math.abs(gesture.vx) > 0.65) {
                const offscreen = gesture.dx >= 0 ? 420 : -420;
                translateX.value = withTiming(offscreen, { duration: 160, easing: Easing.out(Easing.quad) });
                opacity.value = withTiming(0, { duration: 160 }, (finished) => {
                  if (finished) runOnJS(() => dismissRef.current(true))();
                });
                return;
              }
              translateX.value = withSpring(0, { damping: 20, stiffness: 280 });
            },
            onPanResponderTerminate: () => {
              translateX.value = withSpring(0, { damping: 20, stiffness: 280 });
            },
          }),
    [hasAction, opacity, translateX]
  );

  const shellStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(progress.value, 0) }],
  }));

  const variant = toast.variant ?? 'success';
  const accent = toastAccent(variant, c);
  const iconName = toastIcon(variant, toast.icon);
  const showSubtitle = Boolean(toast.subtitle) && !hasAction;
  const showAction = hasAction;
  const isUrgent = Boolean(toast.urgent);
  const accessibilityHint = [toast.subtitle, toast.actionHint].filter(Boolean).join(' ');

  const surface = {
    backgroundColor: c.card,
    borderColor: c.border,
    titleColor: c.text,
    subtitleColor: c.muted,
    iconBg: `${accent}22`,
    shadowOpacity: isDark ? 0.35 : 0.12,
  };

  return (
    <Animated.View
      style={shellStyle}
      {...panResponder.panHandlers}
      accessible
      accessibilityRole={isUrgent ? 'alert' : 'text'}
      accessibilityLiveRegion={isUrgent ? 'assertive' : 'polite'}
      accessibilityLabel={toast.title}
      accessibilityHint={accessibilityHint || undefined}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: surface.backgroundColor,
            borderColor: surface.borderColor,
            shadowOpacity: surface.shadowOpacity,
          },
        ]}
      >
      <Pressable
        onPressIn={pauseProgress}
        onPressOut={resumeProgress}
        style={styles.bodyPress}
      >
        <View style={[styles.accent, { backgroundColor: accent }]} />

        {!showAction ? (
          <View style={[styles.iconWrap, { backgroundColor: surface.iconBg }]}>
            <Ionicons name={iconName} size={18} color={accent} />
          </View>
        ) : null}

        <View style={styles.copy}>
          <Text style={[styles.title, { color: surface.titleColor }]} numberOfLines={1}>
            {toast.title}
          </Text>
          {showSubtitle ? (
            <Text style={[styles.subtitle, { color: surface.subtitleColor }]} numberOfLines={1}>
              {toast.subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>

        {showAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('flash.undoActionLabel', { action: toast.action?.label })}
            onPress={() => {
              toast.action?.onPress();
              dismiss(true);
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.undoBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.undoText, { color: accent }]}>{toast.action?.label}</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showAction ? t('flash.dismissPending') : t('common.dismiss')}
          hitSlop={8}
          onPress={() => dismiss(true)}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="close" size={18} color={c.muted} />
        </Pressable>

        <Animated.View
          pointerEvents="none"
          style={[styles.progressTrack, { backgroundColor: `${accent}22` }]}
        >
          {!reduceMotion ? (
            <Animated.View style={[styles.progressFill, { backgroundColor: accent }, progressStyle]} />
          ) : (
            <View style={[styles.progressFill, { backgroundColor: accent, opacity: 0.45 }]} />
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/**
 * Bottom snackbar stack — Material-style, above tab bar on tabs.
 * Newest toast sits closest to the thumb / tab bar.
 */
export default function FlashToaster({ toasts, onDismiss }: FlashToasterProps) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsiveLayout();
  const segments = useSegments();
  const onTabs = segments[0] === '(tabs)';
  const bottomPad = Math.max(insets.bottom, 12) + (onTabs ? tabBarClearance(isTablet) + 10 : 16);

  if (!toasts.length) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: bottomPad }]}>
      {toasts.map((toast) => (
        <FlashToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

export { MAX_VISIBLE_TOASTS };

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 200,
    elevation: 20,
    gap: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingRight: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  bodyPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
    marginRight: 10,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
    paddingRight: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  undoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  undoText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    transformOrigin: 'left',
  },
});
