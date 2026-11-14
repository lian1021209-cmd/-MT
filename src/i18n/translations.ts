import { LOCALE_OPTIONS, type LocaleCode, type LocaleOption } from './locales/types';
import { zhTW, type TranslationDict, type TranslationKey } from './locales/zhTW';
import { zhCN } from './locales/zhCN';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { ar } from './locales/ar';

export { LOCALE_OPTIONS };
export type { LocaleCode, LocaleOption, TranslationKey, TranslationDict };

export const TRANSLATIONS: Record<LocaleCode, TranslationDict> = {
  'zh-TW': zhTW,
  'zh-CN': zhCN,
  en,
  ja,
  ko,
  es,
  fr,
  de,
  pt,
  ru,
  ar,
};
