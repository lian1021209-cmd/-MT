export type LocaleCode =
  | 'zh-TW'
  | 'zh-CN'
  | 'en'
  | 'ja'
  | 'ko'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'ru'
  | 'ar';

export interface LocaleOption {
  code: LocaleCode;
  nativeName: string;
  shortLabel: string;
}

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'zh-TW', nativeName: '繁體中文', shortLabel: '繁中' },
  { code: 'zh-CN', nativeName: '简体中文', shortLabel: '简中' },
  { code: 'en', nativeName: 'English', shortLabel: 'EN' },
  { code: 'ja', nativeName: '日本語', shortLabel: 'JA' },
  { code: 'ko', nativeName: '한국어', shortLabel: 'KO' },
  { code: 'es', nativeName: 'Español', shortLabel: 'ES' },
  { code: 'fr', nativeName: 'Français', shortLabel: 'FR' },
  { code: 'de', nativeName: 'Deutsch', shortLabel: 'DE' },
  { code: 'pt', nativeName: 'Português', shortLabel: 'PT' },
  { code: 'ru', nativeName: 'Русский', shortLabel: 'RU' },
  { code: 'ar', nativeName: 'العربية', shortLabel: 'AR' },
];
