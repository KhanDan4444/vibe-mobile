import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OptionPickerField } from '@/src/components/OptionPickerField';
import type { PlanRow } from '@/src/types/api';
import { formatPlanLabel } from '@/src/utils/planFormat';

export function PlanPickerField({
  plans,
  value,
  onChange,
  label,
}: {
  plans: PlanRow[];
  value: number | null;
  onChange: (id: number) => void;
  label?: string;
}) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      plans.map((p) => ({
        value: String(p.id),
        label: formatPlanLabel(p, t),
      })),
    [plans, t]
  );

  if (!plans.length) return null;

  return (
    <OptionPickerField
      label={label ?? t('forms.plan')}
      placeholder={t('forms.pickPlan')}
      sheetTitle={t('forms.pickPlan')}
      options={options}
      value={value != null ? String(value) : undefined}
      onChange={(v) => onChange(Number(v))}
    />
  );
}
