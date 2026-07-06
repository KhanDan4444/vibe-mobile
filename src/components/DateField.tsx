import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/PreferencesContext';
import { formStyles } from '@/src/components/Form';
import { formatDisplayDate, dateToIso } from '@/src/utils/date';

function parseIsoDate(value: string): Date {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (parts) return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return new Date();
}

export function DateField({
  value,
  onChange,
  minimumDate,
  maximumDate,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { colors: c } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const display = value ? formatDisplayDate(value) : t('forms.pickDate');

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !date) return;
    onChange(dateToIso(date));
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
          },
        ]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
      >
        <Text style={{ color: value ? c.text : c.dim, fontSize: 16 }}>{display}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={parseIsoDate(value || dateToIso(new Date()))}
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
