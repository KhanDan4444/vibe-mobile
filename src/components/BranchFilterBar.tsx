import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { useBranchScope, type BranchSelection } from '@/src/context/BranchContext';
import { useTheme } from '@/src/context/PreferencesContext';

function branchOptionLabel(name: string, isDefault?: boolean, inactive?: boolean, t?: (key: string) => string) {
  let label = name;
  if (isDefault) label += ` ${t?.('branch.defaultSuffix') ?? '(default)'}`;
  if (inactive) label += t?.('branch.inactiveSuffix') ?? ' (inactive)';
  return label;
}

export function BranchFilterBar({ horizontalPadding = 16 }: { horizontalPadding?: number }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  const {
    activeBranches,
    inactiveBranches,
    selectedBranchId,
    setSelectedBranchId,
    showBranchFilter,
    selectedBranch,
  } = useBranchScope();

  if (!showBranchFilter) return null;

  const allLabel = t('branch.allBranches');
  const currentLabel =
    selectedBranchId === 'all'
      ? allLabel
      : branchOptionLabel(
          selectedBranch?.name ?? t('branch.single'),
          selectedBranch?.is_default,
          selectedBranch?.is_active === false,
          t
        );

  const pick = (id: BranchSelection) => {
    setSelectedBranchId(id);
    setOpen(false);
  };

  return (
    <View style={[styles.wrap, { paddingHorizontal: horizontalPadding }]}>
      <Pressable
        style={[styles.btn, { backgroundColor: c.card, borderColor: c.border }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
      >
        <Ionicons name="location-outline" size={18} color={c.muted} />
        <Text style={[styles.label, { color: c.text }]} numberOfLines={1}>
          {currentLabel}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.muted} />
      </Pressable>

      <BottomSheet visible={open} title={t('branch.pickBranch')} onClose={() => setOpen(false)}>
        <SheetOption label={allLabel} selected={selectedBranchId === 'all'} onPress={() => pick('all')} />
        {activeBranches.map((b) => {
          const label = branchOptionLabel(b.name, b.is_default, false, t);
          return (
            <SheetOption
              key={b.id}
              label={label}
              selected={selectedBranchId === b.id}
              onPress={() => pick(b.id)}
            />
          );
        })}
        {inactiveBranches.map((b) => {
          const label = branchOptionLabel(b.name, false, true, t);
          return (
            <SheetOption
              key={b.id}
              label={label}
              selected={selectedBranchId === b.id}
              onPress={() => pick(b.id)}
            />
          );
        })}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 12, paddingBottom: 10 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
});
