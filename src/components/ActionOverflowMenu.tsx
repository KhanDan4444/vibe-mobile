import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
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
      width: 44,
      height: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    optionDanger: {
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(248,113,113,0.5)',
      backgroundColor: colors.card,
      marginBottom: 8,
      minHeight: 48,
      justifyContent: 'center' as const,
    },
    optionDangerText: { fontSize: 15, color: colors.error, fontWeight: '600' as const },
  }));

  if (items.length === 0) return null;

  return (
    <>
      <Pressable style={styles.btn} onPress={() => setOpen(true)} accessibilityRole="button" hitSlop={8}>
        <Ionicons name="ellipsis-vertical" size={20} color={c.muted} />
      </Pressable>

      <BottomSheet visible={open} title={t('common.actions')} onClose={() => setOpen(false)}>
        {items.map((item) =>
          item.destructive ? (
            <Pressable
              key={item.id}
              style={styles.optionDanger}
              onPress={() => {
                setOpen(false);
                item.onPress();
              }}
            >
              <Text style={styles.optionDangerText}>{item.label}</Text>
            </Pressable>
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
