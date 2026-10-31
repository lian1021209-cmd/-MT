import React, { useState, useRef, useEffect } from 'react';
import { 
  MousePointer, 
  PlusCircle, 
  XCircle,
  GitCommit, 
  Pipette,
  ChevronRight
} from 'lucide-react';
import { ToolMode, RouteType, EffectiveTheme } from '../types/metro';
import { ROUTE_TYPE_OPTIONS } from './Toolbar';

interface LeftToolbarProps {
  toolMode: ToolMode;
  onSetToolMode: (mode: ToolMode) => void;
  activeRouteType: RouteType;
  onChangeRouteType: (type: RouteType) => void;
  activeColor: string;
  onOpenColorModal: () => void;
  theme?: EffectiveTheme;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  toolMode,
  onSetToolMode,
  activeRouteType,
  onChangeRouteType,
  activeColor,
  onOpenColorModal,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [showRouteFlyout, setShowRouteFlyout] = useState(false);
  const flyoutRef = useRef<HTMLDivElement | null>(null);

  // Close flyout on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setShowRouteFlyout(false);
      }
    };
    if (showRouteFlyout) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRouteFlyout]);

  const activeOption = ROUTE_TYPE_OPTIONS.find((o) => o.type === activeRouteType) || ROUTE_TYPE_OPTIONS[0];

  return (
    <aside
      aria-label="工具列"
      className={`relative w-13 sm:w-16 border-r flex flex-col items-center py-2 sm:py-3.5 px-1 sm:px-1.5 select-none shrink-0 h-full z-20 transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div
        className={`text-[9px] sm:text-[10px] font-mono font-semibold mb-2 sm:mb-3 tracking-wider ${
          isLight ? 'text-slate-500' : 'text-slate-500'
        }`}
      >
        工具
      </div>

      {/* Drawing Mode Tools */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* 1. Select / Move Tool */}
        <button
          onClick={() => {
            onSetToolMode('select');
            setShowRouteFlyout(false);
          }}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all ${
            toolMode === 'select'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="選取 / 移動 (V) — 點擊選取或拖曳車站，按著空白畫布滑動"
        >
          <MousePointer className="w-4 h-4" />
          <span className="text-[9px] font-medium mt-0.5 scale-90">選取</span>
        </button>

        {/* 2. Create Node Tool */}
        <button
          onClick={() => {
            onSetToolMode('add_station');
            setShowRouteFlyout(false);
          }}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all ${
            toolMode === 'add_station'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="創造節點 (A) — 建立新車站後自動回到選取，按住 Shift 可連續建立"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="text-[9px] font-medium mt-0.5 scale-90">創造節點</span>
        </button>

        {/* 3. Virtual Node Tool */}
        <button
          onClick={() => {
            onSetToolMode('add_virtual_node');
            setShowRouteFlyout(false);
          }}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all ${
            toolMode === 'add_virtual_node'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="虛擬節點 (X) — 建立非站點之連線/轉折/分岔虛擬節點，建立後自動回到選取，按住 Shift 可連續建立"
        >
          <XCircle className="w-4 h-4" />
          <span className="text-[9px] font-medium mt-0.5 scale-90">虛擬節點</span>
        </button>

        {/* 3. Connect Nodes Tool with route flyout toggle */}
        <div className="relative w-full flex justify-center">
          <button
            onClick={() => {
              onSetToolMode('connect');
              setShowRouteFlyout((v) => !v);
            }}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all relative ${
              toolMode === 'connect'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="節點連接 (C) — 點選兩車站連線（連完自動回到選取，按住 Shift 可連續連線）"
          >
            <GitCommit className="w-4 h-4" />
            <span className="text-[9px] font-medium mt-0.5 scale-90">節點連接</span>
            {toolMode === 'connect' && (
              <span
                className={`absolute -bottom-1 -right-1 text-[9px] font-mono font-bold px-1 rounded-full border ${
                  isLight
                    ? 'bg-white text-indigo-700 border-slate-300'
                    : 'bg-slate-950 text-indigo-300 border-slate-700'
                }`}
              >
                {activeOption.icon}
              </span>
            )}
          </button>

          {/* Flyout panel for the 6 line segment types */}
          {showRouteFlyout && (
            <div
              ref={flyoutRef}
              className={`absolute left-full ml-2 top-0 z-50 w-56 rounded-xl shadow-2xl p-2 text-xs border animate-in fade-in zoom-in-95 ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60'
                  : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}
            >
              <div
                className={`px-2 py-1 text-[11px] font-semibold border-b mb-1 flex items-center justify-between ${
                  isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-slate-800'
                }`}
              >
                <span>選擇線段連接模式</span>
                <span className="text-indigo-500 font-mono text-[10px]">6 種走線</span>
              </div>
              <div className="space-y-1">
                {ROUTE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => {
                      onChangeRouteType(opt.type);
                      setShowRouteFlyout(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                      activeRouteType === opt.type
                        ? 'bg-indigo-600 text-white font-medium'
                        : isLight
                        ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm w-4 text-center">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </div>
                    {activeRouteType === opt.type && (
                      <span className="text-[10px] font-mono">使用中</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className={`w-8 h-px my-3 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />

      {/* 4. Active Color Square (Opens 1/9th Spectrum Color Window) */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <span className="text-[9px] font-mono text-slate-500 font-medium">
          色彩
        </span>
        <button
          onClick={onOpenColorModal}
          className="relative w-10 h-10 rounded-xl shadow-md border-2 border-white/70 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-indigo-500"
          style={{ backgroundColor: activeColor }}
          title={`路線色彩設定 · 點擊開啟 16,777,216 色圖譜 (當前: ${activeColor})`}
        >
          <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
            <Pipette className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
          </div>
        </button>
        <span className="text-[8px] font-mono text-slate-400 font-bold tracking-tighter truncate max-w-[50px]">
          {activeColor}
        </span>
      </div>
    </aside>
  );
};
