import React, { useState, useEffect } from 'react';
import { 
  Station, 
  MetroLine, 
  Connection, 
  StationType,
  InterchangeStyle,
  RouteType,
  EffectiveTheme,
  LabelPosition,
  LABEL_POSITION_PRESETS
} from '../types/metro';
import { ROUTE_TYPE_OPTIONS } from './Toolbar';
import { NetworkStatsPanel } from './NetworkStatsPanel';
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
  X,
  Keyboard,
  BarChart3,
  Search,
  Navigation,
  ArrowUpDown,
  CornerDownRight,
  CheckCircle2,
  Sparkles,
  Route,
  Eye,
  EyeOff,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ShortestPathResult, findShortestPath } from '../utils/pathfinding';

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
  onSelectStation?: (id: string | null) => void;
  onUpdateStation: (updated: Station) => void;
  onDeleteStation: (id: string) => void;
  onUpdateConnectionColor: (connId: string, newColor: string) => void;
  onUpdateConnectionRouteType: (connId: string, routeType: RouteType) => void;
  onToggleConnectionFlip?: (connId: string) => void;
  onUpdateConnectionAngles?: (connId: string, angleA: number, angleB: number) => void;
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
  activeTab?: 'inspector' | 'stats';
  onTabChange?: (tab: 'inspector' | 'stats') => void;
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
  onUpdateStation,
  onDeleteStation,
  onUpdateConnectionColor,
  onUpdateConnectionRouteType,
  onToggleConnectionFlip,
  onUpdateConnectionAngles,
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
  const cardBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800';
  const inputBg = isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-100';
  const borderCol = isLight ? 'border-slate-200' : 'border-slate-800';
  const textMuted = isLight ? 'text-slate-600' : 'text-slate-400';
  const textHeading = isLight ? 'text-slate-900' : 'text-white';
  const btnInactive = isLight
    ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200';
  const [connHexInput, setConnHexInput] = useState('');

  // Station search state for Inspector tab
  const [stationSearchQuery, setStationSearchQuery] = useState('');

  // Station lines and connection colors helper
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

  // Filtered stations by name, code, or virtual coordinates
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

  // Tab State: 'inspector' (屬性檢視) vs 'stats' (路網統計)
  const [internalTab, setInternalTab] = useState<'inspector' | 'stats'>('inspector');
  const currentTab = activeTab ?? internalTab;

  // Shortest Path state between two stations
  const [pathStartId, setPathStartId] = useState<string>('');
  const [pathEndId, setPathEndId] = useState<string>('');
  const [isPathPanelOpen, setIsPathPanelOpen] = useState<boolean>(true);

  // If user selects exactly 2 stations via multi-select / box select, automatically set them as start and end
  useEffect(() => {
    if (selectedStationIds && selectedStationIds.length === 2) {
      setPathStartId(selectedStationIds[0]);
      setPathEndId(selectedStationIds[1]);
      setIsPathPanelOpen(true);
    }
  }, [selectedStationIds]);

  // Recalculate shortest path whenever pathStartId, pathEndId, stations, or connections update
  useEffect(() => {
    if (pathStartId && pathEndId && pathStartId !== pathEndId) {
      const result = findShortestPath(stations, connections, pathStartId, pathEndId);
      if (onUpdateShortestPath) {
        onUpdateShortestPath(result);
      }
    } else {
      if (onUpdateShortestPath) {
        onUpdateShortestPath(null);
      }
    }
  }, [pathStartId, pathEndId, stations, connections]);

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

  const handleTabChange = (tab: 'inspector' | 'stats') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // When user selects a station or connection, automatically switch to inspector tab
  useEffect(() => {
    if (selectedStation || selectedConnection) {
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

  const isMobileOpen = Boolean(selectedStation || selectedConnection || currentTab === 'stats');

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

      {/* Top Tab Switcher: 屬性檢視 vs 路網統計 (階段二) */}
      <div className={`p-1.5 border-b shrink-0 flex items-center gap-1 ${isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950/90 border-slate-800'}`}>
        <button
          type="button"
          onClick={() => handleTabChange('inspector')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            currentTab === 'inspector'
              ? isLight
                ? 'bg-white text-indigo-600 font-bold shadow-xs border border-slate-200/80'
                : 'bg-slate-800 text-indigo-300 font-bold shadow-xs border border-slate-700/80'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>屬性檢視</span>
          {(selectedStation || selectedConnection) && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('stats')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            currentTab === 'stats'
              ? isLight
                ? 'bg-white text-indigo-600 font-bold shadow-xs border border-slate-200/80'
                : 'bg-slate-800 text-indigo-300 font-bold shadow-xs border border-slate-700/80'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
          <span>路網統計</span>
          <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold ${
            isLight ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
          }`}>
            二階
          </span>
        </button>

        {isMobileOpen && onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg lg:hidden transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="關閉面板"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab 1: 路網統計面板 (階段二) */}
      {currentTab === 'stats' && (
        <NetworkStatsPanel
          stations={stations}
          connections={connections}
          lines={lines}
          theme={theme}
        />
      )}

      {/* Tab 2: 屬性檢視面板 (Inspector) */}
      {currentTab === 'inspector' && (
        <>
          {/* Station Quick Search Bar */}
          <div
            className={`sticky top-0 z-20 px-3.5 py-2.5 border-b shadow-2xs backdrop-blur-md transition-colors ${
              isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/95 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="station-inspector-search" className="flex items-center gap-1.5 cursor-pointer">
                <Search className="w-3.5 h-3.5 text-indigo-500" />
                <span className={`text-xs font-bold tracking-tight ${textHeading}`}>
                  車站搜尋
                </span>
              </label>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {stationSearchQuery.trim()
                  ? `${filteredStations.length}/${stations.length} 站`
                  : `共 ${stations.length} 站`}
              </span>
            </div>

            {/* Input with Search & Clear Icons */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
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
                placeholder="輸入站名搜尋並選取 (例：台北車站)..."
                className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border outline-none transition-all ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500 focus:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
              {stationSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStationSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="清除搜尋 (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Live Search Result Dropdown List when query is present */}
            {stationSearchQuery.trim().length > 0 && (
              <div
                className={`mt-2 rounded-lg border max-h-56 overflow-y-auto divide-y shadow-lg ${
                  isLight
                    ? 'bg-white border-slate-200 divide-slate-100'
                    : 'bg-slate-950 border-slate-800 divide-slate-850'
                }`}
              >
                {filteredStations.length === 0 ? (
                  <div className="p-3 text-center text-xs">
                    <p className={textMuted}>
                      查無相符車站「<span className="font-semibold text-rose-500">{stationSearchQuery}</span>」
                    </p>
                    <button
                      type="button"
                      onClick={() => setStationSearchQuery('')}
                      className="mt-1 text-[11px] text-indigo-500 hover:underline cursor-pointer"
                    >
                      清除搜尋字詞
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
                        onClick={() => {
                          onSelectStation?.(st.id);
                        }}
                        className={`w-full p-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? isLight
                              ? 'bg-indigo-50/90 text-indigo-900 font-semibold'
                              : 'bg-indigo-950/60 text-indigo-200 font-semibold'
                            : isLight
                            ? 'hover:bg-slate-50 text-slate-700'
                            : 'hover:bg-slate-850 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {st.isVirtual ? (
                            <XCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (st.type === 'interchange' || st.type === 'interchange_3line') ? (
                            <GitFork className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs truncate flex items-center gap-1.5">
                              <span className="truncate">{st.isVirtual ? `虛擬節點 (${st.x}, ${st.y})` : st.name}</span>
                              {(st.type === 'interchange' || st.type === 'interchange_3line') && !st.isVirtual && (
                                <span
                                  className={`text-[9px] px-1 py-0.2 rounded font-normal shrink-0 ${
                                    isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-950 text-indigo-300'
                                  }`}
                                >
                                  {st.type === 'interchange_3line' ? '三線轉乘' : '轉乘站'}
                                </span>
                              )}
                            </div>
                            <div className={`text-[10px] flex items-center gap-1.5 font-mono ${textMuted}`}>
                              <span>({st.x}, {st.y})</span>
                              {connCount > 0 && <span>· {connCount} 條路線</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {colors.length > 0 && (
                            <div className="flex -space-x-1 items-center">
                              {colors.slice(0, 4).map((c, idx) => (
                                <span
                                  key={idx}
                                  className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 shrink-0"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          )}
                          {isSelected ? (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 rounded border border-indigo-200 dark:border-indigo-800 shrink-0">
                              已選取
                            </span>
                          ) : (
                            <span className="text-[10px] text-indigo-500 font-medium shrink-0">
                              選取 ↗
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Two-Station Shortest Path Calculator & Visual Preview Panel */}
          <div
            className={`border-b transition-colors ${
              isLight ? 'bg-sky-50/40 border-slate-200' : 'bg-slate-950/40 border-slate-800'
            }`}
          >
            {/* Header Accordion Bar */}
            <div
              onClick={() => setIsPathPanelOpen((prev) => !prev)}
              className={`p-3 flex items-center justify-between cursor-pointer select-none transition-colors ${
                isLight ? 'hover:bg-sky-100/40' : 'hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${
                  isLight
                    ? 'bg-sky-100 text-sky-700 border-sky-200'
                    : 'bg-sky-950/60 text-sky-400 border-sky-800/60'
                }`}>
                  <Navigation className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${textHeading}`}>
                      最短路徑建議
                    </span>
                    {shortestPathResult && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        shortestPathResult.isDirectSuggested
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {shortestPathResult.isDirectSuggested ? '建議新連線' : '現有路網最佳'}
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] ${textMuted}`}>
                    {shortestPathResult
                      ? `${shortestPathResult.stopsCount} 站 · 距離 ${shortestPathResult.totalDistance}px · 畫布虛線標示中`
                      : '選取起訖兩站，自動運算最短路徑並以虛線預覽'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                {isPathPanelOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </div>

            {/* Panel Body (Collapsible) */}
            {isPathPanelOpen && (
              <div className="px-3 pb-3 space-y-2.5 text-xs">
                {/* Station Selection Rows */}
                <div className="space-y-1.5">
                  {/* Origin Station (起點站) */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className={`text-[11px] font-semibold w-12 shrink-0 ${textHeading}`}>起點站:</span>
                    <select
                      value={pathStartId}
                      onChange={(e) => setPathStartId(e.target.value)}
                      className={`flex-1 py-1 px-2 text-xs rounded-lg border outline-none font-sans ${inputBg}`}
                    >
                      <option value="">-- 請選擇起點站 --</option>
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
                        className={`px-1.5 py-1 text-[10px] rounded border shrink-0 transition-colors cursor-pointer ${
                          isLight
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800'
                        }`}
                        title="將目前選取的車站設為起點"
                      >
                        設為起點
                      </button>
                    )}
                  </div>

                  {/* Swap Button (起終點對調) */}
                  <div className="flex justify-center -my-1">
                    <button
                      type="button"
                      onClick={handleSwapPathStations}
                      disabled={!pathStartId && !pathEndId}
                      className={`p-1 rounded-full border text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer disabled:opacity-30 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}
                      title="交換起點與終點站"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Destination Station (終點站) */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className={`text-[11px] font-semibold w-12 shrink-0 ${textHeading}`}>終點站:</span>
                    <select
                      value={pathEndId}
                      onChange={(e) => setPathEndId(e.target.value)}
                      className={`flex-1 py-1 px-2 text-xs rounded-lg border outline-none font-sans ${inputBg}`}
                    >
                      <option value="">-- 請選擇終點站 --</option>
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
                        className={`px-1.5 py-1 text-[10px] rounded border shrink-0 transition-colors cursor-pointer ${
                          isLight
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border-rose-800'
                        }`}
                        title="將目前選取的車站設為終點"
                      >
                        設為終點
                      </button>
                    )}
                  </div>
                </div>

                {/* Helper notice if stations are fewer than 2 */}
                {stations.length < 2 && (
                  <p className={`text-[11px] italic ${textMuted}`}>
                    畫布上至少需有 2 座車站方能進行路徑計算與建議。
                  </p>
                )}

                {/* Path Results Container */}
                {shortestPathResult && pathStartId && pathEndId && (
                  <div className={`p-2.5 rounded-xl border space-y-2 ${cardBg}`}>
                    {/* Path Status Banner */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Route className={`w-3.5 h-3.5 ${
                          shortestPathResult.isDirectSuggested ? 'text-amber-500' : 'text-emerald-500'
                        }`} />
                        <span className="font-bold text-xs">
                          {shortestPathResult.isDirectSuggested
                            ? '建議最佳連結順序 (未有現成連線)'
                            : '現有路網最短路徑'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full border ${
                        shortestPathResult.isDirectSuggested
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}>
                        {shortestPathResult.isDirectSuggested ? '拓撲建議' : 'Dijkstra 最優解'}
                      </span>
                    </div>

                    {/* 3 Metric Badges */}
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className={`p-1.5 rounded-lg border ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}>
                        <div className={`text-[10px] ${textMuted}`}>停靠總數</div>
                        <div className="text-xs font-bold text-sky-500">{shortestPathResult.stopsCount} 站</div>
                      </div>
                      <div className={`p-1.5 rounded-lg border ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}>
                        <div className={`text-[10px] ${textMuted}`}>轉乘次數</div>
                        <div className="text-xs font-bold text-indigo-500">
                          {shortestPathResult.transfersCount === 0 ? '直達 (0次)' : `${shortestPathResult.transfersCount} 次轉乘`}
                        </div>
                      </div>
                      <div className={`p-1.5 rounded-lg border ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}>
                        <div className={`text-[10px] ${textMuted}`}>估計距離</div>
                        <div className="text-xs font-bold text-emerald-500">
                          {shortestPathResult.totalDistance} px
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Connection Sequence Itinerary */}
                    <div className="space-y-1 pt-1">
                      <div className={`text-[10px] font-semibold flex items-center justify-between ${textMuted}`}>
                        <span>連結行經順序:</span>
                        <span className="text-[9px] font-mono">點擊站名可選取檢視</span>
                      </div>
                      <div className={`max-h-36 overflow-y-auto space-y-1 p-1 rounded-lg border ${
                        isLight ? 'bg-white/80 border-slate-200/80' : 'bg-slate-900/80 border-slate-800'
                      }`}>
                        {shortestPathResult.steps.map((step, idx) => {
                          const isStart = idx === 0;
                          const isEnd = idx === shortestPathResult.steps.length - 1;
                          const conn = step.connection;

                          return (
                            <div
                              key={`step-${step.station.id}-${idx}`}
                              onClick={() => onSelectStation?.(step.station.id)}
                              className={`flex items-center justify-between p-1.5 rounded text-left transition-colors cursor-pointer group ${
                                isLight ? 'hover:bg-sky-50/70' : 'hover:bg-slate-850'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {/* Sequence step indicator */}
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                  isStart
                                    ? 'bg-emerald-500 text-white'
                                    : isEnd
                                    ? 'bg-rose-500 text-white'
                                    : isLight
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {isStart ? 'S' : isEnd ? 'E' : idx + 1}
                                </span>

                                <span className="truncate font-medium text-xs">
                                  {step.station.isVirtual
                                    ? `虛擬節點 (${step.station.x}, ${step.station.y})`
                                    : step.station.name}
                                </span>

                                {isStart && (
                                  <span className="text-[9px] px-1 py-0.2 rounded font-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    起點
                                  </span>
                                )}
                                {isEnd && (
                                  <span className="text-[9px] px-1 py-0.2 rounded font-normal bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                    終點
                                  </span>
                                )}
                                {step.isTransfer && (
                                  <span className="text-[9px] px-1 py-0.2 rounded font-normal bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    轉乘站
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {conn?.color && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900"
                                    style={{ backgroundColor: conn.color }}
                                    title={`路線色: ${conn.color}`}
                                  />
                                )}
                                {step.distanceFromPrev !== undefined && step.distanceFromPrev > 0 && (
                                  <span className={`text-[10px] font-mono ${textMuted}`}>
                                    +{step.distanceFromPrev}px
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {/* Toggle Canvas Preview */}
                      {onTogglePathPreview && (
                        <button
                          type="button"
                          onClick={() => onTogglePathPreview(!showPathPreview)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            showPathPreview
                              ? isLight
                                ? 'bg-sky-50 text-sky-700 border-sky-300'
                                : 'bg-sky-950/70 text-sky-300 border-sky-800'
                              : isLight
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {showPathPreview ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-sky-500" />
                              <span>畫布虛線預覽 (開啟)</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                              <span>畫布虛線預覽 (關閉)</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* If direct suggested, offer 1-click connect */}
                      {shortestPathResult.isDirectSuggested && onAddConnection && (
                        <button
                          type="button"
                          onClick={handleApplySuggestedConnections}
                          className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                          title="依照建議順序為未連線的站點建立連線"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>一鍵連線</span>
                        </button>
                      )}

                      {/* Clear Button */}
                      <button
                        type="button"
                        onClick={handleClearPath}
                        className={`p-1.5 rounded-lg border text-slate-400 hover:text-rose-500 transition-colors cursor-pointer ${
                          isLight ? 'bg-white border-slate-200 hover:bg-slate-100' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                        }`}
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
                {(() => {
                  const stConns = connections.filter(
                    (c) => c.fromStationId === selectedStation.id || c.toStationId === selectedStation.id
                  );
                  const distinctSet = new Set(stConns.map((c) => (c.color || '').toUpperCase()));
                  if (distinctSet.size >= 2) {
                    return (
                      <span className="text-[10px] text-emerald-500 font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                        {distinctSet.size} 線交會 (無限制換乘)
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Station Type Buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { type: 'regular', label: '普通站' },
                  { type: 'interchange', label: '多線換乘站' },
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
                      className={`py-1.5 px-2 rounded-lg border text-center transition-all text-xs font-medium cursor-pointer ${
                        isCurrent
                          ? isLight
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-semibold'
                            : 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold'
                          : btnInactive
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Interchange Visual Style & Unlimited Lines Controls (When interchange is selected) */}
              {(selectedStation.type === 'interchange' || selectedStation.type === 'interchange_3line') && (() => {
                const stConns = connections.filter(
                  (c) => c.fromStationId === selectedStation.id || c.toStationId === selectedStation.id
                );
                const distinctSet = new Set(stConns.map((c) => (c.color || '').toUpperCase()));
                const connectedCount = distinctSet.size;
                const activeCount = selectedStation.interchangeLinesCount ?? (selectedStation.type === 'interchange_3line' ? 3 : Math.max(2, connectedCount || 2));

                return (
                  <div className={`mt-2.5 p-2.5 rounded-xl border space-y-3 ${
                    isLight ? 'bg-indigo-50/50 border-indigo-200/80' : 'bg-indigo-950/20 border-indigo-800/40'
                  }`}>
                    {/* Line count adjustment (無數個不限制) */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          換乘路線數（無數個不限制）
                        </span>
                        <span className="font-mono text-[10px] text-emerald-500 font-bold">
                          {selectedStation.interchangeLinesCount ? `自訂 ${activeCount} 線` : `自動 (${activeCount} 線)`}
                        </span>
                      </div>

                      {/* Quick preset line count buttons */}
                      <div className="grid grid-cols-5 gap-1 mb-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStation({
                              ...selectedStation,
                              type: 'interchange',
                              interchangeLinesCount: undefined, // Reset to automatic detection
                            })
                          }
                          className={`py-1 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                            selectedStation.interchangeLinesCount === undefined
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                              : isLight
                              ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                          title="自動偵測相連的路線數量"
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
                            className={`py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                              selectedStation.interchangeLinesCount === n
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                : isLight
                                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                            }`}
                          >
                            {n} 線
                          </button>
                        ))}
                      </div>

                      {/* Infinite Stepper Controller: [-] [Count Input] [+] */}
                      <div className="flex items-center justify-between gap-1 p-1 rounded-lg border bg-slate-900/10">
                        <span className={`text-[10px] pl-1 font-medium ${textMuted}`}>自訂任意線數:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(2, activeCount - 1);
                              onUpdateStation({
                                ...selectedStation,
                                type: 'interchange',
                                interchangeLinesCount: next,
                              });
                            }}
                            className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs border cursor-pointer ${
                              isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                            }`}
                            title="減少 1 條"
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
                            className={`w-12 h-6 px-1 text-center font-mono font-bold text-xs rounded border focus:outline-none focus:border-indigo-500 ${
                              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = activeCount + 1;
                              onUpdateStation({
                                ...selectedStation,
                                type: 'interchange',
                                interchangeLinesCount: next,
                              });
                            }}
                            className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs border cursor-pointer ${
                              isLight ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                            }`}
                            title="增加 1 條 (無限制)"
                          >
                            +
                          </button>
                          <span className={`text-[10px] pr-1 font-mono ${textMuted}`}>線</span>
                        </div>
                      </div>
                    </div>

                    {/* Interchange Visual Style Selector */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          換乘圖示風格 ({activeCount} 線)
                        </span>
                        <span className={`text-[10px] ${textMuted}`}>
                          {selectedStation.interchangeStyle === 'pie'
                            ? `${activeCount} 等分輪盤`
                            : selectedStation.interchangeStyle === 'capsule'
                            ? `${activeCount} 節點膠囊`
                            : `${activeCount} 色點陣列`}
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
                                <circle r={10} fill="#ffffff" stroke="#0f172a" strokeWidth={2} />
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
                                <circle r={10} fill="#ffffff" stroke="#0f172a" strokeWidth={2} />
                                <path d="M 0 0 L 0 -6.5 A 6.5 6.5 0 0 1 5.629 3.25 Z" fill="#E11D48" />
                                <path d="M 0 0 L 5.629 3.25 A 6.5 6.5 0 0 1 -5.629 3.25 Z" fill="#2563EB" />
                                <path d="M 0 0 L -5.629 3.25 A 6.5 6.5 0 0 1 0 -6.5 Z" fill="#16A34A" />
                                <circle r={1.6} fill="#ffffff" stroke="#0f172a" strokeWidth={0.8} />
                              </svg>
                            ),
                          },
                          {
                            style: 'capsule' as InterchangeStyle,
                            label: '連動膠囊',
                            desc: '依線數橫向延伸多節點膠囊',
                            icon: (
                              <svg className="w-5 h-5 mx-auto mb-1" viewBox="-16 -8 32 16">
                                <rect x={-14} y={-7} width={28} height={14} rx={7} fill="#ffffff" stroke="#0f172a" strokeWidth={2} />
                                <line x1={-7} y1={0} x2={7} y2={0} stroke="#0f172a" strokeWidth={1.5} />
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
                              className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                                isActive
                                  ? isLight
                                    ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500/20'
                                    : 'bg-slate-900 border-indigo-400 shadow-xs ring-1 ring-indigo-400/30'
                                  : isLight
                                  ? 'bg-white/60 hover:bg-white text-slate-600 border-slate-200'
                                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800'
                              }`}
                              title={item.desc}
                            >
                              {item.icon}
                              <span className={`text-[10px] font-medium leading-none ${
                                isActive ? (isLight ? 'text-indigo-700 font-bold' : 'text-indigo-300 font-bold') : ''
                              }`}>
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
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
          {/* Quick Station Selection Section */}
          {stations.length > 0 && (
            <div className={`p-3 rounded-xl border space-y-2.5 ${cardBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <span className={textHeading}>路網車站清單 ({stations.length})</span>
                </div>
                <span className={`text-[10px] font-mono ${textMuted}`}>
                  點擊以選取檢視
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
                {stations.map((st) => {
                  const { colors } = getStationLinesAndColors(st);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onSelectStation?.(st.id)}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer border ${
                        isLight
                          ? 'bg-white hover:bg-indigo-50/80 border-slate-200/80 text-slate-800 shadow-2xs hover:border-indigo-300'
                          : 'bg-slate-900/90 hover:bg-indigo-950/50 border-slate-800 text-slate-200 hover:border-indigo-700/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {st.isVirtual ? (
                          <XCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (st.type === 'interchange' || st.type === 'interchange_3line') ? (
                          <GitFork className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="text-xs font-semibold truncate">
                          {st.isVirtual ? `虛擬節點 (${st.x}, ${st.y})` : st.name}
                        </span>
                        {(st.type === 'interchange' || st.type === 'interchange_3line') && !st.isVirtual && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-normal shrink-0 ${
                              isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-950 text-indigo-300'
                            }`}
                          >
                            {st.type === 'interchange_3line' ? '三線轉乘' : '轉乘站'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {colors.length > 0 && (
                          <div className="flex -space-x-1 items-center">
                            {colors.slice(0, 3).map((c, i) => (
                              <span
                                key={i}
                                className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        )}
                        <span className="text-[10px] text-indigo-500 font-medium">選取 ↗</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                <Layers className={`w-3.5 h-3.5 ${textMuted}`} />
                快捷操作提示
              </h3>
              {onOpenShortcuts && (
                <button
                  type="button"
                  onClick={onOpenShortcuts}
                  className="text-[11px] text-indigo-600 hover:text-indigo-500 font-medium cursor-pointer"
                >
                  完整清單 ↗
                </button>
              )}
            </div>
            <ul className={`space-y-1.5 font-mono text-[11px] ${textMuted}`}>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>Shift + 拖曳</kbd> 框選多個站點並批次移動</li>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>滾輪 / 雙指</kbd> 縮放與平移無限畫布</li>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>空白鍵 / 平移工具</kbd> 拖曳平移視野</li>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>右下角 HUD</kbd> 聚焦路網或回到 (0,0)</li>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>Delete</kbd> 批次刪除選取之節點或路線</li>
              <li>• <kbd className={`px-1 py-0.5 rounded border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>Esc</kbd> 取消連線或取消選取</li>
            </ul>

            {onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                className={`w-full mt-3 py-1.5 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isLight
                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border-indigo-800/60'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5 text-indigo-500" />
                <span>開啟完整快捷鍵說明 (按 ?)</span>
              </button>
            )}

            {/* Stage 2 Callout Button */}
            <button
              type="button"
              onClick={() => handleTabChange('stats')}
              className={`w-full mt-2 py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                isLight
                  ? 'bg-gradient-to-r from-indigo-50 to-sky-50 hover:from-indigo-100 hover:to-sky-100 text-indigo-800 border-indigo-200'
                  : 'bg-gradient-to-r from-indigo-950/60 to-slate-900 hover:from-indigo-900/70 hover:to-slate-850 text-indigo-200 border-indigo-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <span className="font-bold">查閱路網統計面板 (二階)</span>
              </div>
              <span className="text-[10px] font-mono opacity-80">
                {connections.length} 條連線 · {stations.length} 站 ↗
              </span>
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </aside>
  );
};
