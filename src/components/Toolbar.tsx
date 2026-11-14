import React from 'react';
import {
  Grid,
  Trash2,
  Move,
  Crosshair,
  Undo2,
  Redo2,
  RotateCcw,
} from 'lucide-react';
import { RouteType, EffectiveTheme } from '../types/metro';
import { useI18n, type TranslateFn } from '../i18n/I18nContext';

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
  onOpenShortcuts?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
  canRedo?: boolean;
  onRedo?: () => void;
  onOpenStats?: () => void;
  isStatsActive?: boolean;
  onOpenRouting?: () => void;
  isRoutingActive?: boolean;
}

export const ROUTE_TYPE_OPTIONS: { type: RouteType; label: string; desc: string; icon: string }[] = [
  { type: '135_bend', label: '135° 折線', desc: '135度折線段 (經典 45°/135° 倒角走向，支援內外翻轉)', icon: '⤡' },
  { type: '90_ortho', label: '90° 垂直', desc: '90垂直線段 (水平+垂直折角，支援內外翻轉)', icon: '⌍' },
  { type: '90_rotated', label: '90° 菱形角', desc: '90度旋轉垂直線段 (菱形 45° 斜角，支援內外翻轉)', icon: '◇' },
  { type: 'straight', label: '直線線段', desc: '直線線段 (兩點筆直直連線)', icon: '―' },
  { type: 'any_angle', label: '任意角度線段', desc: '任意角度線段 (AB兩線 360° 雙轉盤旋轉調整，支援內外翻轉)', icon: '∠' },
  { type: 'free_curve', label: '自由繪製', desc: '自由繪製線段 (自繪軌跡，雙擊增減小節點拖曳調整)', icon: '〜' },
];

export function getRouteTypeOptions(t: TranslateFn): { type: RouteType; label: string; desc: string; icon: string }[] {
  return [
    { type: '135_bend', label: t('route.135_bend.short'), desc: t('route.135_bend.desc'), icon: '⤡' },
    { type: '90_ortho', label: t('route.90_ortho.short'), desc: t('route.90_ortho.desc'), icon: '⌍' },
    { type: '90_rotated', label: t('route.90_rotated.short'), desc: t('route.90_rotated.desc'), icon: '◇' },
    { type: 'straight', label: t('route.straight.short'), desc: t('route.straight.desc'), icon: '―' },
    { type: 'any_angle', label: t('route.any_angle.short'), desc: t('route.any_angle.desc'), icon: '∠' },
    { type: 'free_curve', label: t('route.free_curve.short'), desc: t('route.free_curve.desc'), icon: '〜' },
  ];
}

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
  canUndo = false,
  onUndo,
  canRedo = false,
  onRedo,
}) => {
  const isLight = theme === 'light';
  const { t } = useI18n();

  return (
    <div
      className={`h-10 flex items-center justify-between gap-4 px-4 text-xs border-b overflow-x-auto whitespace-nowrap transition-colors select-none shrink-0 ${
        isLight
          ? 'bg-[#FAFAFA] border-zinc-200 text-zinc-700'
          : 'bg-[#09090B] border-zinc-800 text-zinc-300'
      }`}
    >
      {/* Left: Snap / Align / History */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Segmented Movement Mode */}
        <div
          className={`flex items-center p-0.5 rounded-md border gap-0.5 ${
            isLight
              ? 'bg-zinc-100 border-zinc-200'
              : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (gridSnap) onToggleGridSnap();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              !gridSnap
                ? isLight
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'bg-zinc-800 text-zinc-100'
                : isLight
                ? 'text-zinc-500 hover:text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={t('shortcuts.item.ctrlAlign.desc')}
          >
            <Move className="w-3.5 h-3.5" />
            <span>{t('canvas.smooth')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!gridSnap) onToggleGridSnap();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              gridSnap
                ? isLight
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'bg-zinc-800 text-zinc-100'
                : isLight
                ? 'text-zinc-500 hover:text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={t('toolbar.snapTip')}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>{t('toolbar.snap')}</span>
          </button>
        </div>

        {/* Grid Step Size (when Grid Snap is active) */}
        {gridSnap && (
          <div
            className={`flex items-center p-0.5 rounded-md border text-[11px] font-mono ${
              isLight
                ? 'bg-zinc-100 border-zinc-200'
                : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            {[20, 40].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onChangeGridSize(size)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer tabular-nums ${
                  gridSize === size
                    ? isLight
                      ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                      : 'bg-zinc-800 text-zinc-100 font-semibold'
                    : isLight
                    ? 'text-zinc-500 hover:text-zinc-900'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={t('canvas.snapGrid', { size })}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {/* Eight-Way Alignment Toggle */}
        {onToggleNodeAlign && (
          <button
            type="button"
            onClick={onToggleNodeAlign}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              nodeAlign
                ? isLight
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-zinc-100 text-zinc-900 border-zinc-100'
                : isLight
                ? 'bg-white text-zinc-600 border-zinc-200 hover:text-zinc-900 hover:bg-zinc-50'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title={t('toolbar.alignTip')}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{t('toolbar.align')}</span>
            <span className="text-[10px] font-mono opacity-65">Ctrl</span>
          </button>
        )}

        <div className={`h-4 w-px ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              !canUndo
                ? 'opacity-30 cursor-not-allowed'
                : isLight
                ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 cursor-pointer'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer'
            }`}
            title={`${t('toolbar.undo')} (Ctrl+Z / ⌘Z)`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('toolbar.undo')}</span>
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              !canRedo
                ? 'opacity-30 cursor-not-allowed'
                : isLight
                ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 cursor-pointer'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 cursor-pointer'
            }`}
            title={`${t('toolbar.redo')} (Ctrl+Y / ⌘Y / ⌘⇧Z)`}
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('toolbar.redo')}</span>
          </button>
        </div>
      </div>

      {/* Right: Unboxed Network Counts & Canvas Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className={`hidden md:flex items-center gap-1.5 text-xs font-mono tabular-nums ${
            isLight ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          <span>{t('sidebar.stopsCount', { count: stationCount })}</span>
          <span aria-hidden="true">·</span>
          <span>{t('stats.segmentCount', { count: connectionCount })}</span>
        </div>

        <div className={`hidden md:block h-4 w-px ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />

        <button
          type="button"
          onClick={onLoadDemo}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            isLight
              ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
          title={t('toolbar.demoTip')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('toolbar.demo')}</span>
        </button>

        <button
          type="button"
          onClick={onClearCanvas}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            isLight
              ? 'text-zinc-500 hover:text-rose-600 hover:bg-rose-50'
              : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30'
          }`}
          title={t('toolbar.clearTip')}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t('toolbar.clear')}</span>
        </button>
      </div>
    </div>
  );
};
