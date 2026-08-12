import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OptionPickerField } from '@/src/components/OptionPickerField';
import type { BranchRow } from '@/src/types/api';
import { branchDisplayName } from '@/src/utils/branchDisplayName';

function branchLabel(branch: BranchRow, t: (key: string) => string): string {
  const suffix = branch.is_default ? ` ${t('branch.defaultSuffix')}` : '';
  return `${branchDisplayName(branch.name)}${suffix}`;
}

export function BranchPicker({
  branches,
  value,
  onChange,
  required,
  errorMessage,
}: {
  branches: BranchRow[];
  value: number | null;
  onChange: (id: number) => void;
  required?: boolean;
  errorMessage?: string;
}) {
  const { t } = useTranslation();
  const active = branches.filter((b) => b.is_active !== false);
  if (active.length <= 1) return null;

  const options = useMemo(
    () =>
      active.map((b) => ({
        value: String(b.id),
        label: branchLabel(b, t),
      })),
    [active, t],
  );

  return (
    <OptionPickerField
      label={t('member.branch')}
      placeholder={t('branch.pickBranch')}
      sheetTitle={t('branch.pickBranch')}
      options={options}
      value={value != null ? String(value) : undefined}
      onChange={(v) => onChange(Number(v))}
      required={required}
      errorMessage={errorMessage}
    />
  );
}
