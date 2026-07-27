import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '@/src/i18n/locales/en.json';
import am from '@/src/i18n/locales/am.json';
import om from '@/src/i18n/locales/om.json';
import { normalizeLanguage, type AppLanguage } from '@/src/i18n/languages';

export type { AppLanguage } from '@/src/i18n/languages';
export { APP_LANGUAGES, LANGUAGE_LABEL_KEYS, nextLanguage, normalizeLanguage } from '@/src/i18n/languages';

const deviceLang = Localization.getLocales()[0]?.languageCode;
const deviceLanguage = normalizeLanguage(deviceLang);

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
    om: { translation: om },
  },
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export async function changeAppLanguage(lng: AppLanguage) {
  await i18n.changeLanguage(lng);
}

export default i18n;
