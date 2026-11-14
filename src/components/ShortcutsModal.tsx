import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Keyboard, X, Search } from 'lucide-react';
import { EffectiveTheme } from '../types/metro';
import { useI18n } from '../i18n/I18nContext';
import { LocaleCode } from '../i18n/locales/types';

export interface ShortcutItem {
  id: string;
  category: 'essential' | 'selection' | 'drawing' | 'label' | 'navigation';
  categoryLabel: string;
  keys: string[];
  description: string;
}

const KEYCAP_TEXT: Record<LocaleCode, { drag: string; click: string; dragLabel: string; scroll: string; pinch: string }> = {
  'zh-TW': { drag: '拖曳', click: '點擊', dragLabel: '拖曳站名', scroll: '滾輪', pinch: '雙指' },
  'zh-CN': { drag: '拖拽', click: '点击', dragLabel: '拖拽站名', scroll: '滚轮', pinch: '双指' },
  en: { drag: 'Drag', click: 'Click', dragLabel: 'Drag Label', scroll: 'Scroll', pinch: 'Pinch' },
  ja: { drag: 'ドラッグ', click: 'クリック', dragLabel: '駅名ドラッグ', scroll: 'ホイール', pinch: 'ピンチ' },
  ko: { drag: '드래그', click: '클릭', dragLabel: '역명 드래그', scroll: '스크롤', pinch: '핀치' },
  es: { drag: 'Arrastrar', click: 'Clic', dragLabel: 'Arrastrar etiqueta', scroll: 'Rueda', pinch: 'Pellizcar' },
  fr: { drag: 'Glisser', click: 'Clic', dragLabel: 'Glisser nom', scroll: 'Molette', pinch: 'Pincer' },
  de: { drag: 'Ziehen', click: 'Klick', dragLabel: 'Name ziehen', scroll: 'Scrollen', pinch: 'Zoom' },
  pt: { drag: 'Arrastar', click: 'Clique', dragLabel: 'Arrastar nome', scroll: 'Roda', pinch: 'Pinça' },
  ru: { drag: 'Перетащить', click: 'Клик', dragLabel: 'Тянуть имя', scroll: 'Колесо', pinch: 'Щипок' },
  ar: { drag: 'سحب', click: 'نقر', dragLabel: 'سحب الاسم', scroll: 'تمرير', pinch: 'ضم' },
};

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: EffectiveTheme;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  const { locale, t } = useI18n();
  const isLight = theme === 'light';
  const modalRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCategory('all');
      return;
    }

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const categories = useMemo(
    () => [
      { id: 'all', label: t('shortcuts.cat.all') },
      { id: 'selection', label: t('shortcuts.cat.select') },
      { id: 'drawing', label: t('shortcuts.cat.draw') },
      { id: 'label', label: t('shortcuts.cat.label') },
      { id: 'navigation', label: t('shortcuts.cat.canvas') },
      { id: 'essential', label: t('shortcuts.cat.common') },
    ],
    [t]
  );

  const shortcutsData: ShortcutItem[] = useMemo(() => {
    const k = KEYCAP_TEXT[locale] || KEYCAP_TEXT.en;
    return [
      {
        id: 'help',
        category: 'essential',
        categoryLabel: t('shortcuts.cat.common'),
        keys: ['?'],
        description: t('shortcuts.item.help.desc'),
      },
      {
        id: 'esc',
        category: 'essential',
        categoryLabel: t('shortcuts.cat.common'),
        keys: ['Esc'],
        description: t('shortcuts.item.cancel.desc'),
      },
      {
        id: 'delete',
        category: 'essential',
        categoryLabel: t('shortcuts.cat.common'),
        keys: ['Del', 'Backspace'],
        description: t('shortcuts.item.delete.desc'),
      },
      {
        id: 'undo',
        category: 'essential',
        categoryLabel: t('shortcuts.cat.common'),
        keys: ['Ctrl / ⌘', '+', 'Z'],
        description: t('shortcuts.item.undo.desc'),
      },
      {
        id: 'redo',
        category: 'essential',
        categoryLabel: t('shortcuts.cat.common'),
        keys: ['Ctrl / ⌘', '+', 'Y'],
        description: t('shortcuts.item.redo.desc'),
      },
      {
        id: 'shift_drag',
        category: 'selection',
        categoryLabel: t('shortcuts.cat.select'),
        keys: ['S', '+', k.drag],
        description: t('shortcuts.item.marquee.desc'),
      },
      {
        id: 'shift_click',
        category: 'selection',
        categoryLabel: t('shortcuts.cat.select'),
        keys: ['Shift', '+', k.click],
        description: t('shortcuts.item.toggleSelect.desc'),
      },
      {
        id: 'select_all',
        category: 'selection',
        categoryLabel: t('shortcuts.cat.select'),
        keys: ['Ctrl / ⌘', '+', 'A'],
        description: t('shortcuts.item.selectAll.desc'),
      },
      {
        id: 'tool_v',
        category: 'selection',
        categoryLabel: t('shortcuts.cat.select'),
        keys: ['V'],
        description: t('shortcuts.item.selectTool.desc'),
      },
      {
        id: 'tool_s',
        category: 'selection',
        categoryLabel: t('shortcuts.cat.select'),
        keys: ['S'],
        description: t('shortcuts.item.marquee.desc'),
      },
      {
        id: 'tool_a',
        category: 'drawing',
        categoryLabel: t('shortcuts.cat.draw'),
        keys: ['N'],
        description: t('shortcuts.item.addStation.desc'),
      },
      {
        id: 'tool_x',
        category: 'drawing',
        categoryLabel: t('shortcuts.cat.draw'),
        keys: ['M'],
        description: t('shortcuts.item.addVirtual.desc'),
      },
      {
        id: 'tool_c',
        category: 'drawing',
        categoryLabel: t('shortcuts.cat.draw'),
        keys: ['C'],
        description: t('shortcuts.item.connect.desc'),
      },
      {
        id: 'ctrl_align',
        category: 'drawing',
        categoryLabel: t('shortcuts.cat.draw'),
        keys: ['Ctrl / ⌘'],
        description: t('shortcuts.item.ctrlAlign.desc'),
      },
      {
        id: 'svg_zorder_step',
        category: 'drawing',
        categoryLabel: t('shortcuts.cat.draw'),
        keys: ['[', ']'],
        description: t('shortcuts.item.layerStep.desc'),
      },
      {
        id: 'svg_zorder_extreme',
        category: 'drawing',
        categoryLabel: t('shortcuts.cat.draw'),
        keys: ['Shift', '+', '[ / ]'],
        description: t('shortcuts.item.layerExtreme.desc'),
      },
      {
        id: 'label_drag',
        category: 'label',
        categoryLabel: t('shortcuts.cat.label'),
        keys: [k.dragLabel],
        description: t('shortcuts.item.dragLabel.desc'),
      },
      {
        id: 'canvas_zoom',
        category: 'navigation',
        categoryLabel: t('shortcuts.cat.canvas'),
        keys: [k.scroll, '/', k.pinch],
        description: t('shortcuts.item.zoom.desc'),
      },
      {
        id: 'canvas_pan',
        category: 'navigation',
        categoryLabel: t('shortcuts.cat.canvas'),
        keys: ['Space', '+', k.drag],
        description: t('shortcuts.item.spacePan.desc'),
      },
    ];
  }, [locale, t]);

  const filteredShortcuts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shortcutsData.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!q) return true;
      return (
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory, shortcutsData]);

  if (!isOpen) return null;

  const borderCol = isLight ? 'border-zinc-200' : 'border-zinc-800';
  const divideCol = isLight ? 'divide-zinc-200' : 'divide-zinc-800';
  const textHeading = isLight ? 'text-zinc-900' : 'text-zinc-100';
  const textMuted = isLight ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs"
      onClick={(e) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className={`w-full max-w-xl max-h-[86vh] flex flex-col rounded-xl shadow-2xl border overflow-hidden ${
          isLight
            ? 'bg-white border-zinc-200 text-zinc-800'
            : 'bg-[#111113] border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${borderCol}`}>
          <div className="flex items-center gap-2.5">
            <Keyboard className={`w-4 h-4 ${textMuted}`} />
            <div>
              <h2 id="shortcuts-modal-title" className={`text-base font-semibold tracking-tight ${textHeading}`}>
                {t('shortcuts.title')}
              </h2>
              <p className={`text-[11px] ${textMuted}`}>{t('shortcuts.subtitle')}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isLight ? 'text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
            title={t('shortcuts.closeTip')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter */}
        <div className={`px-5 py-3 border-b space-y-2.5 shrink-0 ${borderCol}`}>
          <div className="relative">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('shortcuts.searchPlaceholder')}
              className={`w-full h-9 pl-8 pr-8 rounded-md text-xs border focus:outline-none transition-colors ${
                isLight
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer ${textMuted}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? isLight
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-900'
                      : isLight
                      ? 'text-zinc-600 hover:bg-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className={`flex-1 overflow-y-auto divide-y ${divideCol}`}>
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className={`text-xs ${textMuted}`}>{t('shortcuts.empty', { query: searchQuery })}</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className={`text-xs underline cursor-pointer ${textHeading}`}
              >
                {t('sidebar.searchReset')}
              </button>
            </div>
          ) : (
            filteredShortcuts.map((item) => (
              <div
                key={item.id}
                className="px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className={`text-xs font-medium ${textHeading}`}>
                    {item.description}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.keys.map((k, idx) =>
                    k === '+' || k === '/' ? (
                      <span key={idx} className={`text-[11px] px-0.5 ${textMuted}`}>
                        {k}
                      </span>
                    ) : (
                      <kbd
                        key={idx}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                          isLight
                            ? 'bg-zinc-100 text-zinc-800 border-zinc-200'
                            : 'bg-zinc-900 text-zinc-200 border-zinc-800'
                        }`}
                      >
                        {k}
                      </kbd>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className={`px-5 py-2.5 border-t text-[11px] ${borderCol} ${textMuted}`}>
          {t('shortcuts.footerTip')}
        </div>
      </div>
    </div>
  );
};
