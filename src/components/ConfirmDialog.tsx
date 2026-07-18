import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { useTheme } from '@/src/context/PreferencesContext';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions (delete / disable) render the confirm control in red. */
  destructive?: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * In-app confirm sheet. Prefer this over Alert.alert for destructive actions —
 * Android system alerts ignore `style: 'destructive'` and tint with the brand green.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  confirmLoading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              marginBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Text style={[styles.message, { color: c.muted }]}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnGhost, { borderColor: c.border }]}
              onPress={onCancel}
              disabled={confirmLoading}
            >
              <Text style={[styles.btnText, { color: c.muted }]}>
                {cancelLabel ?? t('common.cancel')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                destructive
                  ? styles.btnDanger
                  : { backgroundColor: c.accent },
              ]}
              onPress={onConfirm}
              disabled={confirmLoading}
            >
              <Text style={[styles.btnText, styles.btnTextOnAccent]}>
                {confirmLoading ? '…' : confirmLabel ?? t('common.confirm')}
              </Text>
            </Pressable>
          </View>
        </View>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  btnGhost: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnDanger: {
    backgroundColor: '#e11d48',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnTextOnAccent: {
    color: '#fff',
  },
});
