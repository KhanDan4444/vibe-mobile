import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { BranchRow } from '@/src/types/api';
import { PrimaryButton } from '@/src/components/Form';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

export function ReassignStaffModal({
  visible,
  branch,
  branches,
  deactivateAfter,
  loading,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  branch: BranchRow | null;
  branches: BranchRow[];
  deactivateAfter: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (targetBranchId: number) => void;
}) {
  const { colors: c } = useTheme();
  const [targetId, setTargetId] = useState<number | null>(null);
  const styles = useThemedStyles((colors) => ({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end' as const,
    },
    sheet: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      paddingBottom: 32,
      maxHeight: '80%',
    },
    title: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
    body: { marginTop: 8, fontSize: 14, color: colors.muted, lineHeight: 20 },
    list: { marginTop: 16, maxHeight: 220 },
    option: {
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 8,
    },
    optionActive: { borderColor: colors.accentText, backgroundColor: colors.accentSoft },
    optionName: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
    optionMeta: { marginTop: 4, fontSize: 12, color: colors.dim },
    warn: { marginTop: 8, fontSize: 13, color: colors.warning },
    actions: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 12, marginTop: 8 },
    cancelBtn: { paddingVertical: 14, paddingHorizontal: 8 },
    cancelText: { color: colors.muted, fontSize: 15 },
  }));

  const targets = branches.filter((b) => b.id !== branch?.id && b.is_active !== false);

  if (!branch) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Reassign staff</Text>
          <Text style={styles.body}>
            {branch.staff_count ?? 0} staff at {branch.name} must move to another branch
            {deactivateAfter ? ' before deactivation.' : '.'}
          </Text>

          <ScrollView style={styles.list}>
            {targets.map((b) => (
              <Pressable
                key={b.id}
                style={[styles.option, targetId === b.id && styles.optionActive]}
                onPress={() => setTargetId(b.id)}
              >
                <Text style={styles.optionName}>{b.name}</Text>
                {b.is_default ? <Text style={styles.optionMeta}>Default</Text> : null}
              </Pressable>
            ))}
          </ScrollView>

          {targets.length === 0 ? (
            <Text style={styles.warn}>Add another active branch before deactivating this one.</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              {loading ? (
                <ActivityIndicator color={c.accentText} style={{ marginTop: 12 }} />
              ) : (
                <PrimaryButton
                  label={deactivateAfter ? 'Move staff & deactivate' : 'Move staff'}
                  onPress={() => targetId && onConfirm(targetId)}
                  disabled={!targetId}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
