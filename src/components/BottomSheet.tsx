import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

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
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles((c) => ({
    overlay: { flex: 1, justifyContent: 'flex-end' as const },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingBottom: 28,
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
    doneBtn: {
      marginTop: 16,
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center' as const,
      minHeight: 48,
      justifyContent: 'center' as const,
    },
    doneText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
          {footer ?? (
            <Pressable style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneText}>{t('common.done')}</Text>
            </Pressable>
          )}
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
      <Text style={[styles.optionText, selected && styles.optionTextActive]}>{label}</Text>
    </Pressable>
  );
}
