import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { AppText as Text } from '@/src/components/AppText';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { elevationStyle } from '@/src/theme/elevation';
import { springs, timings } from '@/src/theme/motion';
import { radiusMd, radiusXl } from '@/src/theme/tokens';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions (delete / disable) render the confirm control in red. */
  destructive?: boolean;
  confirmLoading?: boolean;
  /**
   * Single primary button only (OK / Got it). Use for blockers and errors
   * instead of system Alert.alert.
   */
  alertOnly?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * In-app bottom sheet dialog. Prefer this over Alert.alert —
 * system alerts use a mismatched font/tint on Android.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  confirmLoading,
  alertOnly = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const { colors: c, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  const dismiss = onCancel ?? onConfirm;
  const primaryLabel = confirmLabel ?? (alertOnly ? t('common.ok') : t('common.confirm'));

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = 0;
      progress.value = withSpring(1, springs.sheet);
      return;
    }
    progress.value = withTiming(0, { duration: timings.fadeMs, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.5,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 24 }],
    opacity: 0.4 + progress.value * 0.6,
  }));

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <AnimatedPressable style={[styles.backdrop, backdropStyle]} onPress={dismiss} />
        <Animated.View
          style={[
            styles.card,
            elevationStyle('float', theme),
            {
              backgroundColor: c.card,
              borderColor: c.cardEdge,
              borderRadius: radiusXl,
              marginBottom: Math.max(insets.bottom, 16),
            },
            cardStyle,
          ]}
        >
          <Text display style={[styles.title, { color: c.text }]}>{title}</Text>
          <Text style={[styles.message, { color: c.muted }]}>{message}</Text>

          <View style={styles.actions}>
            {alertOnly ? null : (
              <SoftSurface
                flat
                onPress={confirmLoading ? undefined : dismiss}
                style={[styles.btn, styles.btnGhost, { borderColor: c.border, opacity: confirmLoading ? 0.55 : 1 }]}
              >
                <Text style={[styles.btnText, { color: c.muted }]}>
                  {cancelLabel ?? t('common.cancel')}
                </Text>
              </SoftSurface>
            )}
            <SoftSurface
              onPress={confirmLoading ? undefined : onConfirm}
              style={[
                styles.btn,
                alertOnly ? styles.btnFull : null,
                {
                  borderWidth: 0,
                  backgroundColor: destructive && !alertOnly ? '#e11d48' : c.accent,
                  opacity: confirmLoading ? 0.7 : 1,
                },
                elevationStyle('soft', theme),
              ]}
            >
              <Text style={[styles.btnText, styles.btnTextOnAccent]}>
                {confirmLoading ? '…' : primaryLabel}
              </Text>
            </SoftSurface>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0c0a09',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  btnFull: {
    flex: 1,
  },
  btnGhost: {
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnTextOnAccent: {
    color: '#fff',
  },
});
