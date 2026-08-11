import { useState } from 'react';
import { AppText as Text } from '@/src/components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { SoftSurface } from '@/src/components/ui/SoftSurface';
import { useTheme } from '@/src/context/PreferencesContext';
import { useThemedStyles } from '@/src/theme/useThemedStyles';

export type ActionMenuItem = {
  id: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

export function ActionOverflowMenu({ items }: { items: ActionMenuItem[] }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(false);
  const styles = useThemedStyles((colors) => ({
    btn: {
      width: 40,
      height: 40,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 0,
    },
    optionDanger: {
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 8,
      minHeight: 48,
      justifyContent: 'center' as const,
      borderWidth: 1,
      borderColor: 'rgba(248,113,113,0.45)',
      backgroundColor: colors.errorBg,
    },
    optionDangerText: { fontSize: 15, color: colors.error, fontWeight: '600' as const },
  }));

  if (items.length === 0) return null;

  return (
    <>
      <SoftSurface onPress={() => setOpen(true)} style={styles.btn} accessibilityRole="button" flat>
        <Ionicons name="ellipsis-vertical" size={20} color={c.muted} />
      </SoftSurface>

      <BottomSheet visible={open} title={t('common.actions')} onClose={() => setOpen(false)}>
        {items.map((item) =>
          item.destructive ? (
            <SoftSurface
              key={item.id}
              flat
              onPress={() => {
                setOpen(false);
                item.onPress();
              }}
              style={styles.optionDanger}
            >
              <Text style={styles.optionDangerText}>{item.label}</Text>
            </SoftSurface>
          ) : (
            <SheetOption
              key={item.id}
              label={item.label}
              onPress={() => {
                setOpen(false);
                item.onPress();
              }}
            />
          )
        )}
      </BottomSheet>
    </>
  );
}
