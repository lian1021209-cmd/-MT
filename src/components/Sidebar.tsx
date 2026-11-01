import React, { useState, useEffect } from 'react';
import { 
  Station, 
  MetroLine, 
  Connection, 
  StationType,
  RouteType,
  EffectiveTheme,
  LabelPosition,
  LABEL_POSITION_PRESETS
} from '../types/metro';
import { ROUTE_TYPE_OPTIONS } from './Toolbar';
import { 
  MapPin, 
  GitFork, 
  Trash2, 
  Layers, 
  ArrowRight,
  Palette,
  Hash,
  XCircle,
  ArrowLeftRight,
  Compass,
  RotateCw,
  RotateCcw,
  Move,
  X
} from 'lucide-react';

interface CircularAngleDialProps {
  label: string;
  subLabel: string;
  angle: number;
  onChange: (angle: number) => void;
  accentColor: string;
  theme: EffectiveTheme;
}

const CircularAngleDial: React.FC<CircularAngleDialProps> = ({
  label,
  subLabel,
  angle,
  onChange,
  accentColor,
  theme,
}) => {
  const isLight = theme === 'light';
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const normalizedAngle = ((angle % 360) + 360) % 360;

  const updateAngleFromPointer = (clientX: number, clientY: number, snap15: boolean = false) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    let deg = Math.round(rad * (180 / Math.PI));
    deg = ((deg % 360) + 360) % 360;
    if (snap15) {
      deg = (Math.round(deg / 15) * 15) % 360;
    }
    onChange(deg);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateAngleFromPointer(e.clientX, e.clientY, e.shiftKey);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateAngleFromPointer(e.clientX, e.clientY, e.shiftKey);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Coordinates for pointer needle
  const rad = (normalizedAngle * Math.PI) / 180;
  const needleLen = 34;
  const knobX = Math.round(Math.cos(rad) * needleLen);
  const knobY = Math.round(Math.sin(rad) * needleLen);

  const getDirectionText = (deg: number) => {
    if (deg >= 338 || deg < 23) return '東 (0°)';
    if (deg >= 23 && deg < 68) return '東南 (45°)';
    if (deg >= 68 && deg < 113) return '南 (90°)';
    if (deg >= 113 && deg < 158) return '西南 (135°)';
    if (deg >= 158 && deg < 203) return '西 (180°)';
    if (deg >= 203 && deg < 248) return '西北 (225°)';
    if (deg >= 248 && deg < 293) return '北 (270°)';
    return '東北 (315°)';
  };

  return (
    <div
      className={`p-2 rounded-xl border flex flex-col items-center select-none ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
      }`}
    >
      {/* Dial Header */}
      <div className="w-full text-center mb-1">
        <div className="text-[11px] font-bold text-indigo-500 tracking-wide">{label}</div>
        <div className="text-[10px] truncate text-slate-400 font-medium px-0.5" title={subLabel}>
          {subLabel}
        </div>
      </div>

      {/* Circular SVG Dial */}
      <div className="relative flex items-center justify-center cursor-grab active:cursor-grabbing touch-none my-1">
        <svg
          ref={svgRef}
          width={98}
          height={98}
          viewBox="-49 -49 98 98"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="overflow-visible"
        >
          {/* Dial Face Background */}
          <circle
            cx={0}
            cy={0}
            r={44}
            fill={isLight ? '#F8FAFC' : '#0B1120'}
            stroke={isLight ? '#CBD5E1' : '#1E293B'}
            strokeWidth={1.8}
          />

          {/* Tick marks around 360° */}
          {Array.from({ length: 24 }).map((_, i) => {
            const tickDeg = i * 15;
            const isMajor = tickDeg % 45 === 0;
            const tickRad = (tickDeg * Math.PI) / 180;
            const rInner = isMajor ? 36 : 40;
            const rOuter = 44;
            const x1 = Math.cos(tickRad) * rInner;
            const y1 = Math.sin(tickRad) * rInner;
            const x2 = Math.cos(tickRad) * rOuter;
            const y2 = Math.sin(tickRad) * rOuter;
            return (
              <line
                key={`tick-${tickDeg}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? (isLight ? '#64748B' : '#94A3B8') : (isLight ? '#E2E8F0' : '#334155')}
                strokeWidth={isMajor ? 1.5 : 0.8}
              />
            );
          })}

          {/* Cardinal Text Indicators (0° = Right, 90° = Bottom, 180° = Left, 270° = Top) */}
          <text x={31} y={3} textAnchor="middle" className="text-[7.5px] font-mono fill-slate-400 select-none">0°</text>
          <text x={0} y={34} textAnchor="middle" className="text-[7.5px] font-mono fill-slate-400 select-none">90°</text>
          <text x={-31} y={3} textAnchor="middle" className="text-[7.5px] font-mono fill-slate-400 select-none">180°</text>
          <text x={0} y={-28} textAnchor="middle" className="text-[7.5px] font-mono fill-slate-400 select-none">270°</text>

          {/* Center Hub */}
          <circle
            cx={0}
            cy={0}
            r={16}
            fill={isLight ? '#FFFFFF' : '#020617'}
            stroke={isLight ? '#E2E8F0' : '#1E293B'}
            strokeWidth={1.5}
          />

          {/* Current Degree Center Text */}
          <text
            x={0}
            y={3.5}
            textAnchor="middle"
            className="text-[10px] font-mono font-bold fill-indigo-500 select-none pointer-events-none"
          >
            {normalizedAngle}°
          </text>

          {/* Direction needle line */}
          <line
            x1={0}
            y1={0}
            x2={knobX}
            y2={knobY}
            stroke={accentColor || '#6366F1'}
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Outer Rotating Knob Handle */}
          <circle
            cx={knobX}
            cy={knobY}
            r={5.5}
            fill="#FFFFFF"
            stroke={accentColor || '#6366F1'}
            strokeWidth={2.5}
            className="transition-transform drop-shadow"
          />
        </svg>
      </div>

      {/* Direction & Degree readout badge */}
      <div className="w-full flex items-center justify-between mt-0.5 px-0.5 text-[10px] font-mono">
        <span className="text-slate-400 truncate max-w-[55px]">{getDirectionText(normalizedAngle)}</span>
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            min={0}
            max={359}
            value={normalizedAngle}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                onChange(((val % 360) + 360) % 360);
              }
            }}
            className={`w-10 px-1 py-0.5 text-center font-bold text-[10px] rounded border focus:outline-none focus:border-indigo-500 ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
            }`}
          />
          <span className="text-slate-400">°</span>
        </div>
      </div>

      {/* Quick +/- 15° adjustment buttons */}
      <div className="w-full grid grid-cols-2 gap-1 mt-1.5">
        <button
          type="button"
          onClick={() => onChange(((normalizedAngle - 15) % 360 + 360) % 360)}
          className={`py-0.5 text-[9px] font-mono rounded border flex items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="逆時針微調 15°"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>-15°</span>
        </button>
        <button
          type="button"
          onClick={() => onChange((normalizedAngle + 15) % 360)}
          className={`py-0.5 text-[9px] font-mono rounded border flex items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="順時針微調 15°"
        >
          <RotateCw className="w-2.5 h-2.5" />
          <span>+15°</span>
        </button>
      </div>

      {/* Preset 45° angle chips */}
      <div className="w-full grid grid-cols-4 gap-0.5 mt-1">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`py-0.5 text-[8.5px] font-mono rounded transition-colors cursor-pointer border ${
              normalizedAngle === preset
                ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                : isLight
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
          >
            {preset}°
          </button>
        ))}
      </div>
    </div>
  );
};

interface SidebarProps {
  selectedStation: Station | null;
  selectedConnection: Connection | null;
  stations: Station[];
  lines: MetroLine[];
  connections: Connection[];
  recentColors: string[];
  onUpdateStation: (updated: Station) => void;
  onDeleteStation: (id: string) => void;
  onUpdateConnectionColor: (connId: string, newColor: string) => void;
  onUpdateConnectionRouteType: (connId: string, routeType: RouteType) => void;
  onToggleConnectionFlip?: (connId: string) => void;
  onUpdateConnectionAngles?: (connId: string, angleA: number, angleB: number) => void;
  onDeleteConnection: (id: string) => void;
  theme?: EffectiveTheme;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedStation,
  selectedConnection,
  stations,
  lines,
  connections,
  recentColors,
  onUpdateStation,
  onDeleteStation,
  onUpdateConnectionColor,
  onUpdateConnectionRouteType,
  onToggleConnectionFlip,
  onUpdateConnectionAngles,
  onDeleteConnection,
  theme = 'dark',
  onClose,
}) => {
  const isLight = theme === 'light';
  const cardBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800';
  const inputBg = isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-100';
  const borderCol = isLight ? 'border-slate-200' : 'border-slate-800';
  const textMuted = isLight ? 'text-slate-600' : 'text-slate-400';
  const textHeading = isLight ? 'text-slate-900' : 'text-white';
  const btnInactive = isLight
    ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200';
  const [connHexInput, setConnHexInput] = useState('');

  useEffect(() => {
    if (selectedConnection) {
      setConnHexInput(selectedConnection.color || '#E11D48');
    }
  }, [selectedConnection]);

  const handleConnHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#') && val.length > 0) {
      val = '#' + val;
    }
    setConnHexInput(val);
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val) && selectedConnection) {
      onUpdateConnectionColor(selectedConnection.id, val.toUpperCase());
    }
  };

  const isMobileOpen = Boolean(selectedStation || selectedConnection);

  return (
    <aside
      className={`${
        isMobileOpen
          ? 'fixed inset-x-0 bottom-0 max-h-[82vh] z-40 w-full rounded-t-2xl shadow-2xl border-t border-x'
          : 'hidden'
      } lg:relative lg:inset-auto lg:flex lg:w-80 lg:max-h-full lg:rounded-none lg:shadow-none lg:border-t-0 lg:border-x-0 border-l flex flex-col shrink-0 overflow-y-auto transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}
    >
      {/* Mobile drag handle */}
      {isMobileOpen && (
        <div className="pt-2 pb-1 flex justify-center lg:hidden shrink-0">
          <div className="w-12 h-1 bg-slate-400/40 rounded-full" />
        </div>
      )}
      {/* 1. Virtual Node Inspector */}
      {selectedStation && selectedStation.isVirtual && (
        <div className="p-4 space-y-5">
          <div className={`flex items-center justify-between pb-3 border-b ${borderCol}`}>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-emerald-500" />
              <h2 className={`font-semibold text-sm ${textHeading}`}>虛擬節點設定</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDeleteStation(selectedStation.id)}
                className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                title="刪除此虛擬節點"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    isLight ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="關閉面板"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Description card */}
            <div
              className={`p-3 rounded-lg border space-y-1 ${
                isLight
                  ? 'bg-emerald-50/80 border-emerald-200 text-slate-700'
                  : 'bg-emerald-950/30 border-emerald-800/40 text-slate-300'
              }`}
            >
              <div className="text-emerald-500 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>非站點連線節點</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                此節點非旅客車站（不顯示站名標籤），專門用於線路折角轉向、路線分岔、八方對齊或多線交會。之後可擴展更多進階路網幾何與控制功能。
              </p>
            </div>

            {/* Position info */}
            <div
              className={`p-2.5 rounded-lg border flex items-center justify-between font-mono ${
                cardBg
              }`}
            >
              <span>坐標: X: {selectedStation.x}, Y: {selectedStation.y}</span>
              <span className={`text-[11px] ${textMuted}`}>可拖曳平移調整</span>
            </div>

            {/* Convert to Regular Station */}
            <div>
              <label className={`block font-medium mb-1.5 ${textMuted}`}>節點型態轉換</label>
              <button
                onClick={() => {
                  const regCount = stations.filter((s) => !s.isVirtual).length + 1;
                  onUpdateStation({
                    ...selectedStation,
                    isVirtual: false,
                    name: `車站 ${regCount}`,
                    code: `S${regCount}`,
                    type: 'regular',
                    labelPosition: 'top',
                  });
                }}
                className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer border ${
                  isLight
                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>轉為正式車站 (增加站名標籤)</span>
              </button>
            </div>

            {/* Connected lines summary */}
            <div>
              <label className={`block font-medium mb-1.5 ${textMuted}`}>相鄰路線連線</label>
              {connections.filter(
                (c) =>
                  c.fromStationId === selectedStation.id ||
                  c.toStationId === selectedStation.id
              ).length === 0 ? (
                <p className={`${textMuted} italic`}>尚無相連路線，請使用「節點連接」串接</p>
              ) : (
                <div className="space-y-1.5">
                  {connections
                    .filter(
                      (c) =>
                        c.fromStationId === selectedStation.id ||
                        c.toStationId === selectedStation.id
                    )
                    .map((conn) => {
                      const otherId =
                        conn.fromStationId === selectedStation.id
                          ? conn.toStationId
                          : conn.fromStationId;
                      const otherSt = stations.find((s) => s.id === otherId);
                      const connColor = conn.color || '#94A3B8';
                      const otherName = otherSt?.isVirtual
                        ? `虛擬節點 (${otherSt.x}, ${otherSt.y})`
                        : otherSt?.name || '未知車站';

                      return (
                        <div
                          key={conn.id}
                          className={`flex items-center justify-between p-2 rounded border ${cardBg}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: connColor }}
                            />
                            <span>往 {otherName}</span>
                          </div>
                          <span className={`text-[10px] font-mono ${textMuted}`}>
                            {connColor}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Regular Station Inspector */}
      {selectedStation && !selectedStation.isVirtual && (
        <div className="p-4 space-y-5">
          <div className={`flex items-center justify-between pb-3 border-b ${borderCol}`}>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-500" />
              <h2 className={`font-semibold text-sm ${textHeading}`}>車站節點設定</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDeleteStation(selectedStation.id)}
                className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                title="刪除此車站"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    isLight ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="關閉面板"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Station Name */}
            <div>
              <label className={`block font-medium mb-1 ${textMuted}`}>車站名稱</label>
              <input
                type="text"
                value={selectedStation.name}
                onChange={(e) =>
                  onUpdateStation({ ...selectedStation, name: e.target.value })
                }
                className={`w-full px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:border-indigo-500 ${inputBg}`}
                placeholder="輸入車站名稱"
              />
            </div>

            {/* Station Code */}
            <div>
              <label className={`block font-medium mb-1 ${textMuted}`}>車站代碼 (選填)</label>
              <input
                type="text"
                value={selectedStation.code || ''}
                onChange={(e) =>
                  onUpdateStation({ ...selectedStation, code: e.target.value })
                }
                className={`w-full px-3 py-1.5 rounded-lg font-mono text-sm border focus:outline-none focus:border-indigo-500 ${inputBg}`}
                placeholder="例如: R10 / BL12"
              />
            </div>

            {/* Station Type */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`font-medium ${textMuted}`}>車站類型</label>
                {connections.filter(
                  (c) =>
                    c.fromStationId === selectedStation.id ||
                    c.toStationId === selectedStation.id
                ).length > 0 &&
                  new Set(
                    connections
                      .filter(
                        (c) =>
                          c.fromStationId === selectedStation.id ||
                          c.toStationId === selectedStation.id
                      )
                      .map((c) => (c.color || '').toUpperCase())
                  ).size >= 2 && (
                    <span className="text-[10px] text-amber-500 font-mono font-bold">
                      多線交會 (已自動轉換)
                    </span>
                  )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { type: 'regular', label: '普通站' },
                  { type: 'interchange', label: '轉乘站' },
                  { type: 'terminal', label: '端點站' },
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() =>
                      onUpdateStation({
                        ...selectedStation,
                        type: item.type as StationType,
                      })
                    }
                    className={`py-1.5 px-2 rounded-lg border text-center transition-colors font-medium ${
                      selectedStation.type === item.type
                        ? isLight
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                        : btnInactive
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Label Position: 8 方位與自由拖動站名 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`font-medium ${textMuted}`}>站名方位 (8方位 / 自由拖動)</label>
                {selectedStation.labelPosition === 'custom' ? (
                  <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 rounded">
                    自由自訂位置
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    {LABEL_POSITION_PRESETS[selectedStation.labelPosition as keyof typeof LABEL_POSITION_PRESETS]?.label || '正上'}
                  </span>
                )}
              </div>

              {/* 3x3 Compass Keypad */}
              <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl border bg-slate-950/20 mb-2">
                {/* Row 1: 左上, 正上, 右上 */}
                {(['top_left', 'top', 'top_right'] as const).map((pos) => {
                  const preset = LABEL_POSITION_PRESETS[pos];
                  const isActive = (selectedStation.labelPosition || 'top') === pos;
                  return (
                    <button
                      key={pos}
                      onClick={() =>
                        onUpdateStation({
                          ...selectedStation,
                          labelPosition: pos,
                          labelOffset: { x: preset.dx, y: preset.dy },
                        })
                      }
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs font-medium transition-all ${
                        isActive
                          ? isLight
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-indigo-600/40 border-indigo-500 text-white font-bold shadow-sm'
                          : btnInactive
                      }`}
                      title={`${preset.label} (${preset.dx}, ${preset.dy})`}
                    >
                      <span className="text-sm font-bold leading-none mb-0.5">{preset.short}</span>
                      <span className="text-[10px] scale-95">{preset.label}</span>
                    </button>
                  );
                })}

                {/* Row 2: 正左, 自由拖曳, 正右 */}
                {(() => {
                  const leftPreset = LABEL_POSITION_PRESETS['left'];
                  const isLeftActive = selectedStation.labelPosition === 'left';
                  const rightPreset = LABEL_POSITION_PRESETS['right'];
                  const isRightActive = selectedStation.labelPosition === 'right';
                  const isCustomActive = selectedStation.labelPosition === 'custom';

                  return (
                    <>
                      <button
                        onClick={() =>
                          onUpdateStation({
                            ...selectedStation,
                            labelPosition: 'left',
                            labelOffset: { x: leftPreset.dx, y: leftPreset.dy },
                          })
                        }
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs font-medium transition-all ${
                          isLeftActive
                            ? isLight
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-indigo-600/40 border-indigo-500 text-white font-bold shadow-sm'
                            : btnInactive
                        }`}
                        title={`${leftPreset.label} (${leftPreset.dx}, ${leftPreset.dy})`}
                      >
                        <span className="text-sm font-bold leading-none mb-0.5">{leftPreset.short}</span>
                        <span className="text-[10px] scale-95">{leftPreset.label}</span>
                      </button>

                      <button
                        onClick={() =>
                          onUpdateStation({
                            ...selectedStation,
                            labelPosition: 'custom',
                            labelOffset: selectedStation.labelOffset || { x: 0, y: -24 },
                          })
                        }
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs font-medium transition-all ${
                          isCustomActive
                            ? isLight
                              ? 'bg-sky-600 text-white border-sky-600 shadow-sm font-bold'
                              : 'bg-sky-600/40 border-sky-400 text-sky-200 font-bold shadow-sm'
                            : isLight
                            ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                            : 'bg-sky-950/40 text-sky-300 border-sky-800/60 hover:bg-sky-900/40'
                        }`}
                        title="自由拖動站名：可在畫布上按住站名直接拖曳"
                      >
                        <Move className="w-3.5 h-3.5 mb-0.5 text-sky-400" />
                        <span className="text-[10px] font-bold">自由</span>
                      </button>

                      <button
                        onClick={() =>
                          onUpdateStation({
                            ...selectedStation,
                            labelPosition: 'right',
                            labelOffset: { x: rightPreset.dx, y: rightPreset.dy },
                          })
                        }
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs font-medium transition-all ${
                          isRightActive
                            ? isLight
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-indigo-600/40 border-indigo-500 text-white font-bold shadow-sm'
                            : btnInactive
                        }`}
                        title={`${rightPreset.label} (${rightPreset.dx}, ${rightPreset.dy})`}
                      >
                        <span className="text-sm font-bold leading-none mb-0.5">{rightPreset.short}</span>
                        <span className="text-[10px] scale-95">{rightPreset.label}</span>
                      </button>
                    </>
                  );
                })()}

                {/* Row 3: 左下, 正下, 右下 */}
                {(['bottom_left', 'bottom', 'bottom_right'] as const).map((pos) => {
                  const preset = LABEL_POSITION_PRESETS[pos];
                  const isActive = selectedStation.labelPosition === pos;
                  return (
                    <button
                      key={pos}
                      onClick={() =>
                        onUpdateStation({
                          ...selectedStation,
                          labelPosition: pos,
                          labelOffset: { x: preset.dx, y: preset.dy },
                        })
                      }
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs font-medium transition-all ${
                        isActive
                          ? isLight
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-indigo-600/40 border-indigo-500 text-white font-bold shadow-sm'
                          : btnInactive
                      }`}
                      title={`${preset.label} (${preset.dx}, ${preset.dy})`}
                    >
                      <span className="text-sm font-bold leading-none mb-0.5">{preset.short}</span>
                      <span className="text-[10px] scale-95">{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Freehand Position Details & Fine-tune Controls */}
              {selectedStation.labelPosition === 'custom' ? (
                <div className={`p-2.5 rounded-lg border space-y-2 mb-2 ${cardBg}`}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-sky-400 font-semibold flex items-center gap-1">
                      <Move className="w-3 h-3" /> 可在畫布上直接拖曳站名
                    </span>
                    <span className={`font-mono ${textMuted}`}>
                      X: {selectedStation.labelOffset?.x ?? 0}px, Y: {selectedStation.labelOffset?.y ?? -18}px
                    </span>
                  </div>

                  {/* Offset fine-tune sliders */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="flex justify-between mb-0.5 font-mono">
                        <span className={textMuted}>水平位移 X</span>
                        <span>{selectedStation.labelOffset?.x ?? 0}px</span>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={selectedStation.labelOffset?.x ?? 0}
                        onChange={(e) =>
                          onUpdateStation({
                            ...selectedStation,
                            labelPosition: 'custom',
                            labelOffset: {
                              x: parseInt(e.target.value) || 0,
                              y: selectedStation.labelOffset?.y ?? -18,
                            },
                          })
                        }
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5 font-mono">
                        <span className={textMuted}>垂直位移 Y</span>
                        <span>{selectedStation.labelOffset?.y ?? -18}px</span>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={selectedStation.labelOffset?.y ?? -18}
                        onChange={(e) =>
                          onUpdateStation({
                            ...selectedStation,
                            labelPosition: 'custom',
                            labelOffset: {
                              x: selectedStation.labelOffset?.x ?? 0,
                              y: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className={`text-[11px] ${textMuted} flex items-center gap-1 mb-2`}>
                  <span>💡 點擊中間「自由」或直接在畫布上按住站名拖曳，即可自訂位置。</span>
                </p>
              )}
            </div>

            {/* Position info */}
            <div className={`p-2.5 rounded-lg border flex items-center justify-between font-mono ${cardBg}`}>
              <span>坐標: X: {selectedStation.x}, Y: {selectedStation.y}</span>
              <span className={`text-[11px] ${textMuted}`}>可拖曳平移調整</span>
            </div>

            {/* Connected lines summary */}
            <div>
              <label className={`block font-medium mb-1.5 ${textMuted}`}>相鄰路線連線</label>
              {connections.filter(
                (c) =>
                  c.fromStationId === selectedStation.id ||
                  c.toStationId === selectedStation.id
              ).length === 0 ? (
                <p className={`${textMuted} italic`}>尚無相連路線，請使用「節點連接」串接</p>
              ) : (
                <div className="space-y-1.5">
                  {connections
                    .filter(
                      (c) =>
                        c.fromStationId === selectedStation.id ||
                        c.toStationId === selectedStation.id
                    )
                    .map((conn) => {
                      const otherId =
                        conn.fromStationId === selectedStation.id
                          ? conn.toStationId
                          : conn.fromStationId;
                      const otherSt = stations.find((s) => s.id === otherId);
                      const connColor = conn.color || '#94A3B8';
                      const otherName = otherSt?.isVirtual
                        ? `虛擬節點 (${otherSt.x}, ${otherSt.y})`
                        : otherSt?.name || '未知車站';

                      return (
                        <div
                          key={conn.id}
                          className={`flex items-center justify-between p-2 rounded border ${cardBg}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: connColor }}
                            />
                            <span>往 {otherName}</span>
                          </div>
                          <span className={`text-[10px] font-mono ${textMuted}`}>
                            {connColor}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Convert to Virtual Node Option */}
            <div className={`pt-2 border-t ${borderCol}`}>
              <button
                onClick={() =>
                  onUpdateStation({
                    ...selectedStation,
                    isVirtual: true,
                  })
                }
                className={`w-full py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer border ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
                title="轉為虛擬節點（保留連線，隱藏站名標籤）"
              >
                <XCircle className={`w-3.5 h-3.5 ${textMuted}`} />
                <span>轉為虛擬節點 (純轉折/連線節點)</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Connection Inspector */}
      {selectedConnection && !selectedStation && (
        <div className="p-4 space-y-5">
          <div className={`flex items-center justify-between pb-3 border-b ${borderCol}`}>
            <div className="flex items-center gap-2">
              <GitFork className="w-4 h-4 text-emerald-500" />
              <h2 className={`font-semibold text-sm ${textHeading}`}>路線區段色彩設定</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDeleteConnection(selectedConnection.id)}
                className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                title="刪除此段連線"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                    isLight ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="關閉面板"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Connected Stations summary */}
            <div className={`p-3 rounded-lg border flex items-center justify-center gap-3 ${cardBg}`}>
              <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                {(() => {
                  const s = stations.find((st) => st.id === selectedConnection.fromStationId);
                  return s?.isVirtual ? `虛擬節點 (${s.x}, ${s.y})` : (s?.name || '起點');
                })()}
              </span>
              <ArrowRight className={`w-4 h-4 shrink-0 ${textMuted}`} />
              <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                {(() => {
                  const s = stations.find((st) => st.id === selectedConnection.toStationId);
                  return s?.isVirtual ? `虛擬節點 (${s.x}, ${s.y})` : (s?.name || '終點');
                })()}
              </span>
            </div>


            {/* Line Color Picker */}
            <div>
              <label className={`block font-medium mb-1.5 ${textMuted}`}>
                此區段 16 進制色彩
              </label>
              
              <div className={`flex items-center gap-2 mb-3 p-2 rounded-lg border ${cardBg}`}>
                <input
                  type="color"
                  value={selectedConnection.color || '#E11D48'}
                  onChange={(e) => {
                    const newCol = e.target.value.toUpperCase();
                    setConnHexInput(newCol);
                    onUpdateConnectionColor(selectedConnection.id, newCol);
                  }}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                  title="選擇色彩"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <Hash className={`w-3 h-3 ${textMuted}`} />
                    <input
                      type="text"
                      value={connHexInput}
                      onChange={handleConnHexChange}
                      maxLength={7}
                      className={`bg-transparent font-mono uppercase font-bold focus:outline-none w-24 text-xs ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                      placeholder="#E11D48"
                    />
                  </div>
                </div>
              </div>

              {/* Quick apply from recent colors */}
              <div className="space-y-1.5">
                <span className={`text-[11px] block ${textMuted}`}>從歷史色彩快速套用:</span>
                {recentColors.length === 0 ? (
                  <p className={`text-[11px] italic p-2 rounded-lg border ${cardBg} ${textMuted}`}>
                    尚無使用記錄，點選左側色彩按鈕自訂並套用新色彩後將自動記錄
                  </p>
                ) : (
                  <div className={`grid grid-cols-5 gap-1.5 p-2 rounded-lg border ${cardBg}`}>
                    {recentColors.slice(0, 20).map((color, idx) => (
                      <button
                        key={`${color}-${idx}`}
                        onClick={() => {
                          setConnHexInput(color);
                          onUpdateConnectionColor(selectedConnection.id, color);
                        }}
                        className="w-full h-5 rounded hover:scale-110 transition-transform border border-black/30"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Route Type Selection */}
            <div>
              <label className={`block font-medium mb-1.5 ${textMuted}`}>
                線段走向樣式
              </label>
              <div className="space-y-1">
                {ROUTE_TYPE_OPTIONS.map((opt) => {
                  const isCurrent = (selectedConnection.routeType || '135_bend') === opt.type;
                  return (
                    <button
                      key={opt.type}
                      onClick={() => onUpdateConnectionRouteType(selectedConnection.id, opt.type)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border transition-all text-left ${
                        isCurrent
                          ? isLight
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                            : 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-medium'
                          : btnInactive
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs w-4 text-center">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </div>
                      <span className={`text-[10px] font-mono ${textMuted}`}>
                        {opt.type === '135_bend' && '45°/135° 折角'}
                        {opt.type === '90_ortho' && '水平後垂直'}
                        {opt.type === '90_rotated' && '菱形 90° 斜角'}
                        {opt.type === 'straight' && '兩點直連'}
                        {opt.type === 'any_angle' && 'AB雙線 360° 雙轉盤'}
                        {opt.type === 'free_curve' && '自繪軌跡節點'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 任意角度雙轉盤 (AB 兩線皆可 360° 旋轉選擇) */}
            {selectedConnection.routeType === 'any_angle' && onUpdateConnectionAngles && (
              <div className={`p-3 rounded-lg border space-y-2.5 ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Compass className="w-4 h-4 text-indigo-500" />
                    <span className={textHeading}>任意角度雙轉盤</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                      isLight
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    }`}
                  >
                    AB 兩線 360° 自由旋轉
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${textMuted}`}>
                  拖曳下方兩個轉盤旋鈕，可分別以 360° 調整站點 A 與站點 B 的出發走向，兩線相交匯合成折角（按住 Shift 可每 15° 吸附）。
                </p>

                {/* Two Dials Side-by-Side */}
                <div className="grid grid-cols-2 gap-2">
                  <CircularAngleDial
                    label="轉盤 A (線段 A)"
                    subLabel={(() => {
                      const s = stations.find((st) => st.id === selectedConnection.fromStationId);
                      return s?.isVirtual ? `虛擬節點 (${s.x}, ${s.y})` : (s?.name || '站點 A');
                    })()}
                    angle={selectedConnection.angleA !== undefined ? selectedConnection.angleA : 0}
                    onChange={(deg) =>
                      onUpdateConnectionAngles(
                        selectedConnection.id,
                        deg,
                        selectedConnection.angleB !== undefined ? selectedConnection.angleB : 90
                      )
                    }
                    accentColor={selectedConnection.color || '#6366F1'}
                    theme={theme}
                  />
                  <CircularAngleDial
                    label="轉盤 B (線段 B)"
                    subLabel={(() => {
                      const s = stations.find((st) => st.id === selectedConnection.toStationId);
                      return s?.isVirtual ? `虛擬節點 (${s.x}, ${s.y})` : (s?.name || '站點 B');
                    })()}
                    angle={selectedConnection.angleB !== undefined ? selectedConnection.angleB : 90}
                    onChange={(deg) =>
                      onUpdateConnectionAngles(
                        selectedConnection.id,
                        selectedConnection.angleA !== undefined ? selectedConnection.angleA : 0,
                        deg
                      )
                    }
                    accentColor={selectedConnection.color || '#6366F1'}
                    theme={theme}
                  />
                </div>
              </div>
            )}

            {/* 走線內外翻轉功能 (135度線、90度線、90度旋轉線、任意角度線段) */}
            {['135_bend', '90_ortho', '90_rotated', 'any_angle'].includes(
              selectedConnection.routeType || '135_bend'
            ) && onToggleConnectionFlip && (
              <div className={`p-3 rounded-lg border space-y-2.5 ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
                    <span className={textHeading}>走線內外翻轉</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                      selectedConnection.isFlipped
                        ? isLight
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : isLight
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    }`}
                  >
                    {selectedConnection.isFlipped ? '反向 / 內側走線' : '正向 / 外側走線'}
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${textMuted}`}>
                  切換折角的凹凸走向（例如 135° 折線先折/後折、90° 垂直先橫後直/先直後橫、90° 旋轉菱形凸向對邊）。
                </p>
                <button
                  type="button"
                  onClick={() => onToggleConnectionFlip(selectedConnection.id)}
                  className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer border shadow-sm ${
                    selectedConnection.isFlipped
                      ? isLight
                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-100'
                        : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                      : isLight
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-indigo-100'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
                  }`}
                  title="點擊翻轉折角內外方向"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>點擊翻轉折向 (正向 ⇄ 反向)</span>
                </button>
              </div>
            )}

            {/* Waypoint info for free_curve */}
            {selectedConnection.routeType === 'free_curve' && (
              <div
                className={`p-3 rounded-lg border space-y-1.5 ${
                  isLight
                    ? 'bg-indigo-50/80 border-indigo-200 text-slate-700'
                    : 'bg-indigo-950/30 border-indigo-800/40 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-indigo-600 font-semibold">
                  <span>自繪軌跡節點</span>
                  <span className="font-mono text-xs">
                    {(selectedConnection.waypoints || []).length} 個轉折點
                  </span>
                </div>
                <p className={`text-[11px] leading-normal ${textMuted}`}>
                  點擊此路線後，畫布上會顯示轉折處的小節點。滑鼠按住小節點拖曳即可自訂與調整路線軌跡！
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Default State: Stage 1 Instructions & Overview */}
      {!selectedStation && !selectedConnection && (
        <div className={`p-4 space-y-5 text-xs leading-relaxed ${textMuted}`}>
          <div className={`pb-3 border-b ${borderCol}`}>
            <span className="text-[11px] font-mono font-semibold text-indigo-500 tracking-wider">
              階段 1 / 共 4 階段
            </span>
            <h2 className={`text-base font-bold mt-0.5 ${textHeading}`}>
              基礎功能：節點與連線
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-800 text-indigo-400'
              }`}>
                1
              </span>
              <div>
                <strong className={`block ${textHeading}`}>節點創造 (Node Creation)</strong>
                點擊左側工具列「創造節點」，在畫布上點選任何位置即可放置車站。支援格點吸附與精確對齊。
              </div>
            </div>

            <div className="flex gap-2.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-800 text-indigo-400'
              }`}>
                2
              </span>
              <div>
                <strong className={`block ${textHeading}`}>色彩選擇與節點連接</strong>
                在<strong>左側工具列「色彩」</strong>自選 16,777,216 色圖譜或輸入色碼，切換至「節點連接」依序串連車站（兩色交會時將自動轉為轉乘站）。
              </div>
            </div>

            <div className="flex gap-2.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-800 text-indigo-400'
              }`}>
                3
              </span>
              <div>
                <strong className={`block ${textHeading}`}>屬性編輯與移動</strong>
                切換回左側工具列「選取」，點選任何車站可自訂站名、轉乘站型態、站名位置，或自由拖曳調整路網結構。
              </div>
            </div>
          </div>

          <div className={`pt-2 border-t ${borderCol}`}>
            <h3 className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
              <Layers className={`w-3.5 h-3.5 ${textMuted}`} />
              快捷操作提示
            </h3>
            <ul className={`space-y-1.5 font-mono text-[11px] ${textMuted}`}>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>Shift + 拖曳</kbd> 框選多個站點並批次移動</li>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>滾輪 / 雙指</kbd> 縮放與平移無限畫布</li>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>空白鍵 / 平移工具</kbd> 拖曳平移視野</li>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>右下角 HUD</kbd> 聚焦路網或回到 (0,0)</li>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>Delete</kbd> 批次刪除選取之節點或路線</li>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>Esc</kbd> 取消連線或取消選取</li>
            </ul>
          </div>
        </div>
      )}
    </aside>
  );
};
