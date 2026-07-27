export const APP_LANGUAGES = ['en', 'am', 'om'] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const LANGUAGE_LABEL_KEYS: Record<AppLanguage, string> = {
  en: 'profile.english',
  am: 'profile.amharic',
  om: 'profile.afanOromo',
};

export function normalizeLanguage(code: string | null | undefined): AppLanguage {
  if (code === 'am' || code === 'om') return code;
  return 'en';
}

export function nextLanguage(current: AppLanguage): AppLanguage {
  const index = APP_LANGUAGES.indexOf(current);
  return APP_LANGUAGES[(index + 1) % APP_LANGUAGES.length];
}
