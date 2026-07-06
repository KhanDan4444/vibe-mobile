import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '@/src/i18n/locales/en.json';
import am from '@/src/i18n/locales/am.json';

export type AppLanguage = 'en' | 'am';

const deviceLocales = Localization.getLocales();
const deviceLang = deviceLocales[0]?.languageCode === 'am' ? 'am' : 'en';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
  },
  lng: deviceLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export async function changeAppLanguage(lng: AppLanguage) {
  await i18n.changeLanguage(lng);
}

export default i18n;
