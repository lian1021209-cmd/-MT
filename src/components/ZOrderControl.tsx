import React from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  RotateCcw,
} from 'lucide-react';
import {
  EffectiveTheme,
  MIN_Z_ORDER,
  MAX_Z_ORDER,
  clampZOrder,
} from '../types/metro';

interface ZOrderControlProps {
  value: number;
  onChange: (nextZ: number) => void;
  targetType: 'station' | 'connection';
  theme?: EffectiveTheme;
}

export const ZOrderControl: React.FC<ZOrderControlProps> = ({
  value,
  onChange,
  targetType,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const z = clampZOrder(value);

  const textMuted = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const textHeading = isLight ? 'text-zinc-900' : 'text-zinc-100';
  const borderCol = isLight ? 'border-zinc-200' : 'border-zinc-800';

  const formatZ = (val: number) => (val > 0 ? `+${val}` : `${val}`);

  const btnBase = isLight
    ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed'
    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold ${textHeading}`}>
          SVG 重疊層級
        </span>

        <div className="flex items-center gap-2">
          {z !== 0 && (
            <button
              type="button"
              onClick={() => onChange(0)}
              className={`text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${textMuted} hover:text-zinc-900 dark:hover:text-zinc-100`}
              title="重設回預設層級 0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>歸零</span>
            </button>
          )}
          <span
            className={`text-xs font-mono font-semibold tabular-nums ${
              z > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : z < 0
                ? 'text-amber-600 dark:text-amber-400'
                : textMuted
            }`}
          >
            {z === 0 ? '0 (預設)' : formatZ(z)}
          </span>
        </div>
      </div>

      {/* Stepper Controls */}
      <div className="grid grid-cols-5 gap-1">
        <button
          type="button"
          onClick={() => onChange(MIN_Z_ORDER)}
          disabled={z <= MIN_Z_ORDER}
          className={`h-9 rounded-md border text-[11px] font-medium flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${btnBase}`}
          title="移至最底層 (-10) · Shift+["
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span className="leading-none">置底</span>
        </button>

        <button
          type="button"
          onClick={() => onChange(clampZOrder(z - 1))}
          disabled={z <= MIN_Z_ORDER}
          className={`h-9 rounded-md border text-[11px] font-medium flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${btnBase}`}
          title="往下一層 (-1) · 快捷鍵 ["
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span className="leading-none">往下</span>
        </button>

        <div
          className={`h-9 rounded-md border flex items-center justify-center px-1 ${
            isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
          }`}
          title="直接輸入 -10 到 10 的整數層級"
        >
          <input
            type="number"
            min={MIN_Z_ORDER}
            max={MAX_Z_ORDER}
            step={1}
            value={z}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              if (!Number.isNaN(parsed)) {
                onChange(clampZOrder(parsed));
              }
            }}
            className={`w-full text-center font-mono font-semibold text-xs bg-transparent focus:outline-none tabular-nums ${textHeading}`}
          />
        </div>

        <button
          type="button"
          onClick={() => onChange(clampZOrder(z + 1))}
          disabled={z >= MAX_Z_ORDER}
          className={`h-9 rounded-md border text-[11px] font-medium flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${btnBase}`}
          title="往上一層 (+1) · 快捷鍵 ]"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span className="leading-none">往上</span>
        </button>

        <button
          type="button"
          onClick={() => onChange(MAX_Z_ORDER)}
          disabled={z >= MAX_Z_ORDER}
          className={`h-9 rounded-md border text-[11px] font-medium flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${btnBase}`}
          title="移至最上層 (+10) · Shift+]"
        >
          <ArrowUpToLine className="w-3.5 h-3.5" />
          <span className="leading-none">置頂</span>
        </button>
      </div>

      {/* Range Slider (-10 to +10) */}
      <div>
        <input
          type="range"
          min={MIN_Z_ORDER}
          max={MAX_Z_ORDER}
          step={1}
          value={z}
          onChange={(e) => onChange(clampZOrder(parseInt(e.target.value, 10)))}
          className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
        />
        <div className={`flex justify-between text-[10px] font-mono mt-1 tabular-nums ${textMuted}`}>
          <span>-10</span>
          <span>0</span>
          <span>+10</span>
        </div>
      </div>

      <p className={`text-[11px] leading-relaxed ${textMuted} border-t pt-2 ${borderCol}`}>
        {targetType === 'connection'
          ? '調整線段在畫布的前後順序（+10 最上層，-10 最底層）。'
          : '調整站點與標籤的前後重疊順序（+10 最上層，-10 最底層）。'}
      </p>
    </div>
  );
};
