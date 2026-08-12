import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { useTheme } from '@/src/context/PreferencesContext';
import type { ComponentProps } from 'react';

type IonName = ComponentProps<typeof Ionicons>['name'];

export type ActionMenuItem = {
  id: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: IonName;
};

export function ActionOverflowMenu({
  items,
  title,
}: {
  items: ActionMenuItem[];
  /** Contextual sheet title (member / plan / branch name). Falls back to "Actions". */
  title?: string;
}) {
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

      <BottomSheet
        visible={open}
        title={title?.trim() || t('common.actions')}
        onClose={() => setOpen(false)}
        compact
        footer={
          <View style={[styles.cancelWrap, { borderTopColor: c.border }]}>
            <SheetOption
              label={t('common.cancel')}
              tone="cancel"
              onPress={() => setOpen(false)}
            />
          </View>
        }
      >
        {items.map((item) => (
          <SheetOption
            key={item.id}
            label={item.label}
            icon={item.icon}
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
  cancelWrap: {
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
});
