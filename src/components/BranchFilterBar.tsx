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

export function BranchFilterBar({
  horizontalPadding = 16,
  /** @deprecated Kept for call-site compat — value text is always brand-tinted like web. */
  emphasis: _emphasis = false,
  quiet = false,
}: {
  horizontalPadding?: number;
  /** Stronger face on screens where branch scope is a primary control (dashboard). */
  emphasis?: boolean;
  /** Minimal chrome — nest under a hero / desk card without looking like a second panel. */
  quiet?: boolean;
}) {
  void _emphasis;
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

  // Web toolbar-picker: quiet shell, brand-tinted value text (not a filled chip).
  const triggerStyle = quiet
    ? {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        minHeight: 34,
        paddingVertical: 4,
        paddingHorizontal: 0,
        elevation: 0,
        shadowOpacity: 0,
      }
    : undefined;

  return (
    <View
      style={[
        styles.wrap,
        { paddingHorizontal: horizontalPadding },
        quiet && styles.wrapQuiet,
      ]}
    >
      <PickerTrigger
        open={open}
        onPress={() => setOpen(true)}
        size={quiet ? 'compact' : 'field'}
        style={triggerStyle}
        accessibilityLabel={t('branch.pickBranch')}
      >
        <Ionicons
          name="location-outline"
          size={quiet ? 16 : 18}
          color={quiet ? c.dim : c.muted}
        />
        <Text
          style={[
            styles.label,
            quiet && styles.labelQuiet,
            { color: quiet ? c.muted : c.accentText },
          ]}
          numberOfLines={1}
        >
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
  wrapQuiet: { paddingBottom: 0, alignSelf: 'stretch' },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
  labelQuiet: { flex: 0, flexShrink: 1, fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
});
