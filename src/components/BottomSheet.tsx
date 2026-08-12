import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { elevationStyle } from '@/src/theme/elevation';
import { radiusMd, radiusXl } from '@/src/theme/tokens';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { appTextStyle, displayTextStyle } from '@/src/theme/typography';
import { useEffect, type ComponentProps } from 'react';
import { dismissKeyboard } from '@/src/utils/dismissKeyboard';

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

  useEffect(() => {
    if (visible) dismissKeyboard();
  }, [visible]);

  const styles = useThemedStyles((colors) => ({
    overlay: { flex: 1, justifyContent: 'flex-end' as const },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,10,9,0.45)' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radiusXl,
      borderTopRightRadius: radiusXl,
      paddingHorizontal: 20,
      paddingBottom: Math.max(insets.bottom, compact ? 8 : 16) + (compact ? 2 : 8),
      maxHeight: '85%' as const,
      width: '100%' as const,
      alignSelf: 'center' as const,
      ...(isTablet ? { maxWidth: sheetMaxWidth } : {}),
    },
    handle: {
      alignSelf: 'center' as const,
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginTop: compact ? 8 : 12,
      marginBottom: compact ? 8 : 14,
    },
    titleRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: compact ? 4 : 12,
      gap: 12,
    },
    title: {
      flex: 1,
      fontSize: compact ? 17 : 18,
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

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View style={[styles.sheet, elevationStyle('sheet', theme)]}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={displayTextStyle(language, styles.title)} numberOfLines={1}>
              {title}
            </Text>
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
        </View>
      </View>
    </Modal>
  );
}

export function SheetOption({
  label,
  selected,
  onPress,
  destructive,
  accent,
  icon,
  tone = 'default',
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  destructive?: boolean;
  /** Soft teal emphasis (edit) — pairs with destructive red. */
  accent?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Quiet dismiss row for action menus. */
  tone?: 'default' | 'cancel';
}) {
  const { language } = usePreferences();
  const { colors: c } = useTheme();
  const isCancel = tone === 'cancel';
  const emphasisColor = destructive ? c.error : accent ? c.fieldFocus : null;

  const styles = useThemedStyles((colors) => ({
    option: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      paddingVertical: isCancel ? 12 : 13,
      paddingHorizontal: 14,
      borderRadius: radiusMd,
      backgroundColor: 'transparent',
      marginBottom: 2,
      minHeight: isCancel ? 44 : 48,
      justifyContent: isCancel ? ('center' as const) : ('flex-start' as const),
    },
    optionActive: { backgroundColor: colors.accentSoft },
    label: { flex: isCancel ? 0 : 1, fontSize: 15, color: colors.text, fontWeight: '500' as const },
    labelMuted: { color: colors.muted },
    labelActive: { color: colors.accentText, fontWeight: '600' as const },
    labelDestructive: { color: colors.error, fontWeight: '600' as const },
    labelAccent: { color: colors.fieldFocus, fontWeight: '600' as const },
    labelCancel: {
      color: colors.muted,
      fontWeight: '600' as const,
      fontSize: 15,
      textAlign: 'center' as const,
    },
    checkSlot: {
      width: 22,
      height: 22,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    iconSlot: {
      width: 22,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  }));

  return (
    <Pressable
      style={[styles.option, selected && styles.optionActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: selected != null ? Boolean(selected) : undefined }}
      android_ripple={null}
    >
      {icon && !isCancel ? (
        <View style={styles.iconSlot}>
          <Ionicons
            name={icon}
            size={20}
            color={emphasisColor ?? c.muted}
          />
        </View>
      ) : null}
      <Text
        style={appTextStyle(language, {
          ...styles.label,
          ...(selected === false ? styles.labelMuted : {}),
          ...(selected ? styles.labelActive : {}),
          ...(destructive ? styles.labelDestructive : {}),
          ...(accent && !destructive ? styles.labelAccent : {}),
          ...(isCancel ? styles.labelCancel : {}),
        })}
      >
        {label}
      </Text>
      {selected != null ? (
        <View style={styles.checkSlot}>
          {selected ? <Ionicons name="checkmark" size={20} color={c.accentText} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
