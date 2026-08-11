import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BottomSheet, SheetOption } from '@/src/components/BottomSheet';
import { usePreferences } from '@/src/context/PreferencesContext';
import { APP_LANGUAGES, LANGUAGE_LABEL_KEYS, type AppLanguage } from '@/src/i18n';

/**
 * Auth-screen language control — top-right icon + bottom sheet (mobile-native).
 * Matches web LanguageSwitcher intent without a fragile dropdown overlay.
 */
export function AuthLanguageButton() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = usePreferences();
  const [open, setOpen] = useState(false);

  const pick = (lng: AppLanguage) => {
    void setLanguage(lng);
    setOpen(false);
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.wrap, { top: Math.max(insets.top, 8) + 4, right: Math.max(insets.right, 12) }]}
      >
        <Pressable
          onPress={() => setOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('profile.language')}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Ionicons name="language-outline" size={20} color="rgba(248,250,252,0.72)" />
        </Pressable>
      </View>

      <BottomSheet visible={open} title={t('profile.language')} onClose={() => setOpen(false)} showCloseButton>
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
  wrap: {
    position: 'absolute',
    zIndex: 40,
  },
  btn: {
    width: 40,
    height: 40,
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
