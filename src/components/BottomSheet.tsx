import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { elevationStyle } from '@/src/theme/elevation';
import { springs, timings } from '@/src/theme/motion';
import { radiusMd, radiusXl } from '@/src/theme/tokens';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { appTextStyle, displayTextStyle } from '@/src/theme/typography';
import { useEffect, useState } from 'react';
import { dismissKeyboard } from '@/src/utils/dismissKeyboard';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
  showCloseButton = false,
  compact = false,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional custom footer. Pickers that close on select should omit this. */
  footer?: React.ReactNode;
  /** Show an X in the title row (in addition to backdrop dismiss). */
  showCloseButton?: boolean;
  /** Tighter padding for short action menus (Manage, overflow). */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language } = usePreferences();
  const { colors: c, theme } = useTheme();
  const { isTablet, formMaxWidth } = useResponsiveLayout();
  const sheetMaxWidth = formMaxWidth + 40;
  const closeLabel = t('common.cancel');

  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      dismissKeyboard();
      progress.value = 0;
      progress.value = withSpring(1, springs.sheet);
      return;
    }
    progress.value = withTiming(0, { duration: timings.fadeMs, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.45,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 28 }],
    opacity: 0.35 + progress.value * 0.65,
  }));

  const styles = useThemedStyles((colors) => ({
    overlay: { flex: 1, justifyContent: 'flex-end' as const },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0c0a09' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radiusXl,
      borderTopRightRadius: radiusXl,
      paddingHorizontal: 20,
      paddingBottom: Math.max(insets.bottom, compact ? 10 : 16) + (compact ? 4 : 8),
      maxHeight: '85%' as const,
      width: '100%' as const,
      alignSelf: 'center' as const,
      ...(isTablet ? { maxWidth: sheetMaxWidth } : {}),
    },
    handle: {
      alignSelf: 'center' as const,
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginTop: compact ? 10 : 12,
      marginBottom: compact ? 10 : 14,
    },
    titleRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: compact ? 6 : 12,
      gap: 12,
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600' as const,
      letterSpacing: -0.25,
      color: colors.text,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.inputBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
  }));

  if (!mounted) return null;

  return (
    <Modal visible={mounted} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <AnimatedPressable
          style={[styles.backdrop, backdropStyle]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <Animated.View style={[styles.sheet, elevationStyle('sheet', theme), sheetStyle]}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={displayTextStyle(language, styles.title)}>{title}</Text>
            {showCloseButton ? (
              <Pressable
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={c.muted} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function SheetOption({
  label,
  selected,
  onPress,
  destructive,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { language } = usePreferences();
  const { colors: c } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const styles = useThemedStyles((colors) => ({
    option: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: radiusMd,
      backgroundColor: 'transparent',
      marginBottom: 2,
      minHeight: 48,
    },
    optionActive: { backgroundColor: colors.accentSoft },
    label: { flex: 1, fontSize: 15, color: colors.text },
    labelMuted: { color: colors.muted },
    labelActive: { color: colors.accentText, fontWeight: '600' as const },
    labelDestructive: { color: colors.error, fontWeight: '600' as const },
    checkSlot: {
      width: 22,
      height: 22,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  }));

  return (
    <AnimatedPressable
      style={[animStyle, styles.option, selected && styles.optionActive]}
      onPressIn={() => {
        scale.value = withSpring(0.98, springs.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springs.press);
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: selected != null ? Boolean(selected) : undefined }}
    >
      <Text
        style={appTextStyle(language, {
          ...styles.label,
          ...(selected === false ? styles.labelMuted : {}),
          ...(selected ? styles.labelActive : {}),
          ...(destructive ? styles.labelDestructive : {}),
        })}
      >
        {label}
      </Text>
      {/* Reserve check slot only for picker sheets (selected prop passed). */}
      {selected != null ? (
        <View style={styles.checkSlot}>
          {selected ? <Ionicons name="checkmark" size={20} color={c.accentText} /> : null}
        </View>
      ) : null}
    </AnimatedPressable>
  );
}
