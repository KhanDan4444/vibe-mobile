import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { formStyles } from '@/src/components/Form';
import { clampIsoDate, dateToIso, formatDisplayDate, isDateRangeValid, isoToLocalDate, toDateString } from '@/src/utils/date';

function parseIsoDate(value: string): Date {
  return isoToLocalDate(value || todayFallback());
}

function todayFallback(): string {
  return dateToIso(new Date());
}

export function DateField({
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}) {
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const rangeValid = isDateRangeValid(minimumDate, maximumDate);
  const pickerDisabled = disabled || !rangeValid;

  const clampedValue = useMemo(() => {
    if (!value) return '';
    if (!rangeValid) return toDateString(value);
    return clampIsoDate(value, minimumDate, maximumDate);
  }, [value, minimumDate, maximumDate, rangeValid]);

  useEffect(() => {
    if (!value || !rangeValid) return;
    const next = clampIsoDate(value, minimumDate, maximumDate);
    if (next !== toDateString(value)) onChange(next);
  }, [value, minimumDate, maximumDate, rangeValid, onChange]);

  const display = clampedValue ? formatDisplayDate(clampedValue) : t('forms.pickDate');

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !date || !rangeValid) return;
    onChange(clampIsoDate(dateToIso(date), minimumDate, maximumDate));
  };

  return (
    <View>
      <Pressable
        style={[
          formStyles.input,
          {
            backgroundColor: c.inputBg,
            borderColor: c.inputBorder,
            justifyContent: 'center',
            minHeight: 48,
            opacity: pickerDisabled ? 0.55 : 1,
          },
        ]}
        onPress={() => {
          if (!pickerDisabled) setOpen(true);
        }}
        disabled={pickerDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: pickerDisabled }}
      >
        <Text style={{ color: clampedValue ? c.text : c.dim, fontSize: 16 }}>{display}</Text>
      </Pressable>
      {!rangeValid ? (
        <Text style={{ color: c.warning, fontSize: 12, marginTop: 6, lineHeight: 17 }}>
          {t('forms.dateRangeInvalid')}
        </Text>
      ) : null}
      {open && rangeValid ? (
        <DateTimePicker
          value={parseIsoDate(clampedValue || todayFallback())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? (
        <Pressable
          onPress={() => setOpen(false)}
          style={{ alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4, minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: c.accentText, fontWeight: '600', fontSize: 16 }}>{t('common.done')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
