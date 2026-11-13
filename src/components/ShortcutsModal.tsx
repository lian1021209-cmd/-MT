import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Keyboard, X, Search } from 'lucide-react';
import { EffectiveTheme } from '../types/metro';

export interface ShortcutItem {
  id: string;
  category: 'essential' | 'selection' | 'drawing' | 'label' | 'navigation';
  categoryLabel: string;
  keys: string[];
  description: string;
  detail?: string;
}

const SHORTCUTS_DATA: ShortcutItem[] = [
  {
    id: 'help',
    category: 'essential',
    categoryLabel: '常用與控制',
    keys: ['?'],
    description: '開啟 / 關閉快捷鍵說明',
    detail: '在畫布任意處按下 ? 或 F1 快速查閱操作說明',
  },
  {
    id: 'esc',
    category: 'essential',
    categoryLabel: '常用與控制',
    keys: ['Esc'],
    description: '取消目前操作 / 取消選取',
    detail: '取消未完成連線、清空選定項目或關閉視窗',
  },
  {
    id: 'delete',
    category: 'essential',
    categoryLabel: '常用與控制',
    keys: ['Del', 'Backspace'],
    description: '刪除選取站點、路線或批次多選站點',
  },
  {
    id: 'undo',
    category: 'essential',
    categoryLabel: '常用與控制',
    keys: ['Ctrl / ⌘', '+', 'Z'],
    description: '復原上一步操作',
  },
  {
    id: 'redo',
    category: 'essential',
    categoryLabel: '常用與控制',
    keys: ['Ctrl / ⌘', '+', 'Y'],
    description: '重做下一步操作',
  },
  {
    id: 'shift_drag',
    category: 'selection',
    categoryLabel: '選取與批次',
    keys: ['S', '+', '拖曳'],
    description: '框選多個站點',
    detail: '切換至框選工具後直接拉出選取框',
  },
  {
    id: 'shift_click',
    category: 'selection',
    categoryLabel: '選取與批次',
    keys: ['Shift', '+', '點擊'],
    description: '加選或移出選取站點',
  },
  {
    id: 'tool_v',
    category: 'selection',
    categoryLabel: '選取與批次',
    keys: ['V'],
    description: '切換至「選取工具」',
  },
  {
    id: 'tool_s',
    category: 'selection',
    categoryLabel: '選取與批次',
    keys: ['S'],
    description: '切換至「框選工具」',
  },
  {
    id: 'tool_a',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['A'],
    description: '切換至「創造車站節點」',
  },
  {
    id: 'tool_x',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['X'],
    description: '切換至「虛擬節點」',
  },
  {
    id: 'tool_c',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['C'],
    description: '切換至「節點連線」',
  },
  {
    id: 'ctrl_align',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['Ctrl / ⌘'],
    description: '8 方位磁吸與等距吸附',
  },
  {
    id: 'svg_zorder_step',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['[', ']'],
    description: '調整 SVG 重疊層級 (-10 ~ +10)',
    detail: '按 ] 往上一層，按 [ 往下一層',
  },
  {
    id: 'svg_zorder_extreme',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['Shift', '+', '[ / ]'],
    description: '一鍵置底 (-10) / 置頂 (+10)',
  },
  {
    id: 'label_drag',
    category: 'label',
    categoryLabel: '站名標籤',
    keys: ['拖曳站名'],
    description: '自由移動站名文字位置',
    detail: '拖曳至空白處將自動繪製動態引線',
  },
  {
    id: 'canvas_zoom',
    category: 'navigation',
    categoryLabel: '視角與畫布',
    keys: ['滾輪', '/', '雙指'],
    description: '縮放畫布視野 (10% ~ 500%)',
  },
  {
    id: 'canvas_pan',
    category: 'navigation',
    categoryLabel: '視角與畫布',
    keys: ['Space', '+', '拖曳'],
    description: '平移無限畫布視野',
  },
];

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
      { id: 'all', label: '全部' },
      { id: 'selection', label: '選取' },
      { id: 'drawing', label: '繪圖與連線' },
      { id: 'label', label: '標籤' },
      { id: 'navigation', label: '畫布' },
      { id: 'essential', label: '常用' },
    ],
    []
  );

  const filteredShortcuts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SHORTCUTS_DATA.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!q) return true;
      return (
        item.description.toLowerCase().includes(q) ||
        (item.detail && item.detail.toLowerCase().includes(q)) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

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
            <h2 id="shortcuts-modal-title" className={`text-base font-semibold tracking-tight ${textHeading}`}>
              快捷鍵一覽
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isLight ? 'text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
            title="關閉 (Esc)"
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
              placeholder="搜尋快捷鍵..."
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
              <p className={`text-xs ${textMuted}`}>找不到與「{searchQuery}」相關的快捷鍵</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className={`text-xs underline cursor-pointer ${textHeading}`}
              >
                重設篩選
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
                  {item.detail && (
                    <div className={`text-[11px] mt-0.5 ${textMuted}`}>{item.detail}</div>
                  )}
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
      </div>
    </div>
  );
};
