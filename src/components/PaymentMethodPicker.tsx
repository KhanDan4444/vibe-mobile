import { OptionPickerField } from '@/src/components/OptionPickerField';
import { PAYMENT_METHODS } from '@/src/constants/payments';
import { useTranslation } from 'react-i18next';

export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: (typeof PAYMENT_METHODS)[number];
  onChange: (method: (typeof PAYMENT_METHODS)[number]) => void;
}) {
  const { t } = useTranslation();
  const options = PAYMENT_METHODS.map((m) => ({ value: m, label: m }));

  return (
    <OptionPickerField
      label={t('forms.paymentMethod')}
      placeholder={t('forms.paymentMethod')}
      sheetTitle={t('forms.paymentMethod')}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
