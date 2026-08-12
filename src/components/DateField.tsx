import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { AppText as Text } from '@/src/components/AppText';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { fieldChrome, fieldRingStyle } from '@/src/theme/fieldChrome';
import { clampIsoDate, dateToIso, formatDisplayDate, isDateRangeValid, isoToLocalDate, toDateString } from '@/src/utils/date';
import { dismissKeyboard } from '@/src/utils/dismissKeyboard';

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
  rangeInvalidMessage,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  /** Override the default amber hint when min > max. */
  rangeInvalidMessage?: string;
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
          fieldChrome.inputShell,
          {
            backgroundColor: pickerDisabled ? c.inputBg : c.card,
            opacity: pickerDisabled ? 0.65 : 1,
            justifyContent: 'center',
            elevation: 0,
            shadowOpacity: 0,
          },
          fieldRingStyle(c, { open, disabled: pickerDisabled }),
        ]}
        onPress={() => {
          if (pickerDisabled) return;
          setOpen(true);
          dismissKeyboard();
        }}
        disabled={pickerDisabled}
        android_ripple={null}
        accessibilityRole="button"
        accessibilityState={{ disabled: pickerDisabled }}
      >
        <Text style={{ color: clampedValue ? c.text : c.dim, fontSize: 16, flex: 1 }}>{display}</Text>
      </Pressable>
      {!rangeValid ? (
        <Text style={{ color: c.warning, fontSize: 12, marginTop: 6, lineHeight: 17 }}>
          {rangeInvalidMessage || t('forms.dateRangeInvalid')}
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
