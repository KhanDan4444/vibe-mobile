import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { usePreferences, useTheme } from '@/src/context/PreferencesContext';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { appTextStyle } from '@/src/theme/typography';

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
  showCloseButton = false,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional custom footer. Pickers that close on select should omit this. */
  footer?: React.ReactNode;
  /** Show an X in the title row (in addition to backdrop dismiss). */
  showCloseButton?: boolean;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language } = usePreferences();
  const { colors: c } = useTheme();
  const { isTablet, formMaxWidth } = useResponsiveLayout();
  const sheetMaxWidth = formMaxWidth + 40;
  const closeLabel = t('common.cancel');
  const styles = useThemedStyles((colors) => ({
    overlay: { flex: 1, justifyContent: 'flex-end' as const },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingBottom: Math.max(insets.bottom, 16) + 8,
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
      marginTop: 10,
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 12,
      gap: 12,
    },
    title: { flex: 1, fontSize: 18, fontWeight: '700' as const, color: colors.text },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={appTextStyle(language, styles.title)}>{title}</Text>
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
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { language } = usePreferences();
  const styles = useThemedStyles((c) => ({
    option: {
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      marginBottom: 8,
      minHeight: 48,
      justifyContent: 'center' as const,
    },
    optionActive: { borderColor: c.accentText, backgroundColor: c.accentSoft },
    optionText: { fontSize: 15, color: c.muted },
    optionTextActive: { color: c.accentText, fontWeight: '600' as const },
    optionTextDestructive: { color: c.error, fontWeight: '600' as const },
  }));

  return (
    <Pressable style={[styles.option, selected && styles.optionActive]} onPress={onPress}>
      <Text
        style={appTextStyle(language, {
          ...styles.optionText,
          ...(selected ? styles.optionTextActive : {}),
          ...(destructive ? styles.optionTextDestructive : {}),
        })}
      >
        {label}
      </Text>
    </Pressable>
  );
}
