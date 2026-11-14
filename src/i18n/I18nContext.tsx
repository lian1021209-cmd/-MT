import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  LOCALE_OPTIONS,
  TRANSLATIONS,
  type LocaleCode,
  type TranslationKey,
} from './translations';

const LOCALE_STORAGE_KEY = 'metro_locale_v1';

const VALID_LOCALES = new Set<LocaleCode>(LOCALE_OPTIONS.map((o) => o.code));

function resolveInitialLocale(): LocaleCode {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as LocaleCode | null;
    if (saved && VALID_LOCALES.has(saved)) {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'zh-TW';
}

export type TranslateFn = (
  key: TranslationKey,
  vars?: Record<string, string | number>
) => string;

interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (next: LocaleCode) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<LocaleCode>(resolveInitialLocale);

  const setLocale = useCallback((next: LocaleCode) => {
    if (!VALID_LOCALES.has(next)) return;
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      const dict = TRANSLATIONS[locale] || TRANSLATIONS['zh-TW'];
      let str = dict[key] ?? TRANSLATIONS['zh-TW'][key] ?? String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replaceAll(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [locale]
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    // Always preserve LTR layout so SVG coordinates, left toolbar, and right inspector remain consistent
    document.documentElement.dir = 'ltr';
    const titleText = TRANSLATIONS[locale]['app.title'] || TRANSLATIONS['zh-TW']['app.title'];
    document.title = titleText;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}
