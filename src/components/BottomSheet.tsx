import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '@/src/components/AppText';
import { usePreferences } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';
import { appTextStyle } from '@/src/theme/typography';

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional custom footer. Pickers that close on select should omit this. */
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { language } = usePreferences();
  const styles = useThemedStyles((c) => ({
    overlay: { flex: 1, justifyContent: 'flex-end' as const },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingBottom: Math.max(insets.bottom, 16) + 8,
      maxHeight: '85%' as const,
    },
    handle: {
      alignSelf: 'center' as const,
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginTop: 10,
      marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: '700' as const, color: c.text, marginBottom: 12 },
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={appTextStyle(language, styles.title)}>{title}</Text>
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
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
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
  }));

  return (
    <Pressable style={[styles.option, selected && styles.optionActive]} onPress={onPress}>
      <Text
        style={appTextStyle(language, {
          ...styles.optionText,
          ...(selected ? styles.optionTextActive : {}),
        })}
      >
        {label}
      </Text>
    </Pressable>
  );
}
