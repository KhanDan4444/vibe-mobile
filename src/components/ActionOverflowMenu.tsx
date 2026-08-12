import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { useTheme } from '@/src/context/PreferencesContext';

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

  if (items.length === 0) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.btn}
        accessibilityRole="button"
        accessibilityLabel={t('common.actions')}
        android_ripple={null}
        hitSlop={8}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={c.muted} />
      </Pressable>

      <BottomSheet visible={open} title={t('common.actions')} onClose={() => setOpen(false)} compact>
        {items.map((item) => (
          <SheetOption
            key={item.id}
            label={item.label}
            destructive={item.destructive}
            onPress={() => {
              setOpen(false);
              item.onPress();
            }}
          />
        ))}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
