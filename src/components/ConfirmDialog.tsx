import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText as Text } from '@/src/components/AppText';
import { PrimaryButton, SecondaryButton } from '@/src/components/ui/Button';
import { useTheme } from '@/src/context/PreferencesContext';
import { elevationStyle } from '@/src/theme/elevation';
import { radiusXl } from '@/src/theme/tokens';

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

/**
 * In-app bottom sheet dialog. Prefer this over Alert.alert —
 * system alerts use a mismatched font/tint on Android.
 * No enter/exit motion — shows and hides instantly.
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

  const dismiss = onCancel ?? onConfirm;
  const primaryLabel = confirmLabel ?? (alertOnly ? t('common.ok') : t('common.confirm'));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={dismiss} accessibilityRole="button" />
        <View
          style={[
            styles.card,
            elevationStyle('float', theme),
            {
              backgroundColor: c.card,
              borderColor: c.cardEdge,
              borderRadius: radiusXl,
              marginBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <Text display style={[styles.title, { color: c.text }]}>
            {title}
          </Text>
          <Text style={[styles.message, { color: c.muted }]}>{message}</Text>

          <View style={styles.actions}>
            {alertOnly ? (
              <SecondaryButton
                label={primaryLabel}
                onPress={onConfirm}
                disabled={confirmLoading}
                style={styles.btnFull}
              />
            ) : (
              <>
                <SecondaryButton
                  label={cancelLabel ?? t('common.cancel')}
                  onPress={dismiss}
                  disabled={confirmLoading}
                  style={styles.btn}
                />
                <PrimaryButton
                  label={primaryLabel}
                  onPress={onConfirm}
                  loading={confirmLoading}
                  disabled={confirmLoading}
                  destructive={destructive}
                  style={styles.btn}
                />
              </>
            )}
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
    backgroundColor: 'rgba(12, 10, 9, 0.5)',
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
  },
  btnFull: {
    flex: 1,
  },
});
