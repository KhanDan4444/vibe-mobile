import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { PickerTrigger } from '@/src/components/PickerTrigger';
import { useBranchScope, type BranchSelection } from '@/src/context/BranchContext';
import { useTheme } from '@/src/context/PreferencesContext';
import { branchDisplayName } from '@/src/utils/branchDisplayName';

function branchOptionLabel(name: string, isDefault?: boolean, inactive?: boolean, t?: (key: string) => string) {
  let label = branchDisplayName(name);
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
      <PickerTrigger open={open} onPress={() => setOpen(true)}>
        <Ionicons name="location-outline" size={18} color={c.muted} />
        <Text style={[styles.label, { color: c.text }]} numberOfLines={1}>
          {currentLabel}
        </Text>
      </PickerTrigger>

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
  wrap: { paddingBottom: 10 },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
});
