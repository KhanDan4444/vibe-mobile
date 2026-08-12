import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { usePreferences } from '@/src/context/PreferencesContext';
import { APP_LANGUAGES, LANGUAGE_LABEL_KEYS, type AppLanguage } from '@/src/i18n';

export const AUTH_LANG_BTN_SIZE = 40;

/**
 * Auth-screen language control — icon + bottom sheet.
 * Use `inline` inside AuthScreen’s top bar (preferred); floating is legacy.
 */
export function AuthLanguageButton({ inline = false }: { inline?: boolean }) {
  const { t } = useTranslation();
  const { language, setLanguage } = usePreferences();
  const [open, setOpen] = useState(false);

  const pick = (lng: AppLanguage) => {
    void setLanguage(lng);
    setOpen(false);
  };

  const button = (
    <Pressable
      onPress={() => setOpen(true)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t('profile.language')}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
    >
      <Ionicons name="language-outline" size={20} color="rgba(248,250,252,0.72)" />
    </Pressable>
  );

  return (
    <>
      {inline ? button : <View style={styles.legacyFloat}>{button}</View>}

      <BottomSheet visible={open} title={t('profile.language')} onClose={() => setOpen(false)} compact>
        {APP_LANGUAGES.map((lng) => (
          <SheetOption
            key={lng}
            label={t(LANGUAGE_LABEL_KEYS[lng])}
            selected={lng === language}
            onPress={() => pick(lng)}
          />
        ))}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  legacyFloat: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 40,
  },
  btn: {
    width: AUTH_LANG_BTN_SIZE,
    height: AUTH_LANG_BTN_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  btnPressed: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
