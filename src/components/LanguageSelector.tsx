import React, { useEffect, useRef, useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { LOCALE_OPTIONS } from '../i18n/translations';
import { EffectiveTheme } from '../types/metro';

interface LanguageSelectorProps {
  theme: EffectiveTheme;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ theme }) => {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  const currentOption = LOCALE_OPTIONS.find((opt) => opt.code === locale) || LOCALE_OPTIONS[0];

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-8 px-2 rounded-md border flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          isOpen
            ? isLight
              ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
              : 'bg-zinc-800 border-zinc-700 text-zinc-100'
            : isLight
            ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100'
        }`}
        title={`${t('lang.label')}: ${currentOption.nativeName} (${t('lang.selectTip')})`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span className="font-mono text-[11px]">{currentOption.shortLabel}</span>
        <ChevronDown
          className={`w-3 h-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t('lang.label')}
          className={`absolute right-0 mt-1.5 w-48 py-1 rounded-lg border shadow-xl z-50 max-h-80 overflow-y-auto ${
            isLight
              ? 'bg-white border-zinc-200 text-zinc-800'
              : 'bg-[#111113] border-zinc-800 text-zinc-200'
          }`}
        >
          <div
            className={`px-2.5 py-1.5 text-[10px] font-medium border-b ${
              isLight ? 'text-zinc-400 border-zinc-100' : 'text-zinc-500 border-zinc-800/80'
            }`}
          >
            {t('lang.label')} ({LOCALE_OPTIONS.length})
          </div>
          {LOCALE_OPTIONS.map((opt) => {
            const isActive = opt.code === locale;
            return (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setLocale(opt.code);
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isActive
                    ? isLight
                      ? 'bg-zinc-100 text-zinc-900 font-semibold'
                      : 'bg-zinc-800 text-zinc-100 font-semibold'
                    : isLight
                    ? 'hover:bg-zinc-50 text-zinc-700'
                    : 'hover:bg-zinc-900/70 text-zinc-300'
                }`}
              >
                <span className="truncate">{opt.nativeName}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[10px] font-mono ${
                      isLight ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    {opt.shortLabel}
                  </span>
                  <span className="w-3.5 h-3.5 flex items-center justify-center">
                    {isActive && <Check className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
