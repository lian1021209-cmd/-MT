import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Keyboard, 
  X, 
  Search, 
  MousePointer, 
  Move, 
  Compass, 
  Layers, 
  Sparkles,
  Command,
  CornerDownLeft,
  Check,
  Type
} from 'lucide-react';
import { EffectiveTheme } from '../types/metro';

export interface ShortcutItem {
  id: string;
  category: 'essential' | 'selection' | 'drawing' | 'navigation' | 'label';
  categoryLabel: string;
  keys: string[];
  description: string;
  detail?: string;
  badge?: string;
}

const SHORTCUTS_DATA: ShortcutItem[] = [
  // 通用與常用
  {
    id: 'help',
    category: 'essential',
    categoryLabel: '常用與控制',
    keys: ['?'],
    description: '開啟 / 關閉快捷鍵說明',
    detail: '在畫布任意處按下「?」或「F1」快速查閱所有快捷操作',
    badge: '必備'
  },
  {
    id: 'esc',
    category: 'essential',
    categoryLabel: '常用與控制',
    keys: ['Esc'],
    description: '取消目前操作 / 取消選取',
    detail: '取消未完成連線、放棄拉線、清空選定項目或關閉彈出視窗',
    badge: '常用'
  },
  {
    id: 'delete',
    category: 'essential',
    categoryLabel: '常用與控制',
    keys: ['Del', 'Backspace'],
    description: '刪除選取站點、路線或批次多選站點',
    detail: '選中單一站點、單一路線或框選的多個站點後按下即可刪除',
    badge: '常用'
  },
  {
    id: 'undo',
    category: 'essential',
    categoryLabel: '常用與控制',
    keys: ['Ctrl / ⌘', '+', 'Z'],
    description: '復原上一步操作 (Undo)',
    detail: '復原最近一次站點建立、移動、連線變更或刪除操作',
    badge: '必備'
  },
  {
    id: 'redo',
    category: 'essential',
    categoryLabel: '常用與控制',
    keys: ['Ctrl / ⌘', '+', 'Y', '或', '⇧Z'],
    description: '重做下一步操作 (Redo)',
    detail: '重新套用剛剛被復原的操作步驟',
    badge: '必備'
  },

  // 選取與批次排版
  {
    id: 'shift_drag',
    category: 'selection',
    categoryLabel: '選取與批次',
    keys: ['Shift', '+', '拖曳滑鼠'],
    description: '框選多個站點 (矩形圈選)',
    detail: '按住 Shift 並在畫布空白處拉出選取框，框內的所有站點將被同時選中',
    badge: '排版神器'
  },
  {
    id: 'shift_click',
    category: 'selection',
    categoryLabel: '選取與批次',
    keys: ['Shift', '+', '點擊站點'],
    description: '加選 / 移出選取站點 (連續多選)',
    detail: '按住 Shift 點擊站點可逐一新增或移出選取清單',
  },
  {
    id: 'batch_move',
    category: 'selection',
    categoryLabel: '選取與批次',
    keys: ['滑鼠拖曳選取站點'],
    description: '批次移動多個站點',
    detail: '多選狀態下，拖曳任一選取的站點即可等比同步移動整個路網群組',
    badge: '高效'
  },
  {
    id: 'batch_align',
    category: 'selection',
    categoryLabel: '選取與批次',
    keys: ['浮動工具列'],
    description: '水平對齊 / 垂直對齊 / 等距排列',
    detail: '多選 2 個以上站點時，畫布底部會自動顯示快速排列與批次刪除工具列',
  },
  {
    id: 'tool_v',
    category: 'selection',
    categoryLabel: '選取與批次',
    keys: ['V'],
    description: '切換至「選取工具」',
    detail: '用於單選站點、路線，或進行自由拖曳移動',
  },
  {
    id: 'tool_s',
    category: 'selection',
    categoryLabel: '選取與批次',
    keys: ['S'],
    description: '切換至「框選工具」',
    detail: '可直接拖曳畫布進行矩形圈選，不需額外按住 Shift',
  },

  // 繪圖與連線
  {
    id: 'tool_a',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['A'],
    description: '切換至「創造車站節點」',
    detail: '在畫布上任意點擊即可建立普通車站',
  },
  {
    id: 'tool_x',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['X'],
    description: '切換至「創造轉折虛擬節點」',
    detail: '建立不具站名的輔助折角節點，打造俐落的路網倒角',
  },
  {
    id: 'tool_c',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['C'],
    description: '切換至「節點連線模式」',
    detail: '依序點選起點與終點車站建立路線，2 條以上不同顏色路線交會時自動升級為多線換乘站',
  },
  {
    id: 'interchange_unlimited',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['右側面板', '或', '多線交會'],
    description: '無限制多線換乘站 (支援無數條路線)',
    detail: '完全不限線路數量！支援 2線、3線、4線、5線至無限多線，圖示可自選「色點陣列」、「扇形輪盤」與「連鎖膠囊」3 種專業風格',
    badge: '無限制'
  },
  {
    id: 'ctrl_align',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['Ctrl / Cmd', '(或開啟對齊)'],
    description: '8 方位磁吸與紅色虛線等距吸附',
    detail: '連線或移動時自動捕捉 0°/45°/90°/135° 方向；已有線段時會出現紅色虛線協助保持等距',
    badge: '推薦'
  },
  {
    id: 'route_types',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['左側連線選單'],
    description: '切換 5 種路線走勢風格',
    detail: '支援 135°折線、90°垂直、90°菱形角、直線、任意角度(雙轉盤)與自由線段繪製',
  },
  {
    id: 'freehand_waypoints',
    category: 'drawing',
    categoryLabel: '節點與連線',
    keys: ['拖曳控制節點'],
    description: '自由線段軌跡調整',
    detail: '選中自由線段後，直接拖曳線段上的白色小錨點即可自訂曲線走勢',
  },

  // 站名排版
  {
    id: 'label_drag',
    category: 'label',
    categoryLabel: '站名標籤',
    keys: ['滑鼠直接拖曳站名'],
    description: '自由移動站名文字位置',
    detail: '可將站名拖曳至畫布任何空曠處，系統會自動繪製智慧動態引線連接車站',
    badge: '靈活'
  },
  {
    id: 'label_8way',
    category: 'label',
    categoryLabel: '站名標籤',
    keys: ['右側檢查面板'],
    description: '8 方位預設站名切換',
    detail: '支援 上、下、左、右、左上、右上、左下、右下 一鍵標準化對齊',
  },

  // 畫布導航
  {
    id: 'canvas_zoom',
    category: 'navigation',
    categoryLabel: '視角與畫布',
    keys: ['滑鼠滾輪', '/', '雙指縮放'],
    description: '無段平滑放大 / 縮小',
    detail: '支援 10% 至 500% 的無極縮放，游標所在處即為縮放中心',
  },
  {
    id: 'canvas_pan',
    category: 'navigation',
    categoryLabel: '視角與畫布',
    keys: ['Space', '+', '拖曳', '或', '滑鼠中鍵'],
    description: '抓手拖曳平移畫布視野',
    detail: '在任何工具下按住空白鍵並拖曳滑鼠，即可快速平移無限畫布',
  },
  {
    id: 'hud_fit',
    category: 'navigation',
    categoryLabel: '視角與畫布',
    keys: ['右下角 HUD (聚焦)'],
    description: '自動聚焦至全域路網',
    detail: '一鍵計算所有車站與線段邊界，自動縮放居中至最佳可視範圍',
  },
  {
    id: 'hud_zero',
    category: 'navigation',
    categoryLabel: '視角與畫布',
    keys: ['右下角 HUD (原點)'],
    description: '視野復位回到 (0, 0) 原點',
    detail: '快速將畫布視角歸零回到設計中心點',
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

  // Focus search input when modal opens & handle Escape
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedCategory('all');
      return;
    }

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

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

  // Categories metadata
  const categories = useMemo(() => [
    { id: 'all', label: '全部快捷鍵' },
    { id: 'selection', label: '選取與批次' },
    { id: 'drawing', label: '節點與連線' },
    { id: 'label', label: '站名標籤' },
    { id: 'navigation', label: '視角與畫布' },
    { id: 'essential', label: '常用與控制' },
  ], []);

  // Filtered shortcuts
  const filteredShortcuts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SHORTCUTS_DATA.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!q) return true;
      const matchText = 
        item.description.toLowerCase().includes(q) ||
        (item.detail && item.detail.toLowerCase().includes(q)) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q));
      return matchText;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
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
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border transition-all overflow-hidden ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-700/80 text-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center border border-indigo-600/20 shadow-2xs">
              <Keyboard className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="shortcuts-modal-title" className="text-base sm:text-lg font-bold tracking-tight">
                  快捷鍵與手勢說明
                </h2>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    isLight ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60'
                  }`}
                >
                  新手指南
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                熟悉常用快捷操作，快速繪製並編排專業地鐵路網圖
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="關閉 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Category Filter Pills */}
        <div className={`p-4 border-b space-y-3 shrink-0 ${
          isLight ? 'bg-slate-50/40 border-slate-200' : 'bg-slate-950/40 border-slate-800'
        }`}>
          {/* Search Input */}
          <div className="relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
              isLight ? 'text-slate-400' : 'text-slate-500'
            }`} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋快捷鍵，例如：Shift、選取、刪除、移動、對齊..."
              className={`w-full pl-9 pr-9 py-2 rounded-xl text-xs sm:text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                  : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-xs ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="清空搜尋"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : isLight
                      ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      : 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shortcuts List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Keyboard className={`w-8 h-8 mx-auto ${isLight ? 'text-slate-300' : 'text-slate-600'}`} />
              <p className={`text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                找不到與「{searchQuery}」相關的快捷鍵
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-xs text-indigo-500 hover:text-indigo-400 underline font-medium cursor-pointer"
              >
                重設搜尋篩選
              </button>
            </div>
          ) : (
            filteredShortcuts.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                  isLight
                    ? 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                }`}
              >
                {/* Left: Description & Details */}
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs sm:text-sm font-semibold tracking-tight ${
                      isLight ? 'text-slate-900' : 'text-slate-100'
                    }`}>
                      {item.description}
                    </span>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        item.badge === '必備'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          : item.badge === '排版神器' || item.badge === '推薦'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.detail && (
                    <p className={`text-xs leading-relaxed ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {item.detail}
                    </p>
                  )}
                </div>

                {/* Right: Key Badges */}
                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                  {item.keys.map((k, idx) => {
                    if (k === '+' || k === '/' || k === '或') {
                      return (
                        <span key={idx} className={`text-xs font-semibold px-0.5 ${
                          isLight ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {k}
                        </span>
                      );
                    }
                    return (
                      <kbd
                        key={idx}
                        className={`inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-mono font-semibold shadow-xs transition-colors border ${
                          isLight
                            ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-[0_1px_1px_rgba(0,0,0,0.06)]'
                            : 'bg-slate-800 text-slate-200 border-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                        }`}
                      >
                        {k}
                      </kbd>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer Tip */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t text-xs shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>
              提示：繪圖時隨時可按 <kbd className="font-mono font-bold px-1 py-0.5 rounded border border-current text-[10px]">?</kbd> 開啟此面板
            </span>
          </div>

          <button
            onClick={onClose}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            知道了 (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
