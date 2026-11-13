import React, { useState, useEffect } from 'react';
import {
  Station,
  MetroLine,
  Connection,
  StationType,
  InterchangeStyle,
  RouteType,
  EffectiveTheme,
  LABEL_POSITION_PRESETS,
  clampLineOffset,
  normalizeSvgScale,
  normalizeSvgAngle,
  normalizeStrokeWidth,
  normalizeCornerRadius,
  normalizeOpacity,
  StrokeStyle,
  LineCapStyle,
} from '../types/metro';
import { ROUTE_TYPE_OPTIONS } from './Toolbar';
import { NetworkStatsPanel } from './NetworkStatsPanel';
import { ZOrderControl } from './ZOrderControl';
import {
  MapPin,
  GitFork,
  Trash2,
  ArrowRight,
  Hash,
  XCircle,
  ArrowLeftRight,
  RotateCw,
  RotateCcw,
  Move,
  X,
  Keyboard,
  BarChart3,
  Search,
  Navigation,
  ArrowUpDown,
  Route,
  Eye,
  EyeOff,
  Plus,
  ChevronDown,
  ChevronUp,
  CopyPlus,
} from 'lucide-react';
import { ShortestPathResult, PathAlgorithm, findShortestPath } from '../utils/pathfinding';

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

  const rad = (normalizedAngle * Math.PI) / 180;
  const needleLen = 34;
  const knobX = Math.round(Math.cos(rad) * needleLen);
  const knobY = Math.round(Math.sin(rad) * needleLen);

  const getDirectionText = (deg: number) => {
    if (deg >= 338 || deg < 23) return '東 0°';
    if (deg >= 23 && deg < 68) return '東南 45°';
    if (deg >= 68 && deg < 113) return '南 90°';
    if (deg >= 113 && deg < 158) return '西南 135°';
    if (deg >= 158 && deg < 203) return '西 180°';
    if (deg >= 203 && deg < 248) return '西北 225°';
    if (deg >= 248 && deg < 293) return '北 270°';
    return '東北 315°';
  };

  const needleColor = accentColor || (isLight ? '#18181B' : '#F4F4F5');

  return (
    <div
      className={`p-2.5 rounded-lg border flex flex-col items-center select-none ${
        isLight ? 'bg-zinc-50/70 border-zinc-200' : 'bg-zinc-950/70 border-zinc-800'
      }`}
    >
      <div className="w-full text-center mb-1">
        <div className={`text-[11px] font-semibold tracking-tight ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
          {label}
        </div>
        <div
          className={`text-[10px] truncate px-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}
          title={subLabel}
        >
          {subLabel}
        </div>
      </div>

      <div className="relative flex items-center justify-center cursor-grab active:cursor-grabbing touch-none my-1">
        <svg
          ref={svgRef}
          width={96}
          height={96}
          viewBox="-48 -48 96 96"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="overflow-visible"
        >
          <circle
            cx={0}
            cy={0}
            r={43}
            fill={isLight ? '#FFFFFF' : '#09090B'}
            stroke={isLight ? '#E4E4E7' : '#27272A'}
            strokeWidth={1.25}
          />

          {Array.from({ length: 24 }).map((_, i) => {
            const tickDeg = i * 15;
            const isMajor = tickDeg % 45 === 0;
            const tickRad = (tickDeg * Math.PI) / 180;
            const rInner = isMajor ? 36 : 40;
            const rOuter = 43;
            return (
              <line
                key={`tick-${tickDeg}`}
                x1={Math.cos(tickRad) * rInner}
                y1={Math.sin(tickRad) * rInner}
                x2={Math.cos(tickRad) * rOuter}
                y2={Math.sin(tickRad) * rOuter}
                stroke={isMajor ? (isLight ? '#71717A' : '#A1A1AA') : (isLight ? '#E4E4E7' : '#27272A')}
                strokeWidth={isMajor ? 1.25 : 0.75}
              />
            );
          })}

          <text x={30} y={3} textAnchor="middle" className="text-[7.5px] font-mono fill-zinc-400 select-none">0°</text>
          <text x={0} y={33} textAnchor="middle" className="text-[7.5px] font-mono fill-zinc-400 select-none">90°</text>
          <text x={-30} y={3} textAnchor="middle" className="text-[7.5px] font-mono fill-zinc-400 select-none">180°</text>
          <text x={0} y={-27} textAnchor="middle" className="text-[7.5px] font-mono fill-zinc-400 select-none">270°</text>

          <circle
            cx={0}
            cy={0}
            r={16}
            fill={isLight ? '#FAFAFA' : '#18181B'}
            stroke={isLight ? '#E4E4E7' : '#27272A'}
            strokeWidth={1}
          />

          <text
            x={0}
            y={3.5}
            textAnchor="middle"
            className={`text-[10px] font-mono font-semibold select-none pointer-events-none ${
              isLight ? 'fill-zinc-900' : 'fill-zinc-100'
            }`}
          >
            {normalizedAngle}°
          </text>

          <line
            x1={0}
            y1={0}
            x2={knobX}
            y2={knobY}
            stroke={needleColor}
            strokeWidth={2}
            strokeLinecap="round"
          />

          <circle
            cx={knobX}
            cy={knobY}
            r={5}
            fill={isLight ? '#FFFFFF' : '#18181B'}
            stroke={needleColor}
            strokeWidth={2}
          />
        </svg>
      </div>

      <div className="w-full flex items-center justify-between mt-0.5 px-0.5 text-[10px] font-mono tabular-nums">
        <span className={`truncate max-w-[56px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {getDirectionText(normalizedAngle)}
        </span>
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
            className={`w-10 px-1 py-0.5 text-center font-semibold text-[10px] rounded border focus:outline-none tabular-nums ${
              isLight
                ? 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-900'
                : 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-400'
            }`}
          />
          <span className={isLight ? 'text-zinc-400' : 'text-zinc-500'}>°</span>
        </div>
      </div>

      <div className="w-full grid grid-cols-2 gap-1 mt-1.5">
        <button
          type="button"
          onClick={() => onChange(((normalizedAngle - 15) % 360 + 360) % 360)}
          className={`py-0.5 text-[9.5px] font-mono rounded border flex items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            isLight
              ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
          }`}
          title="逆時針微調 15°"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>-15°</span>
        </button>
        <button
          type="button"
          onClick={() => onChange((normalizedAngle + 15) % 360)}
          className={`py-0.5 text-[9.5px] font-mono rounded border flex items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            isLight
              ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
          }`}
          title="順時針微調 15°"
        >
          <RotateCw className="w-2.5 h-2.5" />
          <span>+15°</span>
        </button>
      </div>

      <div className="w-full grid grid-cols-4 gap-0.5 mt-1">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`py-0.5 text-[9px] font-mono rounded transition-colors cursor-pointer border tabular-nums ${
              normalizedAngle === preset
                ? isLight
                  ? 'bg-zinc-900 text-white border-zinc-900 font-semibold'
                  : 'bg-zinc-100 text-zinc-900 border-zinc-100 font-semibold'
                : isLight
                ? 'bg-white hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
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
  onSelectStation?: (id: string | null) => void;
  onSelectConnection?: (id: string | null) => void;
  onUpdateStation: (updated: Station) => void;
  onDeleteStation: (id: string) => void;
  onUpdateConnectionColor: (connId: string, newColor: string) => void;
  onUpdateConnectionRouteType: (connId: string, routeType: RouteType) => void;
  onToggleConnectionFlip?: (connId: string) => void;
  onUpdateConnectionAngles?: (connId: string, angleA: number, angleB: number) => void;
  onUpdateConnectionZIndex?: (connId: string, zIndex: number) => void;
  onUpdateConnectionOffset?: (connId: string, offset: number) => void;
  onUpdateConnectionStyle?: (connId: string, patch: Partial<Connection>) => void;
  onDuplicateParallelConnection?: (connId: string) => void;
  onAutoBundleConnections?: (connId: string, spacing?: number) => void;
  onUpdateStationZIndex?: (stationId: string, zIndex: number) => void;
  onDeleteConnection: (id: string) => void;
  selectedStationIds?: string[];
  shortestPathResult?: ShortestPathResult | null;
  onUpdateShortestPath?: (result: ShortestPathResult | null) => void;
  showPathPreview?: boolean;
  onTogglePathPreview?: (show: boolean) => void;
  onAddConnection?: (fromId: string, toId: string, color: string, routeType: RouteType) => void;
  activeColor?: string;
  activeRouteType?: RouteType;
  theme?: EffectiveTheme;
  onClose?: () => void;
  onOpenShortcuts?: () => void;
  activeTab?: 'inspector' | 'stats' | 'routing';
  onTabChange?: (tab: 'inspector' | 'stats' | 'routing') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedStation,
  selectedConnection,
  selectedStationIds,
  stations,
  lines,
  connections,
  recentColors,
  onSelectStation,
  onSelectConnection,
  onUpdateStation,
  onDeleteStation,
  onUpdateConnectionColor,
  onUpdateConnectionRouteType,
  onToggleConnectionFlip,
  onUpdateConnectionAngles,
  onUpdateConnectionZIndex,
  onUpdateConnectionOffset,
  onUpdateConnectionStyle,
  onDuplicateParallelConnection,
  onAutoBundleConnections,
  onUpdateStationZIndex,
  onDeleteConnection,
  theme = 'dark',
  onClose,
  onOpenShortcuts,
  activeTab,
  onTabChange,
  shortestPathResult,
  onUpdateShortestPath,
  showPathPreview = true,
  onTogglePathPreview,
  onAddConnection,
  activeColor,
  activeRouteType,
}) => {
  const isLight = theme === 'light';

  const borderCol = isLight ? 'border-zinc-200' : 'border-zinc-800';
  const textMuted = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const textHeading = isLight ? 'text-zinc-900' : 'text-zinc-100';
  const surfaceSubtle = isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800';
  const inputCls = isLight
    ? 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-zinc-900'
    : 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-400';
  const btnInactive = isLight
    ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
    : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:bg-zinc-800';
  const btnActive = isLight
    ? 'bg-zinc-900 text-white border-zinc-900 font-semibold'
    : 'bg-zinc-100 text-zinc-900 border-zinc-100 font-semibold';

  const [connHexInput, setConnHexInput] = useState('');
  const [offsetInput, setOffsetInput] = useState('0');
  const [stationSearchQuery, setStationSearchQuery] = useState('');

  const getStationLinesAndColors = (st: Station) => {
    const stConns = connections.filter(
      (c) => c.fromStationId === st.id || c.toStationId === st.id
    );
    const colors = Array.from(
      new Set(stConns.map((c) => c.color).filter(Boolean))
    ) as string[];
    return {
      colors,
      connCount: stConns.length,
    };
  };

  const filteredStations = React.useMemo(() => {
    const q = stationSearchQuery.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter((st) => {
      if (st.name && st.name.toLowerCase().includes(q)) return true;
      if (st.code && st.code.toLowerCase().includes(q)) return true;
      if (st.isVirtual) {
        if ('虛擬節點'.includes(q) || 'virtual'.includes(q)) return true;
        if (`${st.x},${st.y}`.includes(q.replace(/\s+/g, ''))) return true;
      }
      return false;
    });
  }, [stations, stationSearchQuery]);

  const [internalTab, setInternalTab] = useState<'inspector' | 'stats' | 'routing'>('inspector');
  const currentTab = activeTab ?? internalTab;

  const [pathStartId, setPathStartId] = useState<string>('');
  const [pathEndId, setPathEndId] = useState<string>('');
  const [pathAlgorithm, setPathAlgorithm] = useState<PathAlgorithm>('dijkstra');
  const [isPathPanelOpen, setIsPathPanelOpen] = useState<boolean>(false);

  useEffect(() => {
    if (selectedStationIds && selectedStationIds.length === 2) {
      setPathStartId(selectedStationIds[0]);
      setPathEndId(selectedStationIds[1]);
      setIsPathPanelOpen(true);
    }
  }, [selectedStationIds]);

  useEffect(() => {
    if (pathStartId && pathEndId && pathStartId !== pathEndId) {
      const result = findShortestPath(stations, connections, pathStartId, pathEndId, pathAlgorithm);
      if (onUpdateShortestPath) {
        onUpdateShortestPath(result);
      }
    } else {
      if (onUpdateShortestPath) {
        onUpdateShortestPath(null);
      }
    }
  }, [pathStartId, pathEndId, pathAlgorithm, stations, connections]);

  const handleSwapPathStations = () => {
    setPathStartId(pathEndId);
    setPathEndId(pathStartId);
  };

  const handleClearPath = () => {
    setPathStartId('');
    setPathEndId('');
    if (onUpdateShortestPath) {
      onUpdateShortestPath(null);
    }
  };

  const handleApplySuggestedConnections = () => {
    if (!shortestPathResult || shortestPathResult.stationIds.length < 2 || !onAddConnection) return;
    const color = activeColor || '#E11D48';
    const rType = activeRouteType || '135_bend';

    for (let i = 0; i < shortestPathResult.stationIds.length - 1; i++) {
      const from = shortestPathResult.stationIds[i];
      const to = shortestPathResult.stationIds[i + 1];
      const exists = connections.some(
        (c) =>
          (c.fromStationId === from && c.toStationId === to) ||
          (c.fromStationId === to && c.toStationId === from)
      );
      if (!exists) {
        onAddConnection(from, to, color, rType);
      }
    }
  };

  const handleTabChange = (tab: 'inspector' | 'stats' | 'routing') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  useEffect(() => {
    if ((selectedStation || selectedConnection) && currentTab === 'stats') {
      if (onTabChange) {
        onTabChange('inspector');
      } else {
        setInternalTab('inspector');
      }
    }
  }, [selectedStation?.id, selectedConnection?.id]);

  useEffect(() => {
    if (selectedConnection) {
      setConnHexInput(selectedConnection.color || '#E11D48');
      const nextVal = clampLineOffset(selectedConnection.offset ?? 0);
      setOffsetInput((prev) => {
        const parsed = parseFloat(prev);
        return Number.isFinite(parsed) && parsed === nextVal ? prev : String(nextVal);
      });
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

  const isMobileOpen = Boolean(
    selectedStation || selectedConnection || currentTab === 'stats' || currentTab === 'routing'
  );

  return (
    <aside
      className={`${
        isMobileOpen
          ? 'fixed inset-x-0 bottom-0 max-h-[82vh] z-40 w-full rounded-t-xl shadow-2xl border-t border-x'
          : 'hidden'
      } lg:relative lg:inset-auto lg:flex lg:w-80 lg:max-h-full lg:rounded-none lg:shadow-none lg:border-t-0 lg:border-x-0 border-l flex flex-col shrink-0 overflow-y-auto transition-colors ${
        isLight
          ? 'bg-white border-zinc-200 text-zinc-800'
          : 'bg-[#111113] border-zinc-800 text-zinc-200'
      }`}
    >
      {isMobileOpen && (
        <div className="pt-2 pb-1 flex justify-center lg:hidden shrink-0">
          <div className="w-10 h-1 bg-zinc-400/40 rounded-full" />
        </div>
      )}

      {/* Top Underline Tab Switcher */}
      <div
        className={`h-10 px-2 border-b shrink-0 flex items-center justify-between ${
          isLight ? 'bg-white border-zinc-200' : 'bg-[#111113] border-zinc-800'
        }`}
      >
        <div className="flex items-stretch h-full flex-1">
          {[
            { id: 'inspector' as const, label: '屬性檢視' },
            { id: 'routing' as const, label: '路徑規劃' },
            { id: 'stats' as const, label: '路網統計' },
          ].map((tab) => {
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex-1 flex items-center justify-center px-2 text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? isLight
                      ? 'text-zinc-900 font-semibold'
                      : 'text-zinc-100 font-semibold'
                    : isLight
                    ? 'text-zinc-500 hover:text-zinc-800 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 font-medium'
                }`}
              >
                <span>{tab.label}</span>
                {active && (
                  <span
                    className={`absolute inset-x-3 bottom-0 h-[1.5px] ${
                      isLight ? 'bg-zinc-900' : 'bg-zinc-100'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {isMobileOpen && onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-md lg:hidden transition-colors cursor-pointer ${
              isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-500 hover:text-zinc-200'
            }`}
            title="關閉面板"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab: 路網統計 */}
      {currentTab === 'stats' && (
        <NetworkStatsPanel
          stations={stations}
          connections={connections}
          lines={lines}
          theme={theme}
          onSelectStation={onSelectStation}
        />
      )}

      {/* Tab: 自動路徑規劃 */}
      {currentTab === 'routing' && (
        <div className={`divide-y text-xs ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
          {/* Header */}
          <div className="p-4 flex items-center justify-between gap-2">
            <div>
              <h2 className={`font-semibold text-sm ${textHeading}`}>自動路徑規劃</h2>
              <p className={`text-[11px] mt-0.5 ${textMuted}`}>
                計算起終點最短路徑並高亮沿途連線
              </p>
            </div>
            {(pathStartId || pathEndId) && (
              <button
                type="button"
                onClick={handleClearPath}
                className="text-[11px] px-2 py-1 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                清除
              </button>
            )}
          </div>

          {/* Algorithm Segmented Control */}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-medium ${textMuted}`}>搜尋演算法</span>
              <span className={`text-[11px] font-mono ${textMuted}`}>
                {pathAlgorithm === 'dijkstra' ? '最短距離加權' : '最少停靠站數'}
              </span>
            </div>
            <div
              className={`grid grid-cols-2 p-0.5 rounded-lg border ${
                isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setPathAlgorithm('dijkstra')}
                className={`py-1.5 px-2 rounded-md text-xs transition-colors cursor-pointer text-center ${
                  pathAlgorithm === 'dijkstra'
                    ? isLight
                      ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                      : 'bg-zinc-800 text-zinc-100 font-semibold'
                    : textMuted
                }`}
              >
                Dijkstra
              </button>
              <button
                type="button"
                onClick={() => setPathAlgorithm('bfs')}
                className={`py-1.5 px-2 rounded-md text-xs transition-colors cursor-pointer text-center ${
                  pathAlgorithm === 'bfs'
                    ? isLight
                      ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                      : 'bg-zinc-800 text-zinc-100 font-semibold'
                    : textMuted
                }`}
              >
                BFS 廣度優先
              </button>
            </div>
          </div>

          {/* Origin & Destination Selectors */}
          <div className="p-4 space-y-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className={`text-[11px] font-medium flex items-center gap-1.5 ${textHeading}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>起點站</span>
                </label>
                {selectedStation && selectedStation.id !== pathStartId && (
                  <button
                    type="button"
                    onClick={() => setPathStartId(selectedStation.id)}
                    className={`text-[10px] hover:underline font-medium cursor-pointer ${
                      isLight ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    代入選取站（{selectedStation.isVirtual ? '虛擬節點' : selectedStation.name}）
                  </button>
                )}
              </div>
              <select
                value={pathStartId}
                onChange={(e) => setPathStartId(e.target.value)}
                className={`w-full py-1.5 px-2.5 text-xs rounded-md border outline-none ${inputCls}`}
              >
                <option value="">選擇起點站</option>
                {stations.map((st) => (
                  <option key={`routing-start-${st.id}`} value={st.id}>
                    {st.isVirtual ? `虛擬節點 (${st.x}, ${st.y})` : st.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handleSwapPathStations}
                disabled={!pathStartId && !pathEndId}
                className={`px-2.5 py-1 rounded-md border flex items-center gap-1 text-[11px] transition-colors cursor-pointer disabled:opacity-30 ${btnInactive}`}
                title="交換起點與終點站"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>起終點對調</span>
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className={`text-[11px] font-medium flex items-center gap-1.5 ${textHeading}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>終點站</span>
                </label>
                {selectedStation && selectedStation.id !== pathEndId && (
                  <button
                    type="button"
                    onClick={() => setPathEndId(selectedStation.id)}
                    className={`text-[10px] hover:underline font-medium cursor-pointer ${
                      isLight ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    代入選取站（{selectedStation.isVirtual ? '虛擬節點' : selectedStation.name}）
                  </button>
                )}
              </div>
              <select
                value={pathEndId}
                onChange={(e) => setPathEndId(e.target.value)}
                className={`w-full py-1.5 px-2.5 text-xs rounded-md border outline-none ${inputCls}`}
              >
                <option value="">選擇終點站</option>
                {stations.map((st) => (
                  <option key={`routing-end-${st.id}`} value={st.id}>
                    {st.isVirtual ? `虛擬節點 (${st.x}, ${st.y})` : st.name}
                  </option>
                ))}
              </select>
            </div>

            {onTogglePathPreview && (
              <button
                type="button"
                onClick={() => onTogglePathPreview(!showPathPreview)}
                className={`w-full py-1.5 px-2.5 rounded-md text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  showPathPreview ? btnActive : btnInactive
                }`}
              >
                {showPathPreview ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>畫布高亮顯示：開啟</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>畫布高亮顯示：關閉</span>
                  </>
                )}
              </button>
            )}
          </div>

          {stations.length < 2 && (
            <div className={`p-4 text-center ${textMuted}`}>
              畫布上至少需有 2 座車站方能進行路徑規劃。
            </div>
          )}

          {pathStartId && pathEndId && pathStartId === pathEndId && (
            <div className="p-4 text-amber-600 dark:text-amber-400 text-center font-medium">
              起點站與終點站相同，請選擇兩座不同的車站。
            </div>
          )}

          {/* Computed Shortest Path Result */}
          {shortestPathResult && pathStartId && pathEndId && pathStartId !== pathEndId && (
            <div className="p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className={`font-semibold text-xs ${textHeading}`}>
                  {shortestPathResult.isReachable
                    ? '已計算最短路徑'
                    : '此兩站尚未於路網相連'}
                </span>
                <span className={`text-[10px] font-mono ${textMuted}`}>
                  {shortestPathResult.algorithm === 'bfs' ? 'BFS' : 'Dijkstra'}
                </span>
              </div>

              {!shortestPathResult.isReachable && (
                <div className={`p-2.5 rounded-lg border text-[11px] space-y-2 ${surfaceSubtle}`}>
                  <p className={textMuted}>
                    目前無連通路徑；畫布上以虛線標示建議順序，可直接點擊下方按鈕建立連線。
                  </p>
                  {onAddConnection && (
                    <button
                      type="button"
                      onClick={handleApplySuggestedConnections}
                      className={`w-full py-1.5 px-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors ${btnActive}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>一鍵依建議順序建立連線</span>
                    </button>
                  )}
                </div>
              )}

              {/* 3-Column Hairline KPI Strip */}
              <div
                className={`grid grid-cols-3 divide-x border rounded-lg ${borderCol} ${
                  isLight ? 'divide-zinc-200 bg-zinc-50/50' : 'divide-zinc-800 bg-zinc-900/30'
                }`}
              >
                <div className="p-2 text-center">
                  <div className={`text-[10px] ${textMuted}`}>停靠</div>
                  <div className={`text-xs font-semibold font-mono tabular-nums mt-0.5 ${textHeading}`}>
                    {shortestPathResult.stopsCount} 站
                  </div>
                </div>
                <div className="p-2 text-center">
                  <div className={`text-[10px] ${textMuted}`}>轉乘</div>
                  <div className={`text-xs font-semibold font-mono tabular-nums mt-0.5 ${textHeading}`}>
                    {shortestPathResult.transfersCount === 0
                      ? '直達'
                      : `${shortestPathResult.transfersCount} 次`}
                  </div>
                </div>
                <div className="p-2 text-center">
                  <div className={`text-[10px] ${textMuted}`}>總長</div>
                  <div className={`text-xs font-semibold font-mono tabular-nums mt-0.5 ${textHeading}`}>
                    {shortestPathResult.totalDistance}
                  </div>
                </div>
              </div>

              {/* Highlighted Connections List */}
              {shortestPathResult.isReachable && shortestPathResult.connectionIds.length > 0 && (
                <div className="space-y-1.5">
                  <div className={`text-[11px] font-medium flex items-center justify-between ${textMuted}`}>
                    <span>沿途連線區段 ({shortestPathResult.connectionIds.length})</span>
                    <span className="font-mono text-[10px]">點擊選取</span>
                  </div>
                  <div
                    className={`max-h-40 overflow-y-auto divide-y rounded-lg border ${borderCol} ${
                      isLight ? 'divide-zinc-100' : 'divide-zinc-800/70'
                    }`}
                  >
                    {shortestPathResult.connectionIds.map((connId, idx) => {
                      const conn = connections.find((c) => c.id === connId);
                      const fromSt = stations.find((s) => s.id === shortestPathResult.stationIds[idx]);
                      const toSt = stations.find((s) => s.id === shortestPathResult.stationIds[idx + 1]);
                      if (!conn || !fromSt || !toSt) return null;
                      const stepDist = shortestPathResult.steps[idx + 1]?.distanceFromPrev ?? 0;

                      return (
                        <button
                          key={`route-conn-${conn.id}-${idx}`}
                          type="button"
                          onClick={() => onSelectConnection?.(conn.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                            selectedConnection?.id === conn.id
                              ? isLight
                                ? 'bg-zinc-100 font-semibold'
                                : 'bg-zinc-800 font-semibold'
                              : isLight
                              ? 'hover:bg-zinc-50'
                              : 'hover:bg-zinc-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: conn.color || '#71717A' }}
                            />
                            <span className="truncate text-[11px]">
                              {fromSt.isVirtual ? `節點(${fromSt.x},${fromSt.y})` : fromSt.name}
                            </span>
                            <ArrowRight className={`w-3 h-3 shrink-0 ${textMuted}`} />
                            <span className="truncate text-[11px]">
                              {toSt.isVirtual ? `節點(${toSt.x},${toSt.y})` : toSt.name}
                            </span>
                          </div>
                          <span className={`text-[10px] font-mono tabular-nums shrink-0 ml-1 ${textMuted}`}>
                            {stepDist}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step-by-step Stations */}
              <div className="space-y-1.5">
                <div className={`text-[11px] font-medium flex items-center justify-between ${textMuted}`}>
                  <span>行經車站順序 ({shortestPathResult.steps.length})</span>
                  <span className="font-mono text-[10px]">點擊定位</span>
                </div>
                <div
                  className={`max-h-44 overflow-y-auto divide-y rounded-lg border ${borderCol} ${
                    isLight ? 'divide-zinc-100' : 'divide-zinc-800/70'
                  }`}
                >
                  {shortestPathResult.steps.map((step, idx) => {
                    const isStart = idx === 0;
                    const isEnd = idx === shortestPathResult.steps.length - 1;
                    return (
                      <button
                        key={`routing-step-${step.station.id}-${idx}`}
                        type="button"
                        onClick={() => onSelectStation?.(step.station.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                          isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-semibold shrink-0 ${
                              isStart
                                ? 'bg-emerald-600 text-white'
                                : isEnd
                                ? 'bg-rose-600 text-white'
                                : isLight
                                ? 'bg-zinc-200 text-zinc-700'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {isStart ? '起' : isEnd ? '終' : idx + 1}
                          </span>
                          <span className="truncate font-medium text-xs">
                            {step.station.isVirtual
                              ? `虛擬節點 (${step.station.x}, ${step.station.y})`
                              : step.station.name}
                          </span>
                          {step.isTransfer && (
                            <span className={`text-[10px] shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                              轉乘
                            </span>
                          )}
                        </div>
                        {step.distanceFromPrev !== undefined && step.distanceFromPrev > 0 && (
                          <span className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                            +{step.distanceFromPrev}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: 屬性檢視 */}
      {currentTab === 'inspector' && (
        <>
          {/* Station Quick Search Bar */}
          <div
            className={`sticky top-0 z-20 px-4 py-3 border-b backdrop-blur-md transition-colors ${
              isLight ? 'bg-white/95 border-zinc-200' : 'bg-[#111113]/95 border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="station-inspector-search" className={`text-[11px] font-medium cursor-pointer ${textMuted}`}>
                車站搜尋
              </label>
              <span className={`text-[11px] font-mono tabular-nums ${textMuted}`}>
                {stationSearchQuery.trim()
                  ? `${filteredStations.length}/${stations.length}`
                  : `${stations.length} 站`}
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                id="station-inspector-search"
                type="text"
                value={stationSearchQuery}
                onChange={(e) => setStationSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setStationSearchQuery('');
                    e.currentTarget.blur();
                  } else if (e.key === 'Enter' && filteredStations.length > 0) {
                    onSelectStation?.(filteredStations[0].id);
                  }
                }}
                placeholder="輸入站名或代碼搜尋..."
                className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-md border outline-none transition-colors ${inputCls}`}
              />
              {stationSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStationSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  title="清除搜尋 (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {stationSearchQuery.trim().length > 0 && (
              <div
                className={`mt-2 rounded-lg border max-h-56 overflow-y-auto divide-y shadow-lg ${
                  isLight
                    ? 'bg-white border-zinc-200 divide-zinc-100'
                    : 'bg-zinc-950 border-zinc-800 divide-zinc-800'
                }`}
              >
                {filteredStations.length === 0 ? (
                  <div className="p-3 text-center text-xs">
                    <p className={textMuted}>
                      找不到「{stationSearchQuery}」
                    </p>
                    <button
                      type="button"
                      onClick={() => setStationSearchQuery('')}
                      className={`mt-1 text-[11px] underline cursor-pointer ${textHeading}`}
                    >
                      清除搜尋
                    </button>
                  </div>
                ) : (
                  filteredStations.map((st) => {
                    const isSelected = selectedStation?.id === st.id;
                    const { colors, connCount } = getStationLinesAndColors(st);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onSelectStation?.(st.id)}
                        className={`w-full px-2.5 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? isLight
                              ? 'bg-zinc-100 text-zinc-900 font-semibold'
                              : 'bg-zinc-800 text-zinc-100 font-semibold'
                            : isLight
                            ? 'hover:bg-zinc-50 text-zinc-700'
                            : 'hover:bg-zinc-900 text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {st.isVirtual ? (
                            <XCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          ) : st.type === 'interchange' || st.type === 'interchange_3line' ? (
                            <GitFork className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs truncate">
                              {st.isVirtual ? `虛擬節點 (${st.x}, ${st.y})` : st.name}
                            </div>
                            <div className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                              ({st.x}, {st.y}){connCount > 0 ? ` · ${connCount} 線` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {colors.length > 0 && (
                            <div className="flex -space-x-1 items-center">
                              {colors.slice(0, 4).map((c, idx) => (
                                <span
                                  key={idx}
                                  className="w-2 h-2 rounded-full border border-white dark:border-zinc-900 shrink-0"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          )}
                          <span className={`text-[10px] ${textMuted}`}>
                            {isSelected ? '已選' : '選取'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Inspector Quick Shortest-Path Accordion */}
          <div className={`border-b ${borderCol}`}>
            <button
              type="button"
              onClick={() => setIsPathPanelOpen((prev) => !prev)}
              className={`w-full px-4 py-2.5 flex items-center justify-between text-left cursor-pointer select-none transition-colors ${
                isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Navigation className={`w-3.5 h-3.5 shrink-0 ${textMuted}`} />
                <span className={`text-xs font-medium ${textHeading}`}>快速路徑預覽</span>
                {shortestPathResult && (
                  <span className={`text-[10px] font-mono tabular-nums truncate ${textMuted}`}>
                    · {shortestPathResult.stopsCount} 站 / {shortestPathResult.totalDistance}
                  </span>
                )}
              </div>
              <span className={textMuted}>
                {isPathPanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>

            {isPathPanelOpen && (
              <div className="px-4 pb-3.5 space-y-2.5 text-xs">
                <div
                  className={`grid grid-cols-2 p-0.5 rounded-md border ${
                    isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setPathAlgorithm('dijkstra')}
                    className={`py-1 rounded text-[11px] transition-colors cursor-pointer ${
                      pathAlgorithm === 'dijkstra'
                        ? isLight
                          ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                          : 'bg-zinc-800 text-zinc-100 font-semibold'
                        : textMuted
                    }`}
                  >
                    Dijkstra
                  </button>
                  <button
                    type="button"
                    onClick={() => setPathAlgorithm('bfs')}
                    className={`py-1 rounded text-[11px] transition-colors cursor-pointer ${
                      pathAlgorithm === 'bfs'
                        ? isLight
                          ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                          : 'bg-zinc-800 text-zinc-100 font-semibold'
                        : textMuted
                    }`}
                  >
                    BFS
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <select
                      value={pathStartId}
                      onChange={(e) => setPathStartId(e.target.value)}
                      className={`flex-1 py-1 px-2 text-xs rounded-md border outline-none ${inputCls}`}
                    >
                      <option value="">選擇起點站</option>
                      {stations.map((st) => (
                        <option key={`start-${st.id}`} value={st.id}>
                          {st.isVirtual ? `虛擬節點 (${st.x}, ${st.y})` : st.name}
                        </option>
                      ))}
                    </select>
                    {selectedStation && selectedStation.id !== pathStartId && (
                      <button
                        type="button"
                        onClick={() => setPathStartId(selectedStation.id)}
                        className={`px-2 py-1 text-[10px] rounded-md border shrink-0 cursor-pointer ${btnInactive}`}
                        title="將目前選取的車站設為起點"
                      >
                        起點
                      </button>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleSwapPathStations}
                      disabled={!pathStartId && !pathEndId}
                      className={`p-1 rounded-md border transition-colors cursor-pointer disabled:opacity-30 ${btnInactive}`}
                      title="交換起點與終點站"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <select
                      value={pathEndId}
                      onChange={(e) => setPathEndId(e.target.value)}
                      className={`flex-1 py-1 px-2 text-xs rounded-md border outline-none ${inputCls}`}
                    >
                      <option value="">選擇終點站</option>
                      {stations.map((st) => (
                        <option key={`end-${st.id}`} value={st.id}>
                          {st.isVirtual ? `虛擬節點 (${st.x}, ${st.y})` : st.name}
                        </option>
                      ))}
                    </select>
                    {selectedStation && selectedStation.id !== pathEndId && (
                      <button
                        type="button"
                        onClick={() => setPathEndId(selectedStation.id)}
                        className={`px-2 py-1 text-[10px] rounded-md border shrink-0 cursor-pointer ${btnInactive}`}
                        title="將目前選取的車站設為終點"
                      >
                        終點
                      </button>
                    )}
                  </div>
                </div>

                {stations.length < 2 && (
                  <p className={`text-[11px] ${textMuted}`}>
                    至少需有 2 座車站方能進行路徑計算。
                  </p>
                )}

                {shortestPathResult && pathStartId && pathEndId && (
                  <div className={`pt-2 border-t space-y-2 ${borderCol}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium text-xs ${textHeading}`}>
                        {shortestPathResult.isDirectSuggested
                          ? '未連通（建議順序）'
                          : '現有路網最短路徑'}
                      </span>
                      <span className={`text-[10px] font-mono ${textMuted}`}>
                        {shortestPathResult.algorithm === 'bfs' ? 'BFS' : 'Dijkstra'}
                      </span>
                    </div>

                    <div
                      className={`grid grid-cols-3 divide-x border rounded-md ${borderCol} ${
                        isLight ? 'divide-zinc-200 bg-zinc-50/50' : 'divide-zinc-800 bg-zinc-900/30'
                      }`}
                    >
                      <div className="p-1.5 text-center">
                        <div className={`text-[10px] ${textMuted}`}>停靠</div>
                        <div className={`text-xs font-semibold font-mono tabular-nums ${textHeading}`}>
                          {shortestPathResult.stopsCount} 站
                        </div>
                      </div>
                      <div className="p-1.5 text-center">
                        <div className={`text-[10px] ${textMuted}`}>轉乘</div>
                        <div className={`text-xs font-semibold font-mono tabular-nums ${textHeading}`}>
                          {shortestPathResult.transfersCount === 0
                            ? '直達'
                            : `${shortestPathResult.transfersCount} 次`}
                        </div>
                      </div>
                      <div className="p-1.5 text-center">
                        <div className={`text-[10px] ${textMuted}`}>距離</div>
                        <div className={`text-xs font-semibold font-mono tabular-nums ${textHeading}`}>
                          {shortestPathResult.totalDistance}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`max-h-32 overflow-y-auto divide-y rounded-md border ${borderCol} ${
                        isLight ? 'divide-zinc-100' : 'divide-zinc-800/70'
                      }`}
                    >
                      {shortestPathResult.steps.map((step, idx) => {
                        const isStart = idx === 0;
                        const isEnd = idx === shortestPathResult.steps.length - 1;
                        const conn = step.connection;
                        return (
                          <button
                            key={`step-${step.station.id}-${idx}`}
                            type="button"
                            onClick={() => onSelectStation?.(step.station.id)}
                            className={`w-full flex items-center justify-between px-2 py-1.5 text-left transition-colors cursor-pointer ${
                              isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-semibold shrink-0 ${
                                  isStart
                                    ? 'bg-emerald-600 text-white'
                                    : isEnd
                                    ? 'bg-rose-600 text-white'
                                    : isLight
                                    ? 'bg-zinc-200 text-zinc-700'
                                    : 'bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                {isStart ? '起' : isEnd ? '終' : idx + 1}
                              </span>
                              <span className="truncate font-medium text-xs">
                                {step.station.isVirtual
                                  ? `虛擬節點 (${step.station.x}, ${step.station.y})`
                                  : step.station.name}
                              </span>
                              {step.isTransfer && (
                                <span className={`text-[10px] ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                                  轉乘
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {conn?.color && (
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: conn.color }}
                                />
                              )}
                              {step.distanceFromPrev !== undefined && step.distanceFromPrev > 0 && (
                                <span className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                                  +{step.distanceFromPrev}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onTogglePathPreview && (
                        <button
                          type="button"
                          onClick={() => onTogglePathPreview(!showPathPreview)}
                          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            showPathPreview ? btnActive : btnInactive
                          }`}
                        >
                          {showPathPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{showPathPreview ? '預覽開啟' : '預覽關閉'}</span>
                        </button>
                      )}
                      {shortestPathResult.isDirectSuggested && onAddConnection && (
                        <button
                          type="button"
                          onClick={handleApplySuggestedConnections}
                          className={`py-1.5 px-2.5 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${btnActive}`}
                          title="依照建議順序為未連線的站點建立連線"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>一鍵連線</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClearPath}
                        className={`p-1.5 rounded-md border text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer ${btnInactive}`}
                        title="清除最短路徑"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 1. Virtual Node Inspector */}
          {selectedStation && selectedStation.isVirtual && (
            <div className={`divide-y text-xs ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className={`w-4 h-4 ${textMuted}`} />
                  <h2 className={`font-semibold text-sm ${textHeading}`}>虛擬節點設定</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDeleteStation(selectedStation.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    title="刪除此虛擬節點"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${textMuted}`}
                      title="關閉面板"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-2">
                <p className={`text-[11px] leading-relaxed ${textMuted}`}>
                  非旅客停靠站點（不顯示站名標籤），用於線路折角轉向、分岔與多線交會。
                </p>
                <div className={`flex items-center justify-between font-mono text-[11px] tabular-nums ${textMuted}`}>
                  <span>畫布坐標</span>
                  <span className={textHeading}>X: {selectedStation.x}, Y: {selectedStation.y}</span>
                </div>
              </div>

              {onUpdateStationZIndex && (
                <div className="p-4">
                  <ZOrderControl
                    value={selectedStation.zIndex ?? 0}
                    onChange={(nextZ) => onUpdateStationZIndex(selectedStation.id, nextZ)}
                    targetType="station"
                    theme={theme}
                  />
                </div>
              )}

              {/* Virtual Node SVG Free Transform */}
              {(() => {
                const curScale = selectedStation.scale ?? 1;
                const curScaleX = selectedStation.scaleX ?? 1;
                const curScaleY = selectedStation.scaleY ?? 1;
                const curRot = selectedStation.rotation ?? 0;
                const curOpacity = selectedStation.opacity ?? 1;
                const isModified =
                  curScale !== 1 || curScaleX !== 1 || curScaleY !== 1 || curRot !== 0 || curOpacity !== 1;
                const scaleMax = Math.max(4, Math.ceil(curScale + 1));

                return (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${textHeading}`}>SVG 自由變換</span>
                      {isModified && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStation({
                              ...selectedStation,
                              scale: 1,
                              scaleX: 1,
                              scaleY: 1,
                              rotation: 0,
                              opacity: 1,
                            })
                          }
                          className={`text-[11px] underline cursor-pointer ${textMuted}`}
                        >
                          重設預設
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>整體縮放</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={0.1}
                            min={0.1}
                            value={curScale}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) {
                                onUpdateStation({ ...selectedStation, scale: normalizeSvgScale(v, 0.1) });
                              }
                            }}
                            className={`w-16 px-1.5 py-0.5 text-center font-mono font-semibold text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                          />
                          <span className={`font-mono text-[10px] ${textMuted}`}>×</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0.2}
                        max={scaleMax}
                        step={0.05}
                        value={Math.min(scaleMax, curScale)}
                        onChange={(e) =>
                          onUpdateStation({
                            ...selectedStation,
                            scale: normalizeSvgScale(parseFloat(e.target.value), 0.1),
                          })
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                      <div className="grid grid-cols-5 gap-1">
                        {[0.5, 1, 1.5, 2, 3].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => onUpdateStation({ ...selectedStation, scale: preset })}
                            className={`py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer tabular-nums ${
                              curScale === preset ? btnActive : btnInactive
                            }`}
                          >
                            {preset}×
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={textMuted}>水平 X 比例</span>
                          <span className="font-mono font-semibold tabular-nums">{curScaleX}×</span>
                        </div>
                        <input
                          type="number"
                          step={0.1}
                          min={0.1}
                          value={curScaleX}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) {
                              onUpdateStation({ ...selectedStation, scaleX: normalizeSvgScale(v, 0.1) });
                            }
                          }}
                          className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={textMuted}>垂直 Y 比例</span>
                          <span className="font-mono font-semibold tabular-nums">{curScaleY}×</span>
                        </div>
                        <input
                          type="number"
                          step={0.1}
                          min={0.1}
                          value={curScaleY}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) {
                              onUpdateStation({ ...selectedStation, scaleY: normalizeSvgScale(v, 0.1) });
                            }
                          }}
                          className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={textMuted}>旋轉角度</span>
                          <span className="font-mono font-semibold tabular-nums">{curRot}°</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={359}
                          step={1}
                          value={curRot}
                          onChange={(e) =>
                            onUpdateStation({
                              ...selectedStation,
                              rotation: normalizeSvgAngle(parseFloat(e.target.value)),
                            })
                          }
                          className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={textMuted}>不透明度</span>
                          <span className="font-mono font-semibold tabular-nums">
                            {Math.round(curOpacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={curOpacity}
                          onChange={(e) =>
                            onUpdateStation({
                              ...selectedStation,
                              opacity: normalizeOpacity(parseFloat(e.target.value)),
                            })
                          }
                          className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Convert to Regular Station */}
              <div className="p-4 space-y-2">
                <label className={`block font-medium ${textMuted}`}>節點型態</label>
                <button
                  type="button"
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
                  className={`w-full py-2 px-3 rounded-md flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer border ${btnInactive}`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>轉為正式車站</span>
                </button>
              </div>

              {/* Connected lines summary */}
              <div className="p-4 space-y-2">
                <label className={`block font-medium ${textMuted}`}>相鄰路線連線</label>
                {connections.filter(
                  (c) =>
                    c.fromStationId === selectedStation.id ||
                    c.toStationId === selectedStation.id
                ).length === 0 ? (
                  <p className={textMuted}>尚無相連路線</p>
                ) : (
                  <div className={`divide-y border rounded-md ${borderCol} ${isLight ? 'divide-zinc-100' : 'divide-zinc-800/70'}`}>
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
                        const connColor = conn.color || '#71717A';
                        const otherName = otherSt?.isVirtual
                          ? `虛擬節點 (${otherSt.x}, ${otherSt.y})`
                          : otherSt?.name || '未知車站';

                        return (
                          <button
                            key={conn.id}
                            type="button"
                            onClick={() => onSelectConnection?.(conn.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 text-left transition-colors cursor-pointer ${
                              isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: connColor }}
                              />
                              <span className="truncate">往 {otherName}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] tabular-nums">
                              {(conn.offset ?? 0) !== 0 && (
                                <span className={textMuted}>
                                  偏移 {(conn.offset ?? 0) > 0 ? `+${conn.offset}` : conn.offset}
                                </span>
                              )}
                              <span className={textMuted}>{connColor}</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Regular Station Inspector */}
          {selectedStation && !selectedStation.isVirtual && (
            <div className={`divide-y text-xs ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className={`w-4 h-4 ${textMuted}`} />
                  <h2 className={`font-semibold text-sm ${textHeading}`}>車站節點設定</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDeleteStation(selectedStation.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    title="刪除此車站"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${textMuted}`}
                      title="關閉面板"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Name & Code */}
              <div className="p-4 space-y-3">
                <div>
                  <label className={`block font-medium mb-1 ${textMuted}`}>車站名稱</label>
                  <input
                    type="text"
                    value={selectedStation.name}
                    onChange={(e) =>
                      onUpdateStation({ ...selectedStation, name: e.target.value })
                    }
                    className={`w-full px-3 py-1.5 rounded-md text-sm border focus:outline-none ${inputCls}`}
                    placeholder="輸入車站名稱"
                  />
                </div>

                <div>
                  <label className={`block font-medium mb-1 ${textMuted}`}>車站代碼 (選填)</label>
                  <input
                    type="text"
                    value={selectedStation.code || ''}
                    onChange={(e) =>
                      onUpdateStation({ ...selectedStation, code: e.target.value })
                    }
                    className={`w-full px-3 py-1.5 rounded-md font-mono text-sm border focus:outline-none ${inputCls}`}
                    placeholder="例如: R10 / BL12"
                  />
                </div>

                <div className={`flex items-center justify-between font-mono text-[11px] tabular-nums pt-1 ${textMuted}`}>
                  <span>畫布坐標</span>
                  <span className={textHeading}>X: {selectedStation.x}, Y: {selectedStation.y}</span>
                </div>
              </div>

              {/* Station Type & Interchange Settings */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className={`font-medium ${textMuted}`}>車站類型</label>
                  {(() => {
                    const stConns = connections.filter(
                      (c) => c.fromStationId === selectedStation.id || c.toStationId === selectedStation.id
                    );
                    const distinctSet = new Set(stConns.map((c) => (c.color || '').toUpperCase()));
                    if (distinctSet.size >= 2) {
                      return (
                        <span className="text-[11px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {distinctSet.size} 線交會
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { type: 'regular', label: '普通站' },
                    { type: 'interchange', label: '換乘站' },
                    { type: 'terminal', label: '端點站' },
                  ].map((item) => {
                    const isCurrent =
                      selectedStation.type === item.type ||
                      (item.type === 'interchange' && selectedStation.type === 'interchange_3line');
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() =>
                          onUpdateStation({
                            ...selectedStation,
                            type: item.type as StationType,
                            interchangeStyle: selectedStation.interchangeStyle || 'dots',
                          })
                        }
                        className={`py-1.5 px-2 rounded-md border text-center transition-colors text-xs cursor-pointer ${
                          isCurrent ? btnActive : btnInactive
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {(selectedStation.type === 'interchange' || selectedStation.type === 'interchange_3line') &&
                  (() => {
                    const stConns = connections.filter(
                      (c) => c.fromStationId === selectedStation.id || c.toStationId === selectedStation.id
                    );
                    const distinctSet = new Set(stConns.map((c) => (c.color || '').toUpperCase()));
                    const connectedCount = distinctSet.size;
                    const activeCount =
                      selectedStation.interchangeLinesCount ??
                      (selectedStation.type === 'interchange_3line' ? 3 : Math.max(2, connectedCount || 2));

                    return (
                      <div className={`pt-3 border-t space-y-3 ${borderCol}`}>
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className={`font-medium ${textMuted}`}>換乘路線數</span>
                            <span className={`font-mono text-[10px] tabular-nums ${textHeading}`}>
                              {selectedStation.interchangeLinesCount
                                ? `自訂 ${activeCount} 線`
                                : `自動 (${activeCount} 線)`}
                            </span>
                          </div>

                          <div className="grid grid-cols-5 gap-1 mb-2">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateStation({
                                  ...selectedStation,
                                  type: 'interchange',
                                  interchangeLinesCount: undefined,
                                })
                              }
                              className={`py-1 rounded text-[10px] border transition-colors cursor-pointer ${
                                selectedStation.interchangeLinesCount === undefined ? btnActive : btnInactive
                              }`}
                            >
                              自動
                            </button>
                            {[2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() =>
                                  onUpdateStation({
                                    ...selectedStation,
                                    type: 'interchange',
                                    interchangeLinesCount: n,
                                  })
                                }
                                className={`py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer tabular-nums ${
                                  selectedStation.interchangeLinesCount === n ? btnActive : btnInactive
                                }`}
                              >
                                {n} 線
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] ${textMuted}`}>自訂線數</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateStation({
                                    ...selectedStation,
                                    type: 'interchange',
                                    interchangeLinesCount: Math.max(2, activeCount - 1),
                                  })
                                }
                                className={`w-6 h-6 rounded flex items-center justify-center font-semibold border cursor-pointer ${btnInactive}`}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={2}
                                max={99}
                                value={activeCount}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val >= 2) {
                                    onUpdateStation({
                                      ...selectedStation,
                                      type: 'interchange',
                                      interchangeLinesCount: val,
                                    });
                                  }
                                }}
                                className={`w-12 h-6 px-1 text-center font-mono font-semibold text-xs rounded border focus:outline-none tabular-nums ${inputCls}`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateStation({
                                    ...selectedStation,
                                    type: 'interchange',
                                    interchangeLinesCount: activeCount + 1,
                                  })
                                }
                                className={`w-6 h-6 rounded flex items-center justify-center font-semibold border cursor-pointer ${btnInactive}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1.5">
                            <span className={`font-medium ${textMuted}`}>換乘圖示風格</span>
                            <span className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                              {activeCount} 線
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              {
                                style: 'dots' as InterchangeStyle,
                                label: '色點陣列',
                                desc: '依線數自適應環狀多角點陣',
                                icon: (
                                  <svg className="w-5 h-5 mx-auto mb-1" viewBox="-12 -12 24 24">
                                    <circle r={10} fill="#ffffff" stroke="#18181b" strokeWidth={2} />
                                    <circle cx={0} cy={-4} r={2} fill="#E11D48" />
                                    <circle cx={-3.5} cy={2.5} r={2} fill="#2563EB" />
                                    <circle cx={3.5} cy={2.5} r={2} fill="#16A34A" />
                                  </svg>
                                ),
                              },
                              {
                                style: 'pie' as InterchangeStyle,
                                label: '扇形輪盤',
                                desc: '360°/N 依線數等分扇面輪盤',
                                icon: (
                                  <svg className="w-5 h-5 mx-auto mb-1" viewBox="-12 -12 24 24">
                                    <circle r={10} fill="#ffffff" stroke="#18181b" strokeWidth={2} />
                                    <path d="M 0 0 L 0 -6.5 A 6.5 6.5 0 0 1 5.629 3.25 Z" fill="#E11D48" />
                                    <path d="M 0 0 L 5.629 3.25 A 6.5 6.5 0 0 1 -5.629 3.25 Z" fill="#2563EB" />
                                    <path d="M 0 0 L -5.629 3.25 A 6.5 6.5 0 0 1 0 -6.5 Z" fill="#16A34A" />
                                    <circle r={1.6} fill="#ffffff" stroke="#18181b" strokeWidth={0.8} />
                                  </svg>
                                ),
                              },
                              {
                                style: 'capsule' as InterchangeStyle,
                                label: '連動膠囊',
                                desc: '依線數橫向延伸多節點膠囊',
                                icon: (
                                  <svg className="w-5 h-5 mx-auto mb-1" viewBox="-16 -8 32 16">
                                    <rect x={-14} y={-7} width={28} height={14} rx={7} fill="#ffffff" stroke="#18181b" strokeWidth={2} />
                                    <line x1={-7} y1={0} x2={7} y2={0} stroke="#18181b" strokeWidth={1.5} />
                                    <circle cx={-7} cy={0} r={2.6} fill="#E11D48" stroke="#ffffff" strokeWidth={0.8} />
                                    <circle cx={0} cy={0} r={2.6} fill="#2563EB" stroke="#ffffff" strokeWidth={0.8} />
                                    <circle cx={7} cy={0} r={2.6} fill="#16A34A" stroke="#ffffff" strokeWidth={0.8} />
                                  </svg>
                                ),
                              },
                            ].map((item) => {
                              const isActive = (selectedStation.interchangeStyle || 'dots') === item.style;
                              return (
                                <button
                                  key={item.style}
                                  type="button"
                                  onClick={() =>
                                    onUpdateStation({
                                      ...selectedStation,
                                      interchangeStyle: item.style,
                                    })
                                  }
                                  className={`p-2 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center ${
                                    isActive
                                      ? isLight
                                        ? 'bg-zinc-100 border-zinc-900 text-zinc-900 font-semibold'
                                        : 'bg-zinc-800 border-zinc-200 text-zinc-100 font-semibold'
                                      : btnInactive
                                  }`}
                                  title={item.desc}
                                >
                                  {item.icon}
                                  <span className="text-[10px] leading-none">{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
              </div>

              {/* Label Position: 8方位 / 自由拖動 */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className={`font-medium ${textMuted}`}>站名方位</label>
                  <span className={`text-[11px] font-mono ${textHeading}`}>
                    {selectedStation.labelPosition === 'custom'
                      ? '自由位置'
                      : LABEL_POSITION_PRESETS[selectedStation.labelPosition as keyof typeof LABEL_POSITION_PRESETS]?.label || '正上'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {(['top_left', 'top', 'top_right'] as const).map((pos) => {
                    const preset = LABEL_POSITION_PRESETS[pos];
                    const isActive = (selectedStation.labelPosition || 'top') === pos;
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          onUpdateStation({
                            ...selectedStation,
                            labelPosition: pos,
                            labelOffset: { x: preset.dx, y: preset.dy },
                          })
                        }
                        className={`flex flex-col items-center justify-center py-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                          isActive ? btnActive : btnInactive
                        }`}
                      >
                        <span className="text-xs leading-none mb-0.5">{preset.short}</span>
                        <span className="text-[10px]">{preset.label}</span>
                      </button>
                    );
                  })}

                  {(() => {
                    const leftPreset = LABEL_POSITION_PRESETS['left'];
                    const isLeftActive = selectedStation.labelPosition === 'left';
                    const rightPreset = LABEL_POSITION_PRESETS['right'];
                    const isRightActive = selectedStation.labelPosition === 'right';
                    const isCustomActive = selectedStation.labelPosition === 'custom';

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStation({
                              ...selectedStation,
                              labelPosition: 'left',
                              labelOffset: { x: leftPreset.dx, y: leftPreset.dy },
                            })
                          }
                          className={`flex flex-col items-center justify-center py-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                            isLeftActive ? btnActive : btnInactive
                          }`}
                        >
                          <span className="text-xs leading-none mb-0.5">{leftPreset.short}</span>
                          <span className="text-[10px]">{leftPreset.label}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStation({
                              ...selectedStation,
                              labelPosition: 'custom',
                              labelOffset: selectedStation.labelOffset || { x: 0, y: -24 },
                            })
                          }
                          className={`flex flex-col items-center justify-center py-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                            isCustomActive ? btnActive : btnInactive
                          }`}
                          title="在畫布上按住站名直接拖曳"
                        >
                          <Move className="w-3.5 h-3.5 mb-0.5" />
                          <span className="text-[10px]">自由</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStation({
                              ...selectedStation,
                              labelPosition: 'right',
                              labelOffset: { x: rightPreset.dx, y: rightPreset.dy },
                            })
                          }
                          className={`flex flex-col items-center justify-center py-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                            isRightActive ? btnActive : btnInactive
                          }`}
                        >
                          <span className="text-xs leading-none mb-0.5">{rightPreset.short}</span>
                          <span className="text-[10px]">{rightPreset.label}</span>
                        </button>
                      </>
                    );
                  })()}

                  {(['bottom_left', 'bottom', 'bottom_right'] as const).map((pos) => {
                    const preset = LABEL_POSITION_PRESETS[pos];
                    const isActive = selectedStation.labelPosition === pos;
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          onUpdateStation({
                            ...selectedStation,
                            labelPosition: pos,
                            labelOffset: { x: preset.dx, y: preset.dy },
                          })
                        }
                        className={`flex flex-col items-center justify-center py-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                          isActive ? btnActive : btnInactive
                        }`}
                      >
                        <span className="text-xs leading-none mb-0.5">{preset.short}</span>
                        <span className="text-[10px]">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedStation.labelPosition === 'custom' ? (
                  <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                    <div>
                      <div className="flex justify-between mb-1 font-mono tabular-nums">
                        <span className={textMuted}>水平 X</span>
                        <span>{selectedStation.labelOffset?.x ?? 0}</span>
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
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 font-mono tabular-nums">
                        <span className={textMuted}>垂直 Y</span>
                        <span>{selectedStation.labelOffset?.y ?? -18}</span>
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
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                    </div>
                  </div>
                ) : (
                  <p className={`text-[11px] ${textMuted}`}>
                    點擊「自由」或直接在畫布按住站名即可拖曳定位。
                  </p>
                )}
              </div>

              {/* Z-Order */}
              {onUpdateStationZIndex && (
                <div className="p-4">
                  <ZOrderControl
                    value={selectedStation.zIndex ?? 0}
                    onChange={(nextZ) => onUpdateStationZIndex(selectedStation.id, nextZ)}
                    targetType="station"
                    theme={theme}
                  />
                </div>
              )}

              {/* Regular Station SVG Free Transform */}
              {(() => {
                const curScale = selectedStation.scale ?? 1;
                const curScaleX = selectedStation.scaleX ?? 1;
                const curScaleY = selectedStation.scaleY ?? 1;
                const curRot = selectedStation.rotation ?? 0;
                const curLabelScale = selectedStation.labelScale ?? 1;
                const curLabelRot = selectedStation.labelRotation ?? 0;
                const curOpacity = selectedStation.opacity ?? 1;
                const isModified =
                  curScale !== 1 ||
                  curScaleX !== 1 ||
                  curScaleY !== 1 ||
                  curRot !== 0 ||
                  curLabelScale !== 1 ||
                  curLabelRot !== 0 ||
                  curOpacity !== 1;
                const scaleMax = Math.max(4, Math.ceil(curScale + 1));
                const lblScaleMax = Math.max(3.5, Math.ceil(curLabelScale + 1));

                return (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${textHeading}`}>SVG 自由變換</span>
                      {isModified && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStation({
                              ...selectedStation,
                              scale: 1,
                              scaleX: 1,
                              scaleY: 1,
                              rotation: 0,
                              labelScale: 1,
                              labelRotation: 0,
                              opacity: 1,
                            })
                          }
                          className={`text-[11px] underline cursor-pointer ${textMuted}`}
                        >
                          重設全部
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>圖標縮放</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={0.1}
                            min={0.1}
                            value={curScale}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) {
                                onUpdateStation({ ...selectedStation, scale: normalizeSvgScale(v, 0.1) });
                              }
                            }}
                            className={`w-16 px-1.5 py-0.5 text-center font-mono font-semibold text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                          />
                          <span className={`font-mono text-[10px] ${textMuted}`}>×</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0.2}
                        max={scaleMax}
                        step={0.05}
                        value={Math.min(scaleMax, curScale)}
                        onChange={(e) =>
                          onUpdateStation({
                            ...selectedStation,
                            scale: normalizeSvgScale(parseFloat(e.target.value), 0.1),
                          })
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                      <div className="grid grid-cols-5 gap-1">
                        {[0.5, 1, 1.5, 2, 3].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => onUpdateStation({ ...selectedStation, scale: preset })}
                            className={`py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer tabular-nums ${
                              curScale === preset ? btnActive : btnInactive
                            }`}
                          >
                            {preset}×
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={textMuted}>水平 X 拉伸</span>
                          <span className="font-mono font-semibold tabular-nums">{curScaleX}×</span>
                        </div>
                        <input
                          type="number"
                          step={0.1}
                          min={0.1}
                          value={curScaleX}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) {
                              onUpdateStation({ ...selectedStation, scaleX: normalizeSvgScale(v, 0.1) });
                            }
                          }}
                          className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={textMuted}>垂直 Y 拉伸</span>
                          <span className="font-mono font-semibold tabular-nums">{curScaleY}×</span>
                        </div>
                        <input
                          type="number"
                          step={0.1}
                          min={0.1}
                          value={curScaleY}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) {
                              onUpdateStation({ ...selectedStation, scaleY: normalizeSvgScale(v, 0.1) });
                            }
                          }}
                          className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>圖標旋轉</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={curRot}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) {
                                onUpdateStation({ ...selectedStation, rotation: normalizeSvgAngle(v) });
                              }
                            }}
                            className={`w-14 px-1 py-0.5 text-center font-mono font-semibold text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                          />
                          <span className={`font-mono ${textMuted}`}>°</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={359}
                        step={1}
                        value={curRot}
                        onChange={(e) =>
                          onUpdateStation({
                            ...selectedStation,
                            rotation: normalizeSvgAngle(parseFloat(e.target.value)),
                          })
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                      <div className="grid grid-cols-5 gap-1">
                        {[0, 45, 90, 180, 270].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => onUpdateStation({ ...selectedStation, rotation: deg })}
                            className={`py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer tabular-nums ${
                              curRot === deg ? btnActive : btnInactive
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`pt-2.5 border-t grid grid-cols-2 gap-3 ${borderCol}`}>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={textMuted}>站名縮放</span>
                          <span className="font-mono font-semibold tabular-nums">{curLabelScale}×</span>
                        </div>
                        <input
                          type="range"
                          min={0.4}
                          max={lblScaleMax}
                          step={0.05}
                          value={Math.min(lblScaleMax, curLabelScale)}
                          onChange={(e) =>
                            onUpdateStation({
                              ...selectedStation,
                              labelScale: normalizeSvgScale(parseFloat(e.target.value), 0.25),
                            })
                          }
                          className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={textMuted}>站名旋轉</span>
                          <span className="font-mono font-semibold tabular-nums">{curLabelRot}°</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={359}
                          step={1}
                          value={curLabelRot}
                          onChange={(e) =>
                            onUpdateStation({
                              ...selectedStation,
                              labelRotation: normalizeSvgAngle(parseFloat(e.target.value)),
                            })
                          }
                          className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className={textMuted}>節點不透明度</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {Math.round(curOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={curOpacity}
                        onChange={(e) =>
                          onUpdateStation({
                            ...selectedStation,
                            opacity: normalizeOpacity(parseFloat(e.target.value)),
                          })
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                    </div>

                    <p className={`text-[11px] leading-relaxed ${textMuted}`}>
                      畫布上拖曳控制框角落可等比縮放（Shift 自由拉伸），拖曳頂端圓點可旋轉。
                    </p>
                  </div>
                );
              })()}

              {/* Connected lines summary */}
              <div className="p-4 space-y-2">
                <label className={`block font-medium ${textMuted}`}>相鄰路線連線</label>
                {connections.filter(
                  (c) =>
                    c.fromStationId === selectedStation.id ||
                    c.toStationId === selectedStation.id
                ).length === 0 ? (
                  <p className={textMuted}>尚無相連路線</p>
                ) : (
                  <div className={`divide-y border rounded-md ${borderCol} ${isLight ? 'divide-zinc-100' : 'divide-zinc-800/70'}`}>
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
                        const connColor = conn.color || '#71717A';
                        const otherName = otherSt?.isVirtual
                          ? `虛擬節點 (${otherSt.x}, ${otherSt.y})`
                          : otherSt?.name || '未知車站';

                        return (
                          <button
                            key={conn.id}
                            type="button"
                            onClick={() => onSelectConnection?.(conn.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 text-left transition-colors cursor-pointer ${
                              isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: connColor }}
                              />
                              <span className="truncate">往 {otherName}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] tabular-nums">
                              {(conn.offset ?? 0) !== 0 && (
                                <span className={textMuted}>
                                  偏移 {(conn.offset ?? 0) > 0 ? `+${conn.offset}` : conn.offset}
                                </span>
                              )}
                              {(conn.zIndex ?? 0) !== 0 && (
                                <span className={textMuted}>
                                  Z{(conn.zIndex ?? 0) > 0 ? `+${conn.zIndex}` : conn.zIndex}
                                </span>
                              )}
                              <span className={textMuted}>{connColor}</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Convert to Virtual Node */}
              <div className="p-4">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateStation({
                      ...selectedStation,
                      isVirtual: true,
                    })
                  }
                  className={`w-full py-2 px-3 rounded-md flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer border ${btnInactive}`}
                  title="轉為虛擬節點（保留連線，隱藏站名標籤）"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>轉為虛擬節點</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Connection Inspector */}
          {selectedConnection && !selectedStation && (
            <div className={`divide-y text-xs ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitFork className={`w-4 h-4 ${textMuted}`} />
                  <h2 className={`font-semibold text-sm ${textHeading}`}>路線區段設定</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDeleteConnection(selectedConnection.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    title="刪除此段連線"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${textMuted}`}
                      title="關閉面板"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Route Summary */}
              <div className="px-4 py-3 flex items-center justify-center gap-2.5">
                <span className={`font-medium truncate ${textHeading}`}>
                  {(() => {
                    const s = stations.find((st) => st.id === selectedConnection.fromStationId);
                    return s?.isVirtual ? `虛擬節點 (${s.x}, ${s.y})` : (s?.name || '起點');
                  })()}
                </span>
                <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${textMuted}`} />
                <span className={`font-medium truncate ${textHeading}`}>
                  {(() => {
                    const s = stations.find((st) => st.id === selectedConnection.toStationId);
                    return s?.isVirtual ? `虛擬節點 (${s.x}, ${s.y})` : (s?.name || '終點');
                  })()}
                </span>
              </div>

              {/* Z-Order */}
              {onUpdateConnectionZIndex && (
                <div className="p-4">
                  <ZOrderControl
                    value={selectedConnection.zIndex ?? 0}
                    onChange={(nextZ) => onUpdateConnectionZIndex(selectedConnection.id, nextZ)}
                    targetType="connection"
                    theme={theme}
                  />
                </div>
              )}

              {/* Parallel Offset & Auto-Bundling (Unlimited) */}
              {onUpdateConnectionOffset && (() => {
                const curOffset = clampLineOffset(selectedConnection.offset ?? 0);
                const pairConns = connections.filter(
                  (c) =>
                    (c.fromStationId === selectedConnection.fromStationId &&
                      c.toStationId === selectedConnection.toStationId) ||
                    (c.fromStationId === selectedConnection.toStationId &&
                      c.toStationId === selectedConnection.fromStationId)
                );
                const presets = [-12, -8, -4, 0, 4, 8, 12];
                const sliderMin = Math.min(-60, Math.floor((curOffset - 40) / 10) * 10);
                const sliderMax = Math.max(60, Math.ceil((curOffset + 40) / 10) * 10);

                return (
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${textHeading}`}>線段偏移與並線</span>
                      <span className={`font-mono text-[11px] tabular-nums ${textMuted}`}>
                        {curOffset === 0 ? '0' : curOffset > 0 ? `+${curOffset}` : curOffset}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step={0.5}
                        value={offsetInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setOffsetInput(raw);
                          const parsed = parseFloat(raw);
                          if (Number.isFinite(parsed)) {
                            onUpdateConnectionOffset(
                              selectedConnection.id,
                              clampLineOffset(parsed)
                            );
                          }
                        }}
                        onBlur={() => setOffsetInput(String(curOffset))}
                        className={`flex-1 px-2 py-1 text-center font-mono font-semibold text-xs rounded-md border focus:outline-none tabular-nums ${inputCls}`}
                        placeholder="任意數值 (無限制)"
                        title="輸入任意正負偏移數值，無上下限限制"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateConnectionOffset(
                            selectedConnection.id,
                            clampLineOffset(-curOffset)
                          )
                        }
                        disabled={curOffset === 0}
                        className={`px-2 py-1 rounded-md text-[11px] border transition-colors cursor-pointer disabled:opacity-35 shrink-0 ${btnInactive}`}
                      >
                        ± 反轉
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateConnectionOffset(selectedConnection.id, 0)}
                        disabled={curOffset === 0}
                        className={`px-2 py-1 rounded-md text-[11px] border transition-colors cursor-pointer disabled:opacity-35 shrink-0 ${btnInactive}`}
                      >
                        歸零
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {[-10, -1, 1, 10].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() =>
                            onUpdateConnectionOffset(
                              selectedConnection.id,
                              clampLineOffset(curOffset + delta)
                            )
                          }
                          className={`py-1 rounded-md text-[11px] font-mono font-medium border transition-colors cursor-pointer tabular-nums ${btnInactive}`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                    </div>

                    <div>
                      <input
                        type="range"
                        min={sliderMin}
                        max={sliderMax}
                        step={0.5}
                        value={curOffset}
                        onChange={(e) =>
                          onUpdateConnectionOffset(
                            selectedConnection.id,
                            clampLineOffset(parseFloat(e.target.value))
                          )
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                      <div className={`flex justify-between text-[10px] font-mono tabular-nums mt-0.5 ${textMuted}`}>
                        <span>{sliderMin}</span>
                        <span>無限延伸</span>
                        <span>+{sliderMax}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {presets.map((val) => {
                        const active = curOffset === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => onUpdateConnectionOffset(selectedConnection.id, val)}
                            className={`py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer tabular-nums ${
                              active ? btnActive : btnInactive
                            }`}
                          >
                            {val > 0 ? `+${val}` : val}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1 space-y-1.5">
                      {pairConns.length >= 2 && (
                        <div className={`flex items-center justify-between text-[11px] ${textMuted}`}>
                          <span>同區間 {pairConns.length} 條並線</span>
                          <span>對稱排列</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        {onDuplicateParallelConnection && (
                          <button
                            type="button"
                            onClick={() => onDuplicateParallelConnection(selectedConnection.id)}
                            className={`flex-1 py-1.5 px-2.5 rounded-md text-[11px] font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${btnInactive}`}
                          >
                            <CopyPlus className="w-3.5 h-3.5" />
                            <span>新增平行並線</span>
                          </button>
                        )}
                        {pairConns.length >= 2 && onAutoBundleConnections && (
                          <button
                            type="button"
                            onClick={() => onAutoBundleConnections(selectedConnection.id, 8)}
                            className={`flex-1 py-1.5 px-2.5 rounded-md text-[11px] font-medium border flex items-center justify-center transition-colors cursor-pointer ${btnActive}`}
                          >
                            <span>一鍵並線均分</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* SVG Stroke Styling */}
              {onUpdateConnectionStyle && (() => {
                const curWidth = normalizeStrokeWidth(selectedConnection.strokeWidth ?? 6);
                const curRadius = normalizeCornerRadius(selectedConnection.cornerRadius ?? 14);
                const curStyle: StrokeStyle = selectedConnection.strokeStyle ?? 'solid';
                const curCap: LineCapStyle = selectedConnection.lineCap ?? 'round';
                const curOpacity = normalizeOpacity(selectedConnection.opacity ?? 1);
                const isModified =
                  curWidth !== 6 ||
                  curRadius !== 14 ||
                  curStyle !== 'solid' ||
                  curCap !== 'round' ||
                  curOpacity !== 1;
                const widthSliderMax = Math.max(36, Math.ceil(curWidth + 12));
                const radiusSliderMax = Math.max(60, Math.ceil(curRadius + 20));

                return (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${textHeading}`}>線條造型與自由變換</span>
                      {isModified && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateConnectionStyle(selectedConnection.id, {
                              strokeWidth: 6,
                              cornerRadius: 14,
                              strokeStyle: 'solid',
                              lineCap: 'round',
                              opacity: 1,
                            })
                          }
                          className={`text-[11px] underline cursor-pointer ${textMuted}`}
                        >
                          重設預設
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>線條粗細</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateConnectionStyle(selectedConnection.id, {
                                strokeWidth: normalizeStrokeWidth(curWidth - 1),
                              })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${btnInactive}`}
                          >
                            -1
                          </button>
                          <input
                            type="number"
                            step={0.5}
                            min={0.5}
                            value={curWidth}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) {
                                onUpdateConnectionStyle(selectedConnection.id, {
                                  strokeWidth: normalizeStrokeWidth(v),
                                });
                              }
                            }}
                            className={`w-14 px-1.5 py-0.5 text-center font-mono font-semibold text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateConnectionStyle(selectedConnection.id, {
                                strokeWidth: normalizeStrokeWidth(curWidth + 1),
                              })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${btnInactive}`}
                          >
                            +1
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={widthSliderMax}
                        step={0.5}
                        value={curWidth}
                        onChange={(e) =>
                          onUpdateConnectionStyle(selectedConnection.id, {
                            strokeWidth: normalizeStrokeWidth(parseFloat(e.target.value)),
                          })
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                      <div className="grid grid-cols-6 gap-1">
                        {[2, 4, 6, 10, 16, 24].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() =>
                              onUpdateConnectionStyle(selectedConnection.id, { strokeWidth: w })
                            }
                            className={`py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer tabular-nums ${
                              curWidth === w ? btnActive : btnInactive
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>轉折圓角半徑</span>
                        <input
                          type="number"
                          step={1}
                          min={0}
                          value={curRadius}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) {
                              onUpdateConnectionStyle(selectedConnection.id, {
                                cornerRadius: normalizeCornerRadius(v),
                              });
                            }
                          }}
                          className={`w-16 px-1.5 py-0.5 text-center font-mono font-semibold text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={radiusSliderMax}
                        step={1}
                        value={curRadius}
                        onChange={(e) =>
                          onUpdateConnectionStyle(selectedConnection.id, {
                            cornerRadius: normalizeCornerRadius(parseFloat(e.target.value)),
                          })
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                    </div>

                    <div>
                      <span className={`text-[11px] block mb-1.5 ${textMuted}`}>線條樣式</span>
                      <div className="grid grid-cols-4 gap-1">
                        {(
                          [
                            { id: 'solid', label: '實線' },
                            { id: 'dashed', label: '虛線' },
                            { id: 'dotted', label: '點線' },
                            { id: 'double', label: '雙軌' },
                          ] as Array<{ id: StrokeStyle; label: string }>
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              onUpdateConnectionStyle(selectedConnection.id, { strokeStyle: opt.id })
                            }
                            className={`py-1 rounded-md text-[11px] border transition-colors cursor-pointer ${
                              curStyle === opt.id ? btnActive : btnInactive
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className={`text-[10px] block mb-1 ${textMuted}`}>端點形狀</span>
                        <div className="grid grid-cols-3 gap-1">
                          {(
                            [
                              { id: 'round', label: '圓' },
                              { id: 'butt', label: '平' },
                              { id: 'square', label: '方' },
                            ] as Array<{ id: LineCapStyle; label: string }>
                          ).map((cap) => (
                            <button
                              key={cap.id}
                              type="button"
                              onClick={() =>
                                onUpdateConnectionStyle(selectedConnection.id, { lineCap: cap.id })
                              }
                              className={`py-1 rounded text-[10px] border transition-colors cursor-pointer ${
                                curCap === cap.id ? btnActive : btnInactive
                              }`}
                            >
                              {cap.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={textMuted}>不透明度</span>
                          <span className="font-mono font-semibold tabular-nums">
                            {Math.round(curOpacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={curOpacity}
                          onChange={(e) =>
                            onUpdateConnectionStyle(selectedConnection.id, {
                              opacity: normalizeOpacity(parseFloat(e.target.value)),
                            })
                          }
                          className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer mt-1.5"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Line Color Picker */}
              <div className="p-4 space-y-2.5">
                <label className={`block font-medium ${textMuted}`}>16 進制色彩</label>

                <div className={`flex items-center gap-2 p-1.5 rounded-md border ${surfaceSubtle}`}>
                  <input
                    type="color"
                    value={selectedConnection.color || '#E11D48'}
                    onChange={(e) => {
                      const newCol = e.target.value.toUpperCase();
                      setConnHexInput(newCol);
                      onUpdateConnectionColor(selectedConnection.id, newCol);
                    }}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                    title="選擇色彩"
                  />
                  <div className="flex items-center gap-1 flex-1">
                    <Hash className={`w-3.5 h-3.5 ${textMuted}`} />
                    <input
                      type="text"
                      value={connHexInput}
                      onChange={handleConnHexChange}
                      maxLength={7}
                      className={`bg-transparent font-mono uppercase font-semibold focus:outline-none w-full text-xs ${textHeading}`}
                      placeholder="#E11D48"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className={`text-[11px] block ${textMuted}`}>歷史色彩</span>
                  {recentColors.length === 0 ? (
                    <p className={`text-[11px] ${textMuted}`}>尚無使用記錄</p>
                  ) : (
                    <div className="grid grid-cols-5 gap-1.5">
                      {recentColors.slice(0, 20).map((color, idx) => (
                        <button
                          key={`${color}-${idx}`}
                          type="button"
                          onClick={() => {
                            setConnHexInput(color);
                            onUpdateConnectionColor(selectedConnection.id, color);
                          }}
                          className="w-full h-5 rounded hover:scale-105 transition-transform border border-black/20 cursor-pointer"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Route Type Selection */}
              <div className="p-4 space-y-2">
                <label className={`block font-medium ${textMuted}`}>線段走向樣式</label>
                <div className="space-y-1">
                  {ROUTE_TYPE_OPTIONS.map((opt) => {
                    const isCurrent = (selectedConnection.routeType || '135_bend') === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => onUpdateConnectionRouteType(selectedConnection.id, opt.type)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border transition-colors text-left cursor-pointer ${
                          isCurrent ? btnActive : btnInactive
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs w-4 text-center">{opt.icon}</span>
                          <span>{opt.label}</span>
                        </div>
                        <span className={`text-[10px] font-mono ${isCurrent ? 'opacity-80' : textMuted}`}>
                          {opt.type === '135_bend' && '45°/135°'}
                          {opt.type === '90_ortho' && '直角'}
                          {opt.type === '90_rotated' && '斜向 90°'}
                          {opt.type === 'straight' && '直連'}
                          {opt.type === 'any_angle' && '雙轉盤'}
                          {opt.type === 'free_curve' && '軌跡節點'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dual 360 Dials for any_angle */}
              {selectedConnection.routeType === 'any_angle' && onUpdateConnectionAngles && (
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${textHeading}`}>任意角度雙轉盤</span>
                    <span className={`text-[10px] font-mono ${textMuted}`}>Shift 每 15° 吸附</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CircularAngleDial
                      label="轉盤 A"
                      subLabel={(() => {
                        const s = stations.find((st) => st.id === selectedConnection.fromStationId);
                        return s?.isVirtual ? `節點 (${s.x}, ${s.y})` : (s?.name || '站點 A');
                      })()}
                      angle={selectedConnection.angleA !== undefined ? selectedConnection.angleA : 0}
                      onChange={(deg) =>
                        onUpdateConnectionAngles(
                          selectedConnection.id,
                          deg,
                          selectedConnection.angleB !== undefined ? selectedConnection.angleB : 90
                        )
                      }
                      accentColor={selectedConnection.color || '#18181B'}
                      theme={theme}
                    />
                    <CircularAngleDial
                      label="轉盤 B"
                      subLabel={(() => {
                        const s = stations.find((st) => st.id === selectedConnection.toStationId);
                        return s?.isVirtual ? `節點 (${s.x}, ${s.y})` : (s?.name || '站點 B');
                      })()}
                      angle={selectedConnection.angleB !== undefined ? selectedConnection.angleB : 90}
                      onChange={(deg) =>
                        onUpdateConnectionAngles(
                          selectedConnection.id,
                          selectedConnection.angleA !== undefined ? selectedConnection.angleA : 0,
                          deg
                        )
                      }
                      accentColor={selectedConnection.color || '#18181B'}
                      theme={theme}
                    />
                  </div>
                </div>
              )}

              {/* Flip Direction */}
              {['135_bend', '90_ortho', '90_rotated', 'any_angle'].includes(
                selectedConnection.routeType || '135_bend'
              ) &&
                onToggleConnectionFlip && (
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${textMuted}`}>走線內外翻轉</span>
                      <span className={`text-[11px] font-mono ${textHeading}`}>
                        {selectedConnection.isFlipped ? '反向 / 內側' : '正向 / 外側'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleConnectionFlip(selectedConnection.id)}
                      className={`w-full py-2 px-3 rounded-md flex items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer border ${
                        selectedConnection.isFlipped ? btnActive : btnInactive
                      }`}
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>翻轉折向 (正向 / 反向)</span>
                    </button>
                  </div>
                )}

              {/* Freehand waypoints note */}
              {selectedConnection.routeType === 'free_curve' && (
                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span className={textHeading}>自繪軌跡節點</span>
                    <span className={`font-mono tabular-nums ${textMuted}`}>
                      {(selectedConnection.waypoints || []).length} 點
                    </span>
                  </div>
                  <p className={`text-[11px] leading-normal ${textMuted}`}>
                    選取此路線後，可直接拖曳畫布上的轉折控制點調整軌跡。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Default State: Overview & Quick Station Directory */}
          {!selectedStation && !selectedConnection && (
            <div className={`divide-y text-xs leading-relaxed ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
              {stations.length > 0 && (
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${textHeading}`}>
                      車站清單 ({stations.length})
                    </span>
                    <span className={`text-[10px] ${textMuted}`}>點擊選取</span>
                  </div>
                  <div
                    className={`max-h-52 overflow-y-auto divide-y border rounded-lg ${borderCol} ${
                      isLight ? 'divide-zinc-100' : 'divide-zinc-800/70'
                    }`}
                  >
                    {stations.map((st) => {
                      const { colors } = getStationLinesAndColors(st);
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => onSelectStation?.(st.id)}
                          className={`w-full px-2.5 py-2 flex items-center justify-between text-left transition-colors cursor-pointer ${
                            isLight ? 'hover:bg-zinc-50 text-zinc-800' : 'hover:bg-zinc-900/60 text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {st.isVirtual ? (
                              <XCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            ) : st.type === 'interchange' || st.type === 'interchange_3line' ? (
                              <GitFork className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            )}
                            <span className="text-xs font-medium truncate">
                              {st.isVirtual ? `虛擬節點 (${st.x}, ${st.y})` : st.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {(st.zIndex ?? 0) !== 0 && (
                              <span className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                                Z{(st.zIndex ?? 0) > 0 ? `+${st.zIndex}` : st.zIndex}
                              </span>
                            )}
                            {colors.length > 0 && (
                              <div className="flex -space-x-1 items-center">
                                {colors.slice(0, 3).map((c, i) => (
                                  <span
                                    key={i}
                                    className="w-2 h-2 rounded-full border border-white dark:border-zinc-900"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Guide */}
              <div className="p-4 space-y-3">
                <h2 className={`text-xs font-semibold ${textHeading}`}>繪製指南</h2>
                <div className={`space-y-2.5 ${textMuted}`}>
                  <div className="flex gap-2.5">
                    <span className="font-mono text-[11px] font-semibold w-4 shrink-0">01</span>
                    <div>
                      <span className={`font-medium ${textHeading}`}>新增節點</span> — 在左側工具列選擇「車站」或「轉折」，點擊畫布放置站點並支援格點吸附。
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="font-mono text-[11px] font-semibold w-4 shrink-0">02</span>
                    <div>
                      <span className={`font-medium ${textHeading}`}>選色與連線</span> — 於左側「色彩」切換色碼，使用「連線」模式依序連接站點即可自動成形。
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="font-mono text-[11px] font-semibold w-4 shrink-0">03</span>
                    <div>
                      <span className={`font-medium ${textHeading}`}>自由變換與並線</span> — 點選站點或線段即可微調層級、平行偏移、縮放旋轉與走向。
                    </div>
                  </div>
                </div>
              </div>

              {/* Shortcuts & Stats Callouts */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${textHeading}`}>快捷鍵</span>
                  {onOpenShortcuts && (
                    <button
                      type="button"
                      onClick={onOpenShortcuts}
                      className={`text-[11px] hover:underline cursor-pointer ${textMuted}`}
                    >
                      完整清單
                    </button>
                  )}
                </div>
                <div className={`space-y-1 font-mono text-[11px] ${textMuted}`}>
                  <div className="flex justify-between"><span>選取 / 框選 / 平移</span><span>V / S / H</span></div>
                  <div className="flex justify-between"><span>車站 / 轉折 / 連線</span><span>N / M / C</span></div>
                  <div className="flex justify-between"><span>層級上下移動</span><span>[ / ]</span></div>
                  <div className="flex justify-between"><span>刪除 / 取消操作</span><span>Del / Esc</span></div>
                </div>

                <div className="pt-1 space-y-1.5">
                  {onOpenShortcuts && (
                    <button
                      type="button"
                      onClick={onOpenShortcuts}
                      className={`w-full py-1.5 px-2.5 rounded-md text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${btnInactive}`}
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>開啟完整快捷鍵說明 (?)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleTabChange('stats')}
                    className={`w-full py-1.5 px-2.5 rounded-md text-xs font-medium border flex items-center justify-between transition-colors cursor-pointer ${btnInactive}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>檢視路網統計</span>
                    </div>
                    <span className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                      {connections.length} 線 · {stations.length} 站
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  );
};
