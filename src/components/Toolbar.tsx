import React from 'react';
import { 
  Grid, 
  Trash2, 
  Sparkles,
  Move,
  Crosshair
} from 'lucide-react';
import { RouteType, EffectiveTheme } from '../types/metro';

interface ToolbarProps {
  gridSnap: boolean;
  onToggleGridSnap: () => void;
  gridSize: number;
  onChangeGridSize: (size: number) => void;
  nodeAlign?: boolean;
  onToggleNodeAlign?: () => void;
  onClearCanvas: () => void;
  onLoadDemo: () => void;
  stationCount: number;
  connectionCount: number;
  theme?: EffectiveTheme;
}

export const ROUTE_TYPE_OPTIONS: { type: RouteType; label: string; desc: string; icon: string }[] = [
  { type: '135_bend', label: '135° 折線', desc: '135度折線段 (經典 45°/135° 倒角走向，支援內外翻轉)', icon: '⤡' },
  { type: '90_ortho', label: '90° 垂直', desc: '90垂直線段 (水平+垂直折角，支援內外翻轉)', icon: '⌍' },
  { type: '90_rotated', label: '90° 菱形角', desc: '90度旋轉垂直線段 (菱形 45° 斜角，支援內外翻轉)', icon: '◇' },
  { type: 'straight', label: '直線線段', desc: '直線線段 (兩點筆直直連線)', icon: '―' },
  { type: 'any_angle', label: '任意角度線段', desc: '任意角度線段 (AB兩線 360° 雙轉盤旋轉調整，支援內外翻轉)', icon: '∠' },
  { type: 'free_curve', label: '自由繪製', desc: '自由繪製線段 (自繪軌跡，雙擊增減小節點拖曳調整)', icon: '〜' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  gridSnap,
  onToggleGridSnap,
  gridSize,
  onChangeGridSize,
  nodeAlign,
  onToggleNodeAlign,
  onClearCanvas,
  onLoadDemo,
  stationCount,
  connectionCount,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm border-b overflow-x-auto whitespace-nowrap transition-colors select-none shrink-0 ${
        isLight
          ? 'bg-slate-50 border-slate-200 text-slate-800'
          : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}
    >
      {/* Movement Mode Small Buttons (平滑移動 / 吸附移動 / 節點八方對齊) */}
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-medium mr-1 hidden sm:inline ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          移動模式:
        </span>
        <div
          className={`flex items-center p-1 rounded-xl border gap-1 shadow-inner transition-colors ${
            isLight
              ? 'bg-slate-200/70 border-slate-300'
              : 'bg-slate-950 border-slate-800'
          }`}
        >
          {/* 1. 平滑移動小按鈕 */}
          <button
            onClick={() => {
              if (gridSnap) onToggleGridSnap();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              !gridSnap
                ? 'bg-sky-600 text-white shadow-sm ring-1 ring-white/10 font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
            title="平滑自由移動模式 — 按住 Ctrl 可八方虛線對齊其他節點"
          >
            <Move className="w-3.5 h-3.5" />
            <span>平滑移動</span>
          </button>

          {/* 2. 吸附移動小按鈕 */}
          <button
            onClick={() => {
              if (!gridSnap) onToggleGridSnap();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              gridSnap
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/10 font-semibold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
            title="網格吸附移動模式 — 車站節點移動時依格點吸附"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>吸附移動</span>
          </button>

          {/* 網格間距小按鈕 (當吸附移動時顯示) */}
          {gridSnap && (
            <div
              className={`flex items-center rounded-md border text-[11px] overflow-hidden ml-0.5 ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-700'
                  : 'bg-slate-900 border-slate-700/60'
              }`}
            >
              <button
                onClick={() => onChangeGridSize(20)}
                className={`px-1.5 py-0.5 transition-colors ${
                  gridSize === 20
                    ? 'bg-indigo-500 text-white font-bold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="20px 格點"
              >
                20px
              </button>
              <button
                onClick={() => onChangeGridSize(40)}
                className={`px-1.5 py-0.5 transition-colors ${
                  gridSize === 40
                    ? 'bg-indigo-500 text-white font-bold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="40px 格點"
              >
                40px
              </button>
            </div>
          )}

          {/* 3. 對齊模式小按鈕 (八方對齊 + 紅色虛線等距吸附) */}
          {onToggleNodeAlign && (
            <button
              onClick={onToggleNodeAlign}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                nodeAlign
                  ? isLight
                    ? 'bg-rose-50 text-rose-700 border border-rose-300 font-semibold shadow-sm'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
              title="開啟對齊模式 (Ctrl) — 支援八方對齊與等距連線吸附（已有線段時，連線將出現紅色虛線保持線段等距，亦可按住 Ctrl 觸發）"
            >
              <Crosshair className={`w-3.5 h-3.5 ${nodeAlign ? 'text-rose-500' : isLight ? 'text-slate-600' : 'text-slate-400'}`} />
              <span>對齊模式</span>
              {nodeAlign && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              )}
              <span
                className={`text-[10px] font-mono px-1 py-0.2 rounded border ${
                  isLight
                    ? 'bg-white text-slate-700 border-slate-300'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                Ctrl
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Right side: Stats & Action buttons */}
      <div className="flex items-center gap-2">
        <div
          className={`hidden lg:flex items-center gap-1.5 text-xs mr-2 ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <span>
            站點/節點: <strong className={`font-mono ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{stationCount}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            連線: <strong className={`font-mono ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{connectionCount}</strong>
          </span>
        </div>

        <button
          onClick={onLoadDemo}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
            isLight
              ? 'text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-900 border-slate-300 shadow-2xs'
              : 'text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border-slate-700/60'
          }`}
          title="載入台北捷運範例路網"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>載入範例</span>
        </button>

        <button
          onClick={onClearCanvas}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border transition-colors ${
            isLight
              ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200'
              : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border-transparent hover:border-rose-900/50'
          }`}
          title="清空畫布所有節點與連線"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>清空</span>
        </button>
      </div>
    </div>
  );
};

