import React, { useState, useEffect } from 'react';
import {
  Station,
  MetroLine,
  Connection,
  StationType,
  StationStyle,
  StationVariant,
  GuangzhouBadgeItem,
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
  CanvasImage,
  CanvasText,
  normalizeFontSize,
} from '../types/metro';
import {
  CityStationSymbol,
  resolveEffectiveStationVariant,
  getCityFromVariant,
  getDefaultGzBadges,
} from './CityStationSymbol';
import { getRouteTypeOptions } from './Toolbar';
import { useI18n } from '../i18n/I18nContext';
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
  Type,
  Upload,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Lock,
  Unlock,
  Image as ImageIcon,
  Check,
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
  const { t } = useI18n();
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
    if (deg >= 338 || deg < 23) return t('sidebar.dirE');
    if (deg >= 23 && deg < 68) return t('sidebar.dirSE');
    if (deg >= 68 && deg < 113) return t('sidebar.dirS');
    if (deg >= 113 && deg < 158) return t('sidebar.dirSW');
    if (deg >= 158 && deg < 203) return t('sidebar.dirW');
    if (deg >= 203 && deg < 248) return t('sidebar.dirNW');
    if (deg >= 248 && deg < 293) return t('sidebar.dirN');
    return t('sidebar.dirNE');
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
          title={t('sidebar.dialCcwTip')}
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
          title={t('sidebar.dialCwTip')}
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
  onUpdateStationLive?: (updated: Station) => void;
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
  svgImages?: CanvasImage[];
  svgTexts?: CanvasText[];
  selectedImage?: CanvasImage | null;
  selectedText?: CanvasText | null;
  onSelectImage?: (id: string | null) => void;
  onSelectText?: (id: string | null) => void;
  onUpdateImage?: (updated: CanvasImage) => void;
  onUpdateImageLive?: (updated: CanvasImage) => void;
  onUpdateImageZIndex?: (id: string, zIndex: number) => void;
  onDeleteImage?: (id: string) => void;
  onUpdateText?: (updated: CanvasText) => void;
  onUpdateTextLive?: (updated: CanvasText) => void;
  onUpdateTextZIndex?: (id: string, zIndex: number) => void;
  onDeleteText?: (id: string) => void;
  onRecordHistory?: () => void;
  defaultCityPreset?: StationStyle;
  onSelectCityPreset?: (preset: StationStyle) => void;
  onApplyCityPresetToAll?: (preset: StationStyle) => void;
  onApplyStationStyleToAll?: (style: StationStyle) => void;
  onApplyLineStyleToSameColor?: (connId: string) => void;
  onApplyLineStyleToAll?: (connId: string) => void;
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
  onUpdateStationLive,
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
  svgImages = [],
  svgTexts = [],
  selectedImage = null,
  selectedText = null,
  onSelectImage,
  onSelectText,
  onUpdateImage,
  onUpdateImageLive,
  onUpdateImageZIndex,
  onDeleteImage,
  onUpdateText,
  onUpdateTextLive,
  onUpdateTextZIndex,
  onDeleteText,
  onRecordHistory,
  defaultCityPreset = 'default',
  onSelectCityPreset,
  onApplyCityPresetToAll,
  onApplyStationStyleToAll,
  onApplyLineStyleToSameColor,
  onApplyLineStyleToAll,
}) => {
  const { t } = useI18n();
  const isLight = theme === 'light';
  const routeTypeOptions = React.useMemo(() => getRouteTypeOptions(t), [t]);
  const getLabelPosTitle = (pos?: string) => {
    switch (pos) {
      case 'top_left':
        return t('sidebar.labelTopLeft');
      case 'top':
        return t('sidebar.labelTop');
      case 'top_right':
        return t('sidebar.labelTopRight');
      case 'left':
        return t('sidebar.labelLeft');
      case 'right':
        return t('sidebar.labelRight');
      case 'bottom_left':
        return t('sidebar.labelBottomLeft');
      case 'bottom':
        return t('sidebar.labelBottom');
      case 'bottom_right':
        return t('sidebar.labelBottomRight');
      case 'custom':
        return t('sidebar.labelCustom');
      default:
        return t('sidebar.labelTop');
    }
  };

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

  // IME Composition & Draft States for Station Name, Station Code, Image Name, Text Content, and Search
  const [draftStationName, setDraftStationName] = useState('');
  const [isComposingStationName, setIsComposingStationName] = useState(false);
  const isComposingStationNameRef = React.useRef(false);
  const stationNameHistoryRecordedRef = React.useRef(false);
  const stationNameInputRef = React.useRef<HTMLInputElement | null>(null);

  const [draftStationCode, setDraftStationCode] = useState('');
  const [isComposingStationCode, setIsComposingStationCode] = useState(false);
  const isComposingStationCodeRef = React.useRef(false);
  const stationCodeHistoryRecordedRef = React.useRef(false);
  const stationCodeInputRef = React.useRef<HTMLInputElement | null>(null);

  const [draftImageName, setDraftImageName] = useState('');
  const [isComposingImageName, setIsComposingImageName] = useState(false);
  const isComposingImageNameRef = React.useRef(false);
  const imageNameHistoryRecordedRef = React.useRef(false);
  const imageNameInputRef = React.useRef<HTMLInputElement | null>(null);

  const [draftTextContent, setDraftTextContent] = useState('');
  const [isComposingTextContent, setIsComposingTextContent] = useState(false);
  const isComposingTextContentRef = React.useRef(false);
  const textContentHistoryRecordedRef = React.useRef(false);

  const isComposingSearchRef = React.useRef(false);

  const replaceImageInputRef = React.useRef<HTMLInputElement | null>(null);
  const textContentRef = React.useRef<HTMLTextAreaElement | null>(null);
  const prevTextIdsRef = React.useRef<Set<string>>(new Set(svgTexts.map((t) => t.id)));

  const [isReplaceUrlOpen, setIsReplaceUrlOpen] = useState(false);
  const [replaceUrlInput, setReplaceUrlInput] = useState('');
  const [replaceUrlError, setReplaceUrlError] = useState('');
  const [textHexInput, setTextHexInput] = useState('#18181B');
  const [stationHexInput, setStationHexInput] = useState('#18181B');
  const [showMoreStation, setShowMoreStation] = useState(false);
  const [showMoreConnection, setShowMoreConnection] = useState(false);
  const [showMoreOverview, setShowMoreOverview] = useState(false);

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
        if ('虛擬節點'.includes(q) || 'virtual'.includes(q) || t('canvas.virtualNode').toLowerCase().includes(q)) return true;
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
    if ((selectedStation || selectedConnection || selectedImage || selectedText) && currentTab === 'stats') {
      if (onTabChange) {
        onTabChange('inspector');
      } else {
        setInternalTab('inspector');
      }
    }
  }, [selectedStation?.id, selectedConnection?.id, selectedImage?.id, selectedText?.id]);

  useEffect(() => {
    const prevIds = prevTextIdsRef.current;
    const isBrandNewSelection = Boolean(selectedText && !prevIds.has(selectedText.id));
    prevTextIdsRef.current = new Set(svgTexts.map((t) => t.id));

    if (selectedText) {
      setTextHexInput(selectedText.color || (isLight ? '#18181B' : '#F4F4F5'));
      if (isBrandNewSelection) {
        requestAnimationFrame(() => {
          textContentRef.current?.focus();
          textContentRef.current?.select();
        });
      }
    }
  }, [selectedText?.id, selectedText?.color, svgTexts, isLight]);

  useEffect(() => {
    setIsReplaceUrlOpen(false);
    setReplaceUrlError('');
  }, [selectedImage?.id]);

  // Reset history flags when switching selected items
  useEffect(() => {
    isComposingStationNameRef.current = false;
    setIsComposingStationName(false);
    stationNameHistoryRecordedRef.current = false;
    isComposingStationCodeRef.current = false;
    setIsComposingStationCode(false);
    stationCodeHistoryRecordedRef.current = false;
  }, [selectedStation?.id]);

  useEffect(() => {
    if (selectedStation && !isComposingStationNameRef.current) {
      setDraftStationName(selectedStation.name);
    }
  }, [selectedStation?.id, selectedStation?.name]);

  useEffect(() => {
    if (selectedStation && !isComposingStationCodeRef.current) {
      setDraftStationCode(selectedStation.code || '');
    }
  }, [selectedStation?.id, selectedStation?.code]);

  useEffect(() => {
    if (selectedStation) {
      setStationHexInput(selectedStation.stationColor || '#18181B');
    }
  }, [selectedStation?.id, selectedStation?.stationColor]);

  useEffect(() => {
    isComposingImageNameRef.current = false;
    setIsComposingImageName(false);
    imageNameHistoryRecordedRef.current = false;
  }, [selectedImage?.id]);

  useEffect(() => {
    if (selectedImage && !isComposingImageNameRef.current) {
      setDraftImageName(selectedImage.name);
    }
  }, [selectedImage?.id, selectedImage?.name]);

  useEffect(() => {
    isComposingTextContentRef.current = false;
    setIsComposingTextContent(false);
    textContentHistoryRecordedRef.current = false;
  }, [selectedText?.id]);

  useEffect(() => {
    if (selectedText && !isComposingTextContentRef.current) {
      setDraftTextContent(selectedText.content);
    }
  }, [selectedText?.id, selectedText?.content]);

  const applyStationNameValue = (nextName: string, isFinalCommit: boolean) => {
    if (!selectedStation) return;
    if (nextName !== selectedStation.name) {
      if (!stationNameHistoryRecordedRef.current) {
        onRecordHistory?.();
        stationNameHistoryRecordedRef.current = true;
      }
      const updater = onUpdateStationLive || onUpdateStation;
      updater({ ...selectedStation, name: nextName });
    }
    if (isFinalCommit) {
      stationNameHistoryRecordedRef.current = false;
    }
  };

  const applyStationCodeValue = (nextCode: string, isFinalCommit: boolean) => {
    if (!selectedStation) return;
    if (nextCode !== (selectedStation.code || '')) {
      if (!stationCodeHistoryRecordedRef.current) {
        onRecordHistory?.();
        stationCodeHistoryRecordedRef.current = true;
      }
      const updater = onUpdateStationLive || onUpdateStation;
      updater({ ...selectedStation, code: nextCode });
    }
    if (isFinalCommit) {
      stationCodeHistoryRecordedRef.current = false;
    }
  };

  const applyImageNameValue = (nextName: string, isFinalCommit: boolean) => {
    if (!selectedImage || !onUpdateImage) return;
    if (nextName !== selectedImage.name) {
      if (!imageNameHistoryRecordedRef.current) {
        onRecordHistory?.();
        imageNameHistoryRecordedRef.current = true;
      }
      const updater = onUpdateImageLive || onUpdateImage;
      updater({ ...selectedImage, name: nextName });
    }
    if (isFinalCommit) {
      imageNameHistoryRecordedRef.current = false;
    }
  };

  const applyTextContentValue = (nextContent: string, isFinalCommit: boolean) => {
    if (!selectedText || !onUpdateText) return;
    if (nextContent !== selectedText.content) {
      if (!textContentHistoryRecordedRef.current) {
        onRecordHistory?.();
        textContentHistoryRecordedRef.current = true;
      }
      const updater = onUpdateTextLive || onUpdateText;
      updater({ ...selectedText, content: nextContent });
    }
    if (isFinalCommit) {
      textContentHistoryRecordedRef.current = false;
    }
  };

  const measureAndProcessImage = (
    src: string,
    fileName: string,
    onDone: (res: { src: string; name: string; width: number; height: number }) => void,
    onError?: () => void
  ) => {
    const img = new window.Image();
    img.onload = () => {
      const natW = img.naturalWidth > 0 ? img.naturalWidth : 200;
      const natH = img.naturalHeight > 0 ? img.naturalHeight : 200;
      const maxDim = 260;
      const ratio = Math.min(1, maxDim / Math.max(natW, natH));
      const width = Math.max(24, Math.round(natW * ratio));
      const height = Math.max(24, Math.round(natH * ratio));
      onDone({ src, name: fileName, width, height });
    };
    img.onerror = () => {
      if (onError) {
        onError();
      } else {
        onDone({ src, name: fileName, width: 200, height: 200 });
      }
    };
    img.src = src;
  };

  const handleReplaceImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedImage) return;
    const baseName = file.name.replace(/\.[^.]+$/, '') || t('canvas.defaultImageName');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      measureAndProcessImage(dataUrl, baseName, (res) => {
        onUpdateImage?.({
          ...selectedImage,
          name: res.name,
          src: res.src,
          width: res.width,
          height: res.height,
        });
      });
    };
    reader.readAsDataURL(file);
  };

  const handleReplaceImageUrl = () => {
    const raw = replaceUrlInput.trim();
    if (!raw || (!raw.startsWith('http://') && !raw.startsWith('https://') && !raw.startsWith('data:image/'))) {
      setReplaceUrlError(t('sidebar.urlErrorInvalid'));
      return;
    }
    setReplaceUrlError('');

    const fallbackName = raw.startsWith('data:')
      ? t('canvas.defaultImageName')
      : raw.split('/').pop()?.split('?')[0]?.slice(0, 28) || t('sidebar.remoteImageName');

    measureAndProcessImage(
      raw,
      fallbackName,
      (res) => {
        if (selectedImage) {
          onUpdateImage?.({
            ...selectedImage,
            src: res.src,
            width: res.width,
            height: res.height,
          });
          setReplaceUrlInput('');
          setIsReplaceUrlOpen(false);
        }
      },
      () => {
        setReplaceUrlError(t('sidebar.urlErrorLoad'));
      }
    );
  };

  const handleTextHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#') && val.length > 0) {
      val = '#' + val;
    }
    setTextHexInput(val);
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val) && selectedText) {
      onUpdateText?.({ ...selectedText, color: val.toUpperCase() });
    }
  };

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
    selectedStation ||
      selectedConnection ||
      selectedImage ||
      selectedText ||
      currentTab === 'stats' ||
      currentTab === 'routing'
  );

  return (
    <aside
      translate="no"
      className={`notranslate ${
        isMobileOpen
          ? 'fixed inset-x-0 bottom-0 max-h-[82vh] z-40 w-full rounded-t-xl shadow-2xl border-t border-x'
          : 'hidden'
      } lg:relative lg:inset-auto lg:flex lg:w-80 lg:h-full lg:min-h-0 lg:rounded-none lg:shadow-none lg:border-t-0 lg:border-x-0 border-l flex flex-col shrink-0 overflow-hidden transition-colors ${
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
            { id: 'inspector' as const, label: t('app.tab.inspector') },
            { id: 'routing' as const, label: t('app.tab.routing') },
            { id: 'stats' as const, label: t('app.tab.stats') },
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
            title={t('sidebar.closePanelTip')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Sidebar Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-6">

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

      {/* Tab: Routing */}
      {currentTab === 'routing' && (
        <div className={`divide-y text-xs ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
          {/* Header */}
          <div className="p-4 flex items-center justify-between gap-2">
            <div>
              <h2 className={`font-semibold text-sm ${textHeading}`}>{t('sidebar.routingTitle')}</h2>
              <p className={`text-[11px] mt-0.5 ${textMuted}`}>
                {t('sidebar.routingSubtitle')}
              </p>
            </div>
            {(pathStartId || pathEndId) && (
              <button
                type="button"
                onClick={handleClearPath}
                className="text-[11px] px-2 py-1 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                {t('sidebar.clearBtn')}
              </button>
            )}
          </div>

          {/* Algorithm Segmented Control */}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-medium ${textMuted}`}>{t('sidebar.algorithmLabel')}</span>
              <span className={`text-[11px] font-mono ${textMuted}`}>
                {pathAlgorithm === 'dijkstra' ? t('sidebar.algoDijkstraDesc') : t('sidebar.algoBfsDesc')}
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
                {t('sidebar.algoBfsLabel')}
              </button>
            </div>
          </div>

          {/* Origin & Destination Selectors */}
          <div className="p-4 space-y-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className={`text-[11px] font-medium flex items-center gap-1.5 ${textHeading}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{t('sidebar.startStation')}</span>
                </label>
                {selectedStation && selectedStation.id !== pathStartId && (
                  <button
                    type="button"
                    onClick={() => setPathStartId(selectedStation.id)}
                    className={`text-[10px] hover:underline font-medium cursor-pointer ${
                      isLight ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    {t('sidebar.useSelected', {
                      name: selectedStation.isVirtual ? t('canvas.virtualNode') : selectedStation.name,
                    })}
                  </button>
                )}
              </div>
              <select
                value={pathStartId}
                onChange={(e) => setPathStartId(e.target.value)}
                className={`w-full py-1.5 px-2.5 text-xs rounded-md border outline-none ${inputCls}`}
              >
                <option value="">{t('sidebar.selectStartPlaceholder')}</option>
                {stations.map((st) => (
                  <option key={`routing-start-${st.id}`} value={st.id}>
                    {st.isVirtual ? `${t('canvas.virtualNode')} (${st.x}, ${st.y})` : st.name}
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
                title={t('sidebar.swapTip')}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>{t('sidebar.swapStations')}</span>
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className={`text-[11px] font-medium flex items-center gap-1.5 ${textHeading}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>{t('sidebar.endStation')}</span>
                </label>
                {selectedStation && selectedStation.id !== pathEndId && (
                  <button
                    type="button"
                    onClick={() => setPathEndId(selectedStation.id)}
                    className={`text-[10px] hover:underline font-medium cursor-pointer ${
                      isLight ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    {t('sidebar.useSelected', {
                      name: selectedStation.isVirtual ? t('canvas.virtualNode') : selectedStation.name,
                    })}
                  </button>
                )}
              </div>
              <select
                value={pathEndId}
                onChange={(e) => setPathEndId(e.target.value)}
                className={`w-full py-1.5 px-2.5 text-xs rounded-md border outline-none ${inputCls}`}
              >
                <option value="">{t('sidebar.selectEndPlaceholder')}</option>
                {stations.map((st) => (
                  <option key={`routing-end-${st.id}`} value={st.id}>
                    {st.isVirtual ? `${t('canvas.virtualNode')} (${st.x}, ${st.y})` : st.name}
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
                    <span>{t('sidebar.highlightOn')}</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{t('sidebar.highlightOff')}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {stations.length < 2 && (
            <div className={`p-4 text-center ${textMuted}`}>
              {t('sidebar.needTwoStations')}
            </div>
          )}

          {pathStartId && pathEndId && pathStartId === pathEndId && (
            <div className="p-4 text-amber-600 dark:text-amber-400 text-center font-medium">
              {t('sidebar.sameStationWarn')}
            </div>
          )}

          {/* Computed Shortest Path Result */}
          {shortestPathResult && pathStartId && pathEndId && pathStartId !== pathEndId && (
            <div className="p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className={`font-semibold text-xs ${textHeading}`}>
                  {shortestPathResult.isReachable
                    ? t('sidebar.shortestPathFound')
                    : t('sidebar.notConnectedTitle')}
                </span>
                <span className={`text-[10px] font-mono ${textMuted}`}>
                  {shortestPathResult.algorithm === 'bfs' ? 'BFS' : 'Dijkstra'}
                </span>
              </div>

              {!shortestPathResult.isReachable && (
                <div className={`p-2.5 rounded-lg border text-[11px] space-y-2 ${surfaceSubtle}`}>
                  <p className={textMuted}>
                    {t('sidebar.notConnectedDesc')}
                  </p>
                  {onAddConnection && (
                    <button
                      type="button"
                      onClick={handleApplySuggestedConnections}
                      className={`w-full py-1.5 px-2.5 rounded-md text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors ${btnActive}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('sidebar.oneClickConnect')}</span>
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
                  <div className={`text-[10px] ${textMuted}`}>{t('sidebar.kpiStops')}</div>
                  <div className={`text-xs font-semibold font-mono tabular-nums mt-0.5 ${textHeading}`}>
                    {t('sidebar.stopsCount', { count: shortestPathResult.stopsCount })}
                  </div>
                </div>
                <div className="p-2 text-center">
                  <div className={`text-[10px] ${textMuted}`}>{t('sidebar.kpiTransfers')}</div>
                  <div className={`text-xs font-semibold font-mono tabular-nums mt-0.5 ${textHeading}`}>
                    {shortestPathResult.transfersCount === 0
                      ? t('sidebar.direct')
                      : t('sidebar.transfersCount', { count: shortestPathResult.transfersCount })}
                  </div>
                </div>
                <div className="p-2 text-center">
                  <div className={`text-[10px] ${textMuted}`}>{t('sidebar.kpiTotalDist')}</div>
                  <div className={`text-xs font-semibold font-mono tabular-nums mt-0.5 ${textHeading}`}>
                    {shortestPathResult.totalDistance}
                  </div>
                </div>
              </div>

              {/* Highlighted Connections List */}
              {shortestPathResult.isReachable && shortestPathResult.connectionIds.length > 0 && (
                <div className="space-y-1.5">
                  <div className={`text-[11px] font-medium flex items-center justify-between ${textMuted}`}>
                    <span>{t('sidebar.routeConnsTitle', { count: shortestPathResult.connectionIds.length })}</span>
                    <span className="font-mono text-[10px]">{t('sidebar.clickSelect')}</span>
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
                              {fromSt.isVirtual ? t('sidebar.nodeShort', { x: fromSt.x, y: fromSt.y }) : fromSt.name}
                            </span>
                            <ArrowRight className={`w-3 h-3 shrink-0 ${textMuted}`} />
                            <span className="truncate text-[11px]">
                              {toSt.isVirtual ? t('sidebar.nodeShort', { x: toSt.x, y: toSt.y }) : toSt.name}
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
                  <span>{t('sidebar.routeStepsTitle', { count: shortestPathResult.steps.length })}</span>
                  <span className="font-mono text-[10px]">{t('sidebar.clickLocate')}</span>
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
                            {isStart ? t('sidebar.stepStartBadge') : isEnd ? t('sidebar.stepEndBadge') : idx + 1}
                          </span>
                          <span className="truncate font-medium text-xs">
                            {step.station.isVirtual
                              ? `${t('canvas.virtualNode')} (${step.station.x}, ${step.station.y})`
                              : step.station.name}
                          </span>
                          {step.isTransfer && (
                            <span className={`text-[10px] shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                              {t('sidebar.transferBadge')}
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
                {t('sidebar.searchLabel')}
              </label>
              <span className={`text-[11px] font-mono tabular-nums ${textMuted}`}>
                {stationSearchQuery.trim()
                  ? t('sidebar.searchCountFiltered', { filtered: filteredStations.length, total: stations.length })
                  : t('sidebar.searchCountTotal', { total: stations.length })}
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
                onCompositionStart={() => {
                  isComposingSearchRef.current = true;
                }}
                onCompositionEnd={(e) => {
                  isComposingSearchRef.current = false;
                  setStationSearchQuery(e.currentTarget.value);
                }}
                onChange={(e) => setStationSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (isComposingSearchRef.current || e.nativeEvent.isComposing) return;
                  if (e.key === 'Escape') {
                    setStationSearchQuery('');
                    e.currentTarget.blur();
                  } else if (e.key === 'Enter' && filteredStations.length > 0) {
                    onSelectStation?.(filteredStations[0].id);
                  }
                }}
                placeholder={t('sidebar.searchPlaceholder')}
                className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-md border outline-none transition-colors ${inputCls}`}
              />
              {stationSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStationSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  title={t('sidebar.searchClearTip')}
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
                      {t('sidebar.searchEmpty', { query: stationSearchQuery })}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStationSearchQuery('')}
                      className={`mt-1 text-[11px] underline cursor-pointer ${textHeading}`}
                    >
                      {t('sidebar.searchReset')}
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
                              {st.isVirtual ? `${t('canvas.virtualNode')} (${st.x}, ${st.y})` : st.name}
                            </div>
                            <div className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                              ({st.x}, {st.y}){connCount > 0 ? ` · ${connCount} ${t('sidebar.linesUnit')}` : ''}
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
                            {isSelected ? t('sidebar.selectedTag') : t('sidebar.selectTag')}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Hidden file input for replacing selected SVG Image */}
          <input
            ref={replaceImageInputRef}
            type="file"
            accept="image/*,.svg"
            className="hidden"
            onChange={handleReplaceImageFileSelect}
          />

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
                <span className={`text-xs font-medium ${textHeading}`}>{t('sidebar.quickPathTitle')}</span>
                {shortestPathResult && (
                  <span className={`text-[10px] font-mono tabular-nums truncate ${textMuted}`}>
                    {t('sidebar.quickPathSummary', {
                      stops: shortestPathResult.stopsCount,
                      dist: shortestPathResult.totalDistance,
                    })}
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
                      <option value="">{t('sidebar.selectStartPlaceholder')}</option>
                      {stations.map((st) => (
                        <option key={`start-${st.id}`} value={st.id}>
                          {st.isVirtual ? `${t('canvas.virtualNode')} (${st.x}, ${st.y})` : st.name}
                        </option>
                      ))}
                    </select>
                    {selectedStation && selectedStation.id !== pathStartId && (
                      <button
                        type="button"
                        onClick={() => setPathStartId(selectedStation.id)}
                        className={`px-2 py-1 text-[10px] rounded-md border shrink-0 cursor-pointer ${btnInactive}`}
                        title={t('sidebar.setStartTip')}
                      >
                        {t('sidebar.setStartBtn')}
                      </button>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleSwapPathStations}
                      disabled={!pathStartId && !pathEndId}
                      className={`p-1 rounded-md border transition-colors cursor-pointer disabled:opacity-30 ${btnInactive}`}
                      title={t('sidebar.swapTip')}
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
                      <option value="">{t('sidebar.selectEndPlaceholder')}</option>
                      {stations.map((st) => (
                        <option key={`end-${st.id}`} value={st.id}>
                          {st.isVirtual ? `${t('canvas.virtualNode')} (${st.x}, ${st.y})` : st.name}
                        </option>
                      ))}
                    </select>
                    {selectedStation && selectedStation.id !== pathEndId && (
                      <button
                        type="button"
                        onClick={() => setPathEndId(selectedStation.id)}
                        className={`px-2 py-1 text-[10px] rounded-md border shrink-0 cursor-pointer ${btnInactive}`}
                        title={t('sidebar.setEndTip')}
                      >
                        {t('sidebar.setEndBtn')}
                      </button>
                    )}
                  </div>
                </div>

                {stations.length < 2 && (
                  <p className={`text-[11px] ${textMuted}`}>
                    {t('sidebar.needTwoCompact')}
                  </p>
                )}

                {shortestPathResult && pathStartId && pathEndId && (
                  <div className={`pt-2 border-t space-y-2 ${borderCol}`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium text-xs ${textHeading}`}>
                        {shortestPathResult.isDirectSuggested
                          ? t('sidebar.suggestedOrder')
                          : t('sidebar.activeShortestPath')}
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
                        <div className={`text-[10px] ${textMuted}`}>{t('sidebar.kpiStops')}</div>
                        <div className={`text-xs font-semibold font-mono tabular-nums ${textHeading}`}>
                          {t('sidebar.stopsCount', { count: shortestPathResult.stopsCount })}
                        </div>
                      </div>
                      <div className="p-1.5 text-center">
                        <div className={`text-[10px] ${textMuted}`}>{t('sidebar.kpiTransfers')}</div>
                        <div className={`text-xs font-semibold font-mono tabular-nums ${textHeading}`}>
                          {shortestPathResult.transfersCount === 0
                            ? t('sidebar.direct')
                            : t('sidebar.transfersCount', { count: shortestPathResult.transfersCount })}
                        </div>
                      </div>
                      <div className="p-1.5 text-center">
                        <div className={`text-[10px] ${textMuted}`}>{t('sidebar.kpiDistance')}</div>
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
                                {isStart ? t('sidebar.stepStartBadge') : isEnd ? t('sidebar.stepEndBadge') : idx + 1}
                              </span>
                              <span className="truncate font-medium text-xs">
                                {step.station.isVirtual
                                  ? `${t('canvas.virtualNode')} (${step.station.x}, ${step.station.y})`
                                  : step.station.name}
                              </span>
                              {step.isTransfer && (
                                <span className={`text-[10px] ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                                  {t('sidebar.transferBadge')}
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
                          <span>{showPathPreview ? t('sidebar.previewOn') : t('sidebar.previewOff')}</span>
                        </button>
                      )}
                      {shortestPathResult.isDirectSuggested && onAddConnection && (
                        <button
                          type="button"
                          onClick={handleApplySuggestedConnections}
                          className={`py-1.5 px-2.5 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${btnActive}`}
                          title={t('sidebar.oneClickTip')}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('sidebar.oneClickShort')}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClearPath}
                        className={`p-1.5 rounded-md border text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer ${btnInactive}`}
                        title={t('sidebar.clearPathTip')}
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
                  <h2 className={`font-semibold text-sm ${textHeading}`}>{t('sidebar.virtualTitle')}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDeleteStation(selectedStation.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    title={t('sidebar.deleteVirtualTip')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${textMuted}`}
                      title={t('sidebar.closePanelTip')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-2">
                <p className={`text-[11px] leading-relaxed ${textMuted}`}>
                  {t('sidebar.virtualDesc')}
                </p>
                <div className={`flex items-center justify-between font-mono text-[11px] tabular-nums ${textMuted}`}>
                  <span>{t('sidebar.canvasCoords')}</span>
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
                      <span className={`font-semibold ${textHeading}`}>{t('sidebar.svgFreeTransform')}</span>
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
                          {t('sidebar.resetDefault')}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>{t('sidebar.overallScale')}</span>
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
                          <span className={textMuted}>{t('sidebar.scaleX')}</span>
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
                          <span className={textMuted}>{t('sidebar.scaleY')}</span>
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
                          <span className={textMuted}>{t('sidebar.rotationAngle')}</span>
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
                          <span className={textMuted}>{t('sidebar.opacity')}</span>
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
                <label className={`block font-medium ${textMuted}`}>{t('sidebar.nodeForm')}</label>
                <button
                  type="button"
                  onClick={() => {
                    const regCount = stations.filter((s) => !s.isVirtual).length + 1;
                    onUpdateStation({
                      ...selectedStation,
                      isVirtual: false,
                      name: `${t('app.defaultStationPrefix')} ${regCount}`,
                      code: `S${regCount}`,
                      type: 'regular',
                      labelPosition: 'top',
                    });
                  }}
                  className={`w-full py-2 px-3 rounded-md flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer border ${btnInactive}`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{t('sidebar.convertToRegular')}</span>
                </button>
              </div>

              {/* Connected lines summary */}
              <div className="p-4 space-y-2">
                <label className={`block font-medium ${textMuted}`}>{t('sidebar.adjacentLines')}</label>
                {connections.filter(
                  (c) =>
                    c.fromStationId === selectedStation.id ||
                    c.toStationId === selectedStation.id
                ).length === 0 ? (
                  <p className={textMuted}>{t('sidebar.noAdjacentLines')}</p>
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
                          ? `${t('canvas.virtualNode')} (${otherSt.x}, ${otherSt.y})`
                          : otherSt?.name || t('sidebar.unknownStation');

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
                              <span className="truncate">{t('sidebar.toOtherStation', { name: otherName })}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] tabular-nums">
                              {(conn.offset ?? 0) !== 0 && (
                                <span className={textMuted}>
                                  {t('sidebar.offsetBadge', {
                                    val: (conn.offset ?? 0) > 0 ? `+${conn.offset}` : conn.offset ?? 0,
                                  })}
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
                  <h2 className={`font-semibold text-sm ${textHeading}`}>{t('sidebar.stationTitle')}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDeleteStation(selectedStation.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    title={t('sidebar.deleteStationTip')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${textMuted}`}
                      title={t('sidebar.closePanelTip')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Name & Code */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`font-medium ${textMuted}`}>{t('sidebar.stationName')}</label>
                    {isComposingStationName && (
                      <span className="text-[10px] font-mono text-zinc-400">{t('sidebar.composing')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={stationNameInputRef}
                      type="text"
                      value={draftStationName}
                      onCompositionStart={() => {
                        isComposingStationNameRef.current = true;
                        setIsComposingStationName(true);
                      }}
                      onCompositionEnd={(e) => {
                        isComposingStationNameRef.current = false;
                        setIsComposingStationName(false);
                        const finalVal = e.currentTarget.value;
                        setDraftStationName(finalVal);
                        applyStationNameValue(finalVal, false);
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftStationName(val);
                        if (!isComposingStationNameRef.current && !(e.nativeEvent as InputEvent)?.isComposing) {
                          applyStationNameValue(val, false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (isComposingStationNameRef.current || e.nativeEvent.isComposing) return;
                          e.preventDefault();
                          applyStationNameValue(e.currentTarget.value, true);
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={(e) => {
                        isComposingStationNameRef.current = false;
                        setIsComposingStationName(false);
                        applyStationNameValue(e.currentTarget.value, true);
                      }}
                      className={`flex-1 min-w-0 px-3 py-1.5 rounded-md text-sm border focus:outline-none ${inputCls}`}
                      placeholder={t('sidebar.stationNamePlaceholder')}
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        isComposingStationNameRef.current = false;
                        setIsComposingStationName(false);
                        const val = stationNameInputRef.current?.value ?? draftStationName;
                        setDraftStationName(val);
                        applyStationNameValue(val, true);
                        stationNameInputRef.current?.blur();
                      }}
                      className={`px-2.5 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                        draftStationName !== selectedStation.name ? btnActive : btnInactive
                      }`}
                      title={t('sidebar.confirmNameTip')}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('canvas.confirm')}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`font-medium ${textMuted}`}>{t('sidebar.stationCode')}</label>
                    {isComposingStationCode && (
                      <span className="text-[10px] font-mono text-zinc-400">{t('sidebar.composing')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={stationCodeInputRef}
                      type="text"
                      value={draftStationCode}
                      onCompositionStart={() => {
                        isComposingStationCodeRef.current = true;
                        setIsComposingStationCode(true);
                      }}
                      onCompositionEnd={(e) => {
                        isComposingStationCodeRef.current = false;
                        setIsComposingStationCode(false);
                        const finalVal = e.currentTarget.value;
                        setDraftStationCode(finalVal);
                        applyStationCodeValue(finalVal, false);
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftStationCode(val);
                        if (!isComposingStationCodeRef.current && !(e.nativeEvent as InputEvent)?.isComposing) {
                          applyStationCodeValue(val, false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (isComposingStationCodeRef.current || e.nativeEvent.isComposing) return;
                          e.preventDefault();
                          applyStationCodeValue(e.currentTarget.value, true);
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={(e) => {
                        isComposingStationCodeRef.current = false;
                        setIsComposingStationCode(false);
                        applyStationCodeValue(e.currentTarget.value, true);
                      }}
                      className={`flex-1 min-w-0 px-3 py-1.5 rounded-md font-mono text-sm border focus:outline-none ${inputCls}`}
                      placeholder={t('sidebar.stationCodePlaceholder')}
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        isComposingStationCodeRef.current = false;
                        setIsComposingStationCode(false);
                        const val = stationCodeInputRef.current?.value ?? draftStationCode;
                        setDraftStationCode(val);
                        applyStationCodeValue(val, true);
                        stationCodeInputRef.current?.blur();
                      }}
                      className={`px-2.5 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                        draftStationCode !== (selectedStation.code || '') ? btnActive : btnInactive
                      }`}
                      title={t('sidebar.confirmCodeTip')}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('canvas.confirm')}</span>
                    </button>
                  </div>
                </div>

                <div className={`flex items-center justify-between font-mono text-[11px] tabular-nums pt-1 ${textMuted}`}>
                  <span>{t('sidebar.canvasCoords')}</span>
                  <span className={textHeading}>X: {selectedStation.x}, Y: {selectedStation.y}</span>
                </div>
              </div>

              {/* Station Type & Interchange Settings */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className={`font-medium ${textMuted}`}>{t('sidebar.stationType')}</label>
                  {(() => {
                    const stConns = connections.filter(
                      (c) => c.fromStationId === selectedStation.id || c.toStationId === selectedStation.id
                    );
                    const distinctSet = new Set(stConns.map((c) => (c.color || '').toUpperCase()));
                    if (distinctSet.size >= 2) {
                      return (
                        <span className="text-[11px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {t('sidebar.interchangeCountBadge', { count: distinctSet.size })}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { type: 'regular', label: t('sidebar.typeRegular') },
                    { type: 'interchange', label: t('sidebar.typeInterchange') },
                    { type: 'terminal', label: t('sidebar.typeTerminal') },
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
                            <span className={`font-medium ${textMuted}`}>{t('sidebar.interchangeLinesCount')}</span>
                            <span className={`font-mono text-[10px] tabular-nums ${textHeading}`}>
                              {selectedStation.interchangeLinesCount
                                ? t('sidebar.customLinesBadge', { count: activeCount })
                                : t('sidebar.autoLinesBadge', { count: activeCount })}
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
                              {t('sidebar.auto')}
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
                                {t('sidebar.nLines', { n })}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] ${textMuted}`}>{t('sidebar.customLines')}</span>
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
                            <span className={`font-medium ${textMuted}`}>{t('sidebar.interchangeStyle')}</span>
                            <span className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                              {t('sidebar.nLines', { n: activeCount })}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              {
                                style: 'dots' as InterchangeStyle,
                                label: t('sidebar.styleDots'),
                                desc: t('sidebar.styleDotsDesc'),
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
                                label: t('sidebar.stylePie'),
                                desc: t('sidebar.stylePieDesc'),
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
                                label: t('sidebar.styleCapsule'),
                                desc: t('sidebar.styleCapsuleDesc'),
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

                {/* City Station Style + Exact 9 Official SVG Variants + SVG Color + Guangzhou Badges */}
                {(() => {
                  const { colors: stationConnectedColors } = getStationLinesAndColors(selectedStation);
                  const effectiveVariant = resolveEffectiveStationVariant(
                    selectedStation.stationStyle,
                    selectedStation.type,
                    selectedStation.stationVariant
                  );
                  const isGuangzhouVariant =
                    effectiveVariant === 'guangzhou_basic' ||
                    effectiveVariant === 'guangzhou_interchange' ||
                    effectiveVariant === 'guangzhou_interchange_2024';

                  const applyStationSvgColor = (newCol: string | undefined) => {
                    if (!selectedStation) return;
                    const nextGzBadges =
                      selectedStation.gzBadges &&
                      (effectiveVariant === 'guangzhou_basic' ||
                        effectiveVariant === 'guangzhou_interchange_2024')
                        ? selectedStation.gzBadges.map((b) => ({ ...b, color: undefined }))
                        : selectedStation.gzBadges;
                    onUpdateStation({
                      ...selectedStation,
                      stationColor: newCol,
                      ...(nextGzBadges ? { gzBadges: nextGzBadges } : {}),
                    });
                  };

                  const variantButtons: Array<{
                    variant: Exclude<StationVariant, 'auto'>;
                    label: string;
                    viewBox: string;
                    isInterchange: boolean;
                  }> = [
                    { variant: 'shanghai_basic', label: t('sidebar.variantShanghaiBasic'), viewBox: '-12 -10 24 20', isInterchange: false },
                    { variant: 'shanghai_2020', label: t('sidebar.variantShanghai2020'), viewBox: '-12 -10 24 20', isInterchange: false },
                    { variant: 'shanghai_interchange', label: t('sidebar.variantShanghaiInterchange'), viewBox: '-14 -10 28 20', isInterchange: true },
                    { variant: 'shanghai_suburban', label: t('sidebar.variantShanghaiSuburban'), viewBox: '-12 -10 24 20', isInterchange: false },
                    { variant: 'guangzhou_basic', label: t('sidebar.variantGuangzhouBasic'), viewBox: '-20 -10 40 20', isInterchange: false },
                    { variant: 'guangzhou_interchange', label: t('sidebar.variantGuangzhouInterchange'), viewBox: '-30 -12 60 24', isInterchange: true },
                    { variant: 'guangzhou_interchange_2024', label: t('sidebar.variantGuangzhouInterchange2024'), viewBox: '-30 -15 60 30', isInterchange: true },
                    { variant: 'beijing_basic', label: t('sidebar.variantBeijingBasic'), viewBox: '-12 -10 24 20', isInterchange: false },
                    { variant: 'beijing_interchange', label: t('sidebar.variantBeijingInterchange'), viewBox: '-12 -11 24 22', isInterchange: true },
                  ];

                  const activeGzBadges = isGuangzhouVariant && effectiveVariant
                    ? getDefaultGzBadges(
                        effectiveVariant,
                        selectedStation.gzBadges,
                        stationConnectedColors,
                        selectedStation.code,
                        selectedStation.stationColor
                      )
                    : [];

                  const updateGzBadges = (nextBadges: GuangzhouBadgeItem[]) => {
                    onUpdateStation({
                      ...selectedStation,
                      gzBadges: nextBadges,
                    });
                  };

                  return (
                    <>
                      {/* 4 High-level City Style Presets */}
                      <div className={`pt-3 border-t space-y-2 ${borderCol}`}>
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${textMuted}`}>{t('sidebar.cityStyleTitle')}</span>
                          <span className={`text-[10px] font-mono ${textHeading}`}>
                            {(() => {
                              const s = selectedStation.stationStyle || 'default';
                              if (s === 'beijing') return t('sidebar.cityBeijing');
                              if (s === 'shanghai') return t('sidebar.cityShanghai');
                              if (s === 'guangzhou') return t('sidebar.cityGuangzhou');
                              return t('sidebar.cityDefault');
                            })()}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(
                            [
                              {
                                id: 'default' as StationStyle,
                                label: t('sidebar.cityDefault'),
                                desc: t('sidebar.cityDefaultDesc'),
                                preview: (
                                  <svg className="w-6 h-5" viewBox="-14 -12 28 24">
                                    <circle r={7} fill="#ffffff" stroke={selectedStation.stationColor || '#0f172a'} strokeWidth={2.4} />
                                  </svg>
                                ),
                              },
                              {
                                id: 'beijing' as StationStyle,
                                label: t('sidebar.cityBeijing'),
                                desc: t('sidebar.cityBeijingDesc'),
                                preview: (
                                  <svg className="w-6 h-5" viewBox="-12 -11 24 22">
                                    <CityStationSymbol variant="beijing_interchange" stationColor={selectedStation.stationColor} />
                                  </svg>
                                ),
                              },
                              {
                                id: 'shanghai' as StationStyle,
                                label: t('sidebar.cityShanghai'),
                                desc: t('sidebar.cityShanghaiDesc'),
                                preview: (
                                  <svg className="w-6 h-5" viewBox="-12 -10 24 20">
                                    <CityStationSymbol variant="shanghai_interchange" stationColor={selectedStation.stationColor} />
                                  </svg>
                                ),
                              },
                              {
                                id: 'guangzhou' as StationStyle,
                                label: t('sidebar.cityGuangzhou'),
                                desc: t('sidebar.cityGuangzhouDesc'),
                                preview: (
                                  <svg className="w-7 h-5" viewBox="-20 -10 40 20">
                                    <CityStationSymbol variant="guangzhou_basic" stationColor={selectedStation.stationColor} />
                                  </svg>
                                ),
                              },
                            ]
                          ).map((item) => {
                            const active =
                              (selectedStation.stationStyle || 'default') === item.id &&
                              (!selectedStation.stationVariant || selectedStation.stationVariant === 'auto');
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() =>
                                  onUpdateStation({
                                    ...selectedStation,
                                    stationStyle: item.id,
                                    stationVariant: undefined,
                                  })
                                }
                                title={item.desc}
                                className={`py-1.5 px-1 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 ${
                                  active ? btnActive : btnInactive
                                }`}
                              >
                                <span className="w-9 h-6 rounded bg-white border border-zinc-200 flex items-center justify-center">
                                  {item.preview}
                                </span>
                                <span className="text-[10px] leading-none">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Exact 9 Official SVG Station Variants */}
                      <div className={`pt-3 border-t space-y-2 ${borderCol}`}>
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${textMuted}`}>{t('sidebar.stationVariantTitle')}</span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateStation({
                                ...selectedStation,
                                stationVariant: undefined,
                              })
                            }
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                              !selectedStation.stationVariant || selectedStation.stationVariant === 'auto'
                                ? btnActive
                                : btnInactive
                            }`}
                          >
                            {t('sidebar.variantAuto')}
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          {variantButtons.map((item) => {
                            const isActive =
                              selectedStation.stationVariant === item.variant ||
                              ((!selectedStation.stationVariant || selectedStation.stationVariant === 'auto') &&
                                effectiveVariant === item.variant);
                            return (
                              <button
                                key={item.variant}
                                type="button"
                                onClick={() =>
                                  onUpdateStation({
                                    ...selectedStation,
                                    stationVariant: item.variant,
                                    stationStyle: getCityFromVariant(item.variant),
                                    type: item.isInterchange ? 'interchange' : 'regular',
                                  })
                                }
                                title={item.label}
                                className={`p-1.5 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 ${
                                  isActive ? btnActive : btnInactive
                                }`}
                              >
                                <span className="w-full h-7 rounded bg-white border border-zinc-200 flex items-center justify-center overflow-hidden">
                                  <svg className="w-16 h-6" viewBox={item.viewBox}>
                                    <CityStationSymbol
                                      variant={item.variant}
                                      stationColor={selectedStation.stationColor}
                                    />
                                  </svg>
                                </span>
                                <span className="text-[9.5px] leading-tight truncate w-full">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Station SVG Color Customization (All Station Symbols) */}
                      <div className={`pt-3 border-t space-y-2 ${borderCol}`}>
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${textMuted}`}>{t('sidebar.stationColorTitle')}</span>
                          {selectedStation.stationColor && (
                            <button
                              type="button"
                              onClick={() => {
                                setStationHexInput('#18181B');
                                applyStationSvgColor(undefined);
                              }}
                              className={`text-[10px] underline cursor-pointer ${textMuted} hover:opacity-80`}
                            >
                              {t('sidebar.stationColorReset')}
                            </button>
                          )}
                        </div>

                        <div className={`flex items-center gap-2 p-1.5 rounded-md border ${surfaceSubtle}`}>
                          <input
                            type="color"
                            value={selectedStation.stationColor || '#18181B'}
                            onChange={(e) => {
                              const newCol = e.target.value.toUpperCase();
                              setStationHexInput(newCol);
                              applyStationSvgColor(newCol);
                            }}
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0"
                            title={t('sidebar.pickColorTip')}
                          />
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <Hash className={`w-3 h-3 shrink-0 ${textMuted}`} />
                            <input
                              type="text"
                              value={stationHexInput}
                              onChange={(e) => {
                                let val = e.target.value.trim();
                                if (!val.startsWith('#') && val.length > 0) {
                                  val = '#' + val;
                                }
                                setStationHexInput(val);
                                if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
                                  applyStationSvgColor(val.toUpperCase());
                                }
                              }}
                              maxLength={7}
                              className={`bg-transparent font-mono uppercase font-semibold focus:outline-none w-full text-xs ${textHeading}`}
                              placeholder="#18181B"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-9 gap-1">
                          {[
                            '#18181B',
                            '#71717A',
                            '#E11D48',
                            '#2563EB',
                            '#16A34A',
                            '#EAB308',
                            '#F97316',
                            '#9333EA',
                            '#06B6D4',
                          ].map((col) => (
                            <button
                              key={`st-col-${col}`}
                              type="button"
                              onClick={() => {
                                setStationHexInput(col);
                                applyStationSvgColor(col);
                              }}
                              className={`w-full h-5 rounded border transition-transform hover:scale-105 cursor-pointer ${
                                (selectedStation.stationColor || '').toUpperCase() === col
                                  ? 'ring-2 ring-zinc-500 border-white'
                                  : 'border-black/20'
                              }`}
                              style={{ backgroundColor: col }}
                              title={col}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Guangzhou Pill Numbers & Per-Capsule Colors Editor */}
                      {isGuangzhouVariant && (
                        <div className={`pt-3 border-t space-y-2.5 ${borderCol}`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${textHeading}`}>{t('sidebar.gzBadgesTitle')}</span>
                            {effectiveVariant === 'guangzhou_interchange' && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateGzBadges([
                                    ...activeGzBadges,
                                    {
                                      line: String(activeGzBadges.length + 1),
                                      number: '01',
                                      color: '#2563EB',
                                    },
                                  ])
                                }
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium cursor-pointer ${btnInactive}`}
                              >
                                <Plus className="w-3 h-3" />
                                <span>{t('sidebar.gzAddBadge')}</span>
                              </button>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            {activeGzBadges.map((badge, idx) => (
                              <div
                                key={`gz-badge-${idx}`}
                                className={`p-2 rounded-md border space-y-1.5 ${surfaceSubtle}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white text-zinc-900 border border-zinc-300">
                                      {badge.line || '1'} | {badge.number || '01'}
                                    </span>
                                    <span className={`text-[10px] font-mono ${textMuted}`}>
                                      #{idx + 1}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <label className="inline-flex items-center gap-1 cursor-pointer" title={t('sidebar.gzBadgeColor')}>
                                      <span className={`text-[10px] ${textMuted}`}>{t('sidebar.gzBadgeColor')}</span>
                                      <input
                                        type="color"
                                        value={badge.color || selectedStation.stationColor || '#18181B'}
                                        onChange={(e) => {
                                          const col = e.target.value.toUpperCase();
                                          updateGzBadges(
                                            activeGzBadges.map((b, i) =>
                                              i === idx ? { ...b, color: col } : b
                                            )
                                          );
                                        }}
                                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                                      />
                                    </label>
                                    {effectiveVariant === 'guangzhou_interchange' && activeGzBadges.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateGzBadges(activeGzBadges.filter((_, i) => i !== idx))
                                        }
                                        className="p-0.5 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                                        title={t('sidebar.gzRemoveBadge')}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1.5">
                                  <div>
                                    <span className={`text-[10px] block mb-0.5 ${textMuted}`}>
                                      {t('sidebar.gzLineNum')}
                                    </span>
                                    <input
                                      type="text"
                                      value={badge.line}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateGzBadges(
                                          activeGzBadges.map((b, i) =>
                                            i === idx ? { ...b, line: val } : b
                                          )
                                        );
                                      }}
                                      maxLength={8}
                                      className={`w-full px-2 py-1 text-center font-mono font-semibold text-xs rounded border focus:outline-none ${inputCls}`}
                                      placeholder="1"
                                    />
                                  </div>
                                  <div>
                                    <span className={`text-[10px] block mb-0.5 ${textMuted}`}>
                                      {t('sidebar.gzStationNum')}
                                    </span>
                                    <input
                                      type="text"
                                      value={badge.number}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateGzBadges(
                                          activeGzBadges.map((b, i) =>
                                            i === idx ? { ...b, number: val } : b
                                          )
                                        );
                                      }}
                                      maxLength={8}
                                      className={`w-full px-2 py-1 text-center font-mono font-semibold text-xs rounded border focus:outline-none ${inputCls}`}
                                      placeholder="01"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Label Position: 8 directions / Free drag */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className={`font-medium ${textMuted}`}>{t('sidebar.labelPosTitle')}</label>
                  <span className={`text-[11px] font-mono ${textHeading}`}>
                    {getLabelPosTitle(selectedStation.labelPosition)}
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
                        <span className="text-[10px]">{getLabelPosTitle(pos)}</span>
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
                          <span className="text-[10px]">{getLabelPosTitle('left')}</span>
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
                          title={t('sidebar.labelCustomTip')}
                        >
                          <Move className="w-3.5 h-3.5 mb-0.5" />
                          <span className="text-[10px]">{t('sidebar.labelCustomShort')}</span>
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
                          <span className="text-[10px]">{getLabelPosTitle('right')}</span>
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
                        <span className="text-[10px]">{getLabelPosTitle(pos)}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedStation.labelPosition === 'custom' ? (
                  <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                    <div>
                      <div className="flex justify-between mb-1 font-mono tabular-nums">
                        <span className={textMuted}>{t('sidebar.labelOffsetX')}</span>
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
                        <span className={textMuted}>{t('sidebar.labelOffsetY')}</span>
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
                    {t('sidebar.labelDragHint')}
                  </p>
                )}
              </div>

              {/* Show More Toggle for Station Advanced Controls */}
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
                  curOpacity !== 1 ||
                  (selectedStation.zIndex ?? 0) !== 0;
                const scaleMax = Math.max(4, Math.ceil(curScale + 1));
                const lblScaleMax = Math.max(3.5, Math.ceil(curLabelScale + 1));

                return (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowMoreStation((prev) => !prev)}
                      className={`w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer transition-colors ${
                        isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold text-xs ${textHeading}`}>
                            {showMoreStation ? t('sidebar.showLess') : t('sidebar.showMore')}
                          </span>
                          {isModified && (
                            <span
                              className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${
                                isLight
                                  ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                              }`}
                            >
                              {t('sidebar.customizedBadge')}
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] mt-0.5 truncate ${textMuted}`}>
                          {t('sidebar.moreAdvancedHint')}
                        </div>
                      </div>
                      <span className={textMuted}>
                        {showMoreStation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </button>

                    {showMoreStation && (
                      <div className={`divide-y border-t ${borderCol} ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
                        {/* Exact Coordinates & Batch Apply Style */}
                        <div className="p-4 space-y-2.5">
                          <span className={`font-semibold block ${textHeading}`}>{t('sidebar.coordsPrecision')}</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className={`text-[10px] block mb-1 ${textMuted}`}>X</span>
                              <input
                                type="number"
                                step={1}
                                value={selectedStation.x}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  if (Number.isFinite(v)) {
                                    onUpdateStation({ ...selectedStation, x: Math.round(v) });
                                  }
                                }}
                                className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                              />
                            </div>
                            <div>
                              <span className={`text-[10px] block mb-1 ${textMuted}`}>Y</span>
                              <input
                                type="number"
                                step={1}
                                value={selectedStation.y}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  if (Number.isFinite(v)) {
                                    onUpdateStation({ ...selectedStation, y: Math.round(v) });
                                  }
                                }}
                                className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                              />
                            </div>
                          </div>
                          {onApplyStationStyleToAll && (
                            <button
                              type="button"
                              onClick={() => onApplyStationStyleToAll(selectedStation.stationStyle || 'default')}
                              className={`w-full py-1.5 px-2.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer ${btnInactive}`}
                            >
                              {t('sidebar.applyStationStyleAll')}
                            </button>
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
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${textHeading}`}>{t('sidebar.svgFreeTransform')}</span>
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
                                {t('sidebar.resetAll')}
                              </button>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className={textMuted}>{t('sidebar.iconScale')}</span>
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
                                <span className={textMuted}>{t('sidebar.stretchX')}</span>
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
                                <span className={textMuted}>{t('sidebar.stretchY')}</span>
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
                              <span className={textMuted}>{t('sidebar.iconRotate')}</span>
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
                                <span className={textMuted}>{t('sidebar.labelScale')}</span>
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
                                <span className={textMuted}>{t('sidebar.labelRotate')}</span>
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
                              <span className={textMuted}>{t('sidebar.nodeOpacity')}</span>
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
                            {t('sidebar.transformHint')}
                          </p>
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
                            title={t('sidebar.convertToVirtualTip')}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{t('sidebar.convertToVirtual')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Connected lines summary */}
              <div className="p-4 space-y-2">
                <label className={`block font-medium ${textMuted}`}>{t('sidebar.adjacentLines')}</label>
                {connections.filter(
                  (c) =>
                    c.fromStationId === selectedStation.id ||
                    c.toStationId === selectedStation.id
                ).length === 0 ? (
                  <p className={textMuted}>{t('sidebar.noAdjacentLines')}</p>
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
                          ? `${t('canvas.virtualNode')} (${otherSt.x}, ${otherSt.y})`
                          : otherSt?.name || t('sidebar.unknownStation');

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
                              <span className="truncate">{t('sidebar.toOtherStation', { name: otherName })}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] tabular-nums">
                              {(conn.offset ?? 0) !== 0 && (
                                <span className={textMuted}>
                                  {t('sidebar.offsetBadge', {
                                    val: (conn.offset ?? 0) > 0 ? `+${conn.offset}` : conn.offset ?? 0,
                                  })}
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
            </div>
          )}

          {/* 3. Connection Inspector */}
          {selectedConnection && !selectedStation && (
            <div className={`divide-y text-xs ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitFork className={`w-4 h-4 ${textMuted}`} />
                  <h2 className={`font-semibold text-sm ${textHeading}`}>{t('sidebar.connTitle')}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDeleteConnection(selectedConnection.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    title={t('sidebar.deleteConnTip')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${textMuted}`}
                      title={t('sidebar.closePanelTip')}
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
                    return s?.isVirtual ? `${t('canvas.virtualNode')} (${s.x}, ${s.y})` : (s?.name || t('canvas.pathStart'));
                  })()}
                </span>
                <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${textMuted}`} />
                <span className={`font-medium truncate ${textHeading}`}>
                  {(() => {
                    const s = stations.find((st) => st.id === selectedConnection.toStationId);
                    return s?.isVirtual ? `${t('canvas.virtualNode')} (${s.x}, ${s.y})` : (s?.name || t('canvas.pathEnd'));
                  })()}
                </span>
              </div>

              {/* City Line Segment Style & Stroke Style Selector */}
              {onUpdateConnectionStyle && (() => {
                const curStyle: StrokeStyle = selectedConnection.strokeStyle ?? 'solid';
                const lineCol = selectedConnection.color || '#E11D48';
                const strokePreviewBg = isLight ? '#FFFFFF' : '#18181B';
                const strokeOptions: Array<{
                  id: StrokeStyle;
                  label: string;
                  preview: React.ReactNode;
                }> = [
                  {
                    id: 'solid',
                    label: t('sidebar.styleSolid'),
                    preview: (
                      <svg className="w-9 h-3 shrink-0" viewBox="0 0 36 12">
                        <line x1={2} y1={6} x2={34} y2={6} stroke={lineCol} strokeWidth={4} strokeLinecap="round" />
                      </svg>
                    ),
                  },
                  {
                    id: 'dashed',
                    label: t('sidebar.styleDashed'),
                    preview: (
                      <svg className="w-9 h-3 shrink-0" viewBox="0 0 36 12">
                        <line x1={2} y1={6} x2={34} y2={6} stroke={lineCol} strokeWidth={4} strokeDasharray="7 4" strokeLinecap="round" />
                      </svg>
                    ),
                  },
                  {
                    id: 'dotted',
                    label: t('sidebar.styleDotted'),
                    preview: (
                      <svg className="w-9 h-3 shrink-0" viewBox="0 0 36 12">
                        <line x1={3} y1={6} x2={33} y2={6} stroke={lineCol} strokeWidth={4} strokeDasharray="0.1 6.5" strokeLinecap="round" />
                      </svg>
                    ),
                  },
                  {
                    id: 'double',
                    label: t('sidebar.styleDouble'),
                    preview: (
                      <svg className="w-9 h-3 shrink-0" viewBox="0 0 36 12">
                        <line x1={2} y1={6} x2={34} y2={6} stroke={lineCol} strokeWidth={5} strokeLinecap="round" />
                        <line x1={2} y1={6} x2={34} y2={6} stroke={strokePreviewBg} strokeWidth={1.8} strokeLinecap="round" />
                      </svg>
                    ),
                  },
                  {
                    id: 'beijing_cased',
                    label: t('sidebar.styleBeijingCased'),
                    preview: (
                      <svg className="w-9 h-3 shrink-0" viewBox="0 0 36 12">
                        <line x1={2} y1={6} x2={34} y2={6} stroke={isLight ? '#E4E4E7' : '#09090B'} strokeWidth={7} strokeLinecap="round" />
                        <line x1={2} y1={6} x2={34} y2={6} stroke={lineCol} strokeWidth={4} strokeLinecap="round" />
                      </svg>
                    ),
                  },
                  {
                    id: 'beijing_rail',
                    label: t('sidebar.styleBeijingRail'),
                    preview: (
                      <svg className="w-9 h-3 shrink-0" viewBox="0 0 36 12">
                        <line x1={2} y1={6} x2={34} y2={6} stroke={lineCol} strokeWidth={5.5} strokeLinecap="round" />
                        <line x1={3} y1={6} x2={33} y2={6} stroke={strokePreviewBg} strokeWidth={2.2} strokeDasharray="5 4" />
                      </svg>
                    ),
                  },
                  {
                    id: 'shanghai_metro',
                    label: t('sidebar.styleShanghaiMetro'),
                    preview: (
                      <svg className="w-9 h-3 shrink-0" viewBox="0 0 36 12">
                        <line x1={2} y1={6} x2={34} y2={6} stroke={strokePreviewBg} strokeWidth={6} strokeLinecap="round" />
                        <line x1={2} y1={6} x2={34} y2={6} stroke={lineCol} strokeWidth={4} strokeLinecap="round" />
                      </svg>
                    ),
                  },
                  {
                    id: 'shanghai_maglev',
                    label: t('sidebar.styleShanghaiMaglev'),
                    preview: (
                      <svg className="w-9 h-3 shrink-0" viewBox="0 0 36 12">
                        <line x1={2} y1={6} x2={34} y2={6} stroke={lineCol} strokeWidth={6} strokeLinecap="round" />
                        <line x1={2} y1={6} x2={34} y2={6} stroke={strokePreviewBg} strokeWidth={3} strokeLinecap="round" />
                        <line x1={3} y1={6} x2={33} y2={6} stroke={lineCol} strokeWidth={1} strokeDasharray="3 3" />
                      </svg>
                    ),
                  },
                  {
                    id: 'guangzhou_metro',
                    label: t('sidebar.styleGuangzhouMetro'),
                    preview: (
                      <svg className="w-9 h-3 shrink-0" viewBox="0 0 36 12">
                        <line x1={2} y1={6} x2={34} y2={6} stroke={lineCol} strokeWidth={8} strokeOpacity={0.28} strokeLinecap="round" />
                        <line x1={2} y1={6} x2={34} y2={6} stroke={strokePreviewBg} strokeWidth={5.2} strokeLinecap="round" />
                        <line x1={2} y1={6} x2={34} y2={6} stroke={lineCol} strokeWidth={3.5} strokeLinecap="round" />
                      </svg>
                    ),
                  },
                  {
                    id: 'guangzhou_intercity',
                    label: t('sidebar.styleGuangzhouIntercity'),
                    preview: (
                      <svg className="w-9 h-3 shrink-0" viewBox="0 0 36 12">
                        <line x1={2} y1={6} x2={34} y2={6} stroke={lineCol} strokeWidth={4} strokeDasharray="9 3 2 3" strokeLinecap="round" />
                      </svg>
                    ),
                  },
                ];

                return (
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${textHeading}`}>{t('sidebar.cityLineStyleTitle')}</span>
                      <span className={`text-[10px] font-mono ${textMuted}`}>
                        {strokeOptions.find((o) => o.id === curStyle)?.label || curStyle}
                      </span>
                    </div>

                    {/* Quick City Presets */}
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          { id: 'solid' as StrokeStyle, label: t('sidebar.cityDefault') },
                          { id: 'beijing_cased' as StrokeStyle, label: t('sidebar.cityBeijing') },
                          { id: 'shanghai_metro' as StrokeStyle, label: t('sidebar.cityShanghai') },
                          { id: 'guangzhou_metro' as StrokeStyle, label: t('sidebar.cityGuangzhou') },
                        ]
                      ).map((city) => {
                        const isCityMatch =
                          (city.id === 'solid' && (curStyle === 'solid' || curStyle === 'dashed' || curStyle === 'dotted' || curStyle === 'double')) ||
                          (city.id === 'beijing_cased' && (curStyle === 'beijing_cased' || curStyle === 'beijing_rail')) ||
                          (city.id === 'shanghai_metro' && (curStyle === 'shanghai_metro' || curStyle === 'shanghai_maglev')) ||
                          (city.id === 'guangzhou_metro' && (curStyle === 'guangzhou_metro' || curStyle === 'guangzhou_intercity'));
                        return (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => onUpdateConnectionStyle(selectedConnection.id, { strokeStyle: city.id })}
                            className={`py-1 px-1.5 rounded-md text-[11px] border transition-colors cursor-pointer ${
                              isCityMatch ? btnActive : btnInactive
                            }`}
                          >
                            {city.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* All 10 Line Segment Styles with Live Previews */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {strokeOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            onUpdateConnectionStyle(selectedConnection.id, { strokeStyle: opt.id })
                          }
                          className={`px-2 py-1.5 rounded-md border flex items-center justify-between gap-1.5 text-[11px] transition-colors cursor-pointer ${
                            curStyle === opt.id ? btnActive : btnInactive
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {opt.preview}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

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
                      <span className={`font-semibold ${textHeading}`}>{t('sidebar.connOffsetTitle')}</span>
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
                        placeholder={t('sidebar.connOffsetPlaceholder')}
                        title={t('sidebar.connOffsetTip')}
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
                        {t('sidebar.invert')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateConnectionOffset(selectedConnection.id, 0)}
                        disabled={curOffset === 0}
                        className={`px-2 py-1 rounded-md text-[11px] border transition-colors cursor-pointer disabled:opacity-35 shrink-0 ${btnInactive}`}
                      >
                        {t('sidebar.zero')}
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
                        <span>{t('sidebar.unlimited')}</span>
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
                          <span>{t('sidebar.pairConns', { count: pairConns.length })}</span>
                          <span>{t('sidebar.symmetric')}</span>
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
                            <span>{t('sidebar.addParallel')}</span>
                          </button>
                        )}
                        {pairConns.length >= 2 && onAutoBundleConnections && (
                          <button
                            type="button"
                            onClick={() => onAutoBundleConnections(selectedConnection.id, 8)}
                            className={`flex-1 py-1.5 px-2.5 rounded-md text-[11px] font-medium border flex items-center justify-center transition-colors cursor-pointer ${btnActive}`}
                          >
                            <span>{t('sidebar.autoBundle')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Show More Toggle for Connection Advanced Controls */}
              {(() => {
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
                  curOpacity !== 1 ||
                  (selectedConnection.zIndex ?? 0) !== 0;
                const widthSliderMax = Math.max(36, Math.ceil(curWidth + 12));
                const radiusSliderMax = Math.max(60, Math.ceil(curRadius + 20));
                const sameColorCount = connections.filter(
                  (c) => (c.color || '').toUpperCase() === (selectedConnection.color || '').toUpperCase()
                ).length;

                return (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowMoreConnection((prev) => !prev)}
                      className={`w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer transition-colors ${
                        isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold text-xs ${textHeading}`}>
                            {showMoreConnection ? t('sidebar.showLess') : t('sidebar.showMore')}
                          </span>
                          {isModified && (
                            <span
                              className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${
                                isLight
                                  ? 'bg-zinc-100 border-zinc-200 text-zinc-700'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                              }`}
                            >
                              {t('sidebar.customizedBadge')}
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] mt-0.5 truncate ${textMuted}`}>
                          {t('sidebar.moreLineHint')}
                        </div>
                      </div>
                      <span className={textMuted}>
                        {showMoreConnection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </button>

                    {showMoreConnection && (
                      <div className={`divide-y border-t ${borderCol} ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
                        {/* Batch Apply Line Style */}
                        {(onApplyLineStyleToSameColor || onApplyLineStyleToAll) && (
                          <div className="p-4 space-y-1.5">
                            {onApplyLineStyleToSameColor && (
                              <button
                                type="button"
                                onClick={() => onApplyLineStyleToSameColor(selectedConnection.id)}
                                className={`w-full py-1.5 px-2.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer ${btnInactive}`}
                              >
                                {t('sidebar.applyLineStyleSameColor', { count: sameColorCount })}
                              </button>
                            )}
                            {onApplyLineStyleToAll && (
                              <button
                                type="button"
                                onClick={() => onApplyLineStyleToAll(selectedConnection.id)}
                                className={`w-full py-1.5 px-2.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer ${btnInactive}`}
                              >
                                {t('sidebar.applyLineStyleAll')}
                              </button>
                            )}
                          </div>
                        )}

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

                        {/* SVG Fine Stroke Controls */}
                        {onUpdateConnectionStyle && (
                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold ${textHeading}`}>{t('sidebar.strokeStylingTitle')}</span>
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
                                  {t('sidebar.resetDefault')}
                                </button>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className={textMuted}>{t('sidebar.strokeWidth')}</span>
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
                                <span className={textMuted}>{t('sidebar.cornerRadius')}</span>
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

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className={`text-[10px] block mb-1 ${textMuted}`}>{t('sidebar.lineCap')}</span>
                                <div className="grid grid-cols-3 gap-1">
                                  {(
                                    [
                                      { id: 'round', label: t('sidebar.capRound') },
                                      { id: 'butt', label: t('sidebar.capButt') },
                                      { id: 'square', label: t('sidebar.capSquare') },
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
                                  <span className={textMuted}>{t('sidebar.opacity')}</span>
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
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Line Color Picker */}
              <div className="p-4 space-y-2.5">
                <label className={`block font-medium ${textMuted}`}>{t('sidebar.hexColor')}</label>

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
                    title={t('sidebar.pickColorTip')}
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
                  <span className={`text-[11px] block ${textMuted}`}>{t('sidebar.recentColors')}</span>
                  {recentColors.length === 0 ? (
                    <p className={`text-[11px] ${textMuted}`}>{t('sidebar.noRecentColors')}</p>
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
                <label className={`block font-medium ${textMuted}`}>{t('sidebar.routeStyleTitle')}</label>
                <div className="space-y-1">
                  {routeTypeOptions.map((opt) => {
                    const isCurrent = (selectedConnection.routeType || '135_bend') === opt.type;
                    const tagText =
                      opt.type === '135_bend'
                        ? t('route.135_bend.tag')
                        : opt.type === '90_ortho'
                        ? t('route.90_ortho.tag')
                        : opt.type === '90_rotated'
                        ? t('route.90_rotated.tag')
                        : opt.type === 'straight'
                        ? t('route.straight.tag')
                        : opt.type === 'any_angle'
                        ? t('route.any_angle.tag')
                        : t('route.free_curve.tag');
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
                          {tagText}
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
                    <span className={`font-semibold ${textHeading}`}>{t('sidebar.anyAngleTitle')}</span>
                    <span className={`text-[10px] font-mono ${textMuted}`}>{t('sidebar.anyAngleSnapTip')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CircularAngleDial
                      label={t('sidebar.dialA')}
                      subLabel={(() => {
                        const s = stations.find((st) => st.id === selectedConnection.fromStationId);
                        return s?.isVirtual ? t('sidebar.nodeShort', { x: s.x, y: s.y }) : (s?.name || t('sidebar.stationA'));
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
                      label={t('sidebar.dialB')}
                      subLabel={(() => {
                        const s = stations.find((st) => st.id === selectedConnection.toStationId);
                        return s?.isVirtual ? t('sidebar.nodeShort', { x: s.x, y: s.y }) : (s?.name || t('sidebar.stationB'));
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
                      <span className={`font-medium ${textMuted}`}>{t('sidebar.flipTitle')}</span>
                      <span className={`text-[11px] font-mono ${textHeading}`}>
                        {selectedConnection.isFlipped ? t('sidebar.flippedState') : t('sidebar.normalState')}
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
                      <span>{t('sidebar.flipBtn')}</span>
                    </button>
                  </div>
                )}

              {/* Freehand waypoints note */}
              {selectedConnection.routeType === 'free_curve' && (
                <div className="p-4 space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span className={textHeading}>{t('sidebar.freeWaypointsTitle')}</span>
                    <span className={`font-mono tabular-nums ${textMuted}`}>
                      {t('sidebar.pointsCount', { count: (selectedConnection.waypoints || []).length })}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-normal ${textMuted}`}>
                    {t('sidebar.freeWaypointsDesc')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 4. SVG Image Inspector */}
          {selectedImage && !selectedStation && !selectedConnection && (
            <div className={`divide-y text-xs ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className={`w-4 h-4 ${textMuted}`} />
                  <h2 className={`font-semibold text-sm ${textHeading}`}>{t('sidebar.imageTitle')}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDeleteImage?.(selectedImage.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    title={t('sidebar.deleteImageTip')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${textMuted}`}
                      title={t('sidebar.closePanelTip')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Name & Replace Source */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`font-medium ${textMuted}`}>{t('sidebar.imageName')}</label>
                    {isComposingImageName && (
                      <span className="text-[10px] font-mono text-zinc-400">{t('sidebar.composing')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={imageNameInputRef}
                      type="text"
                      value={draftImageName}
                      onCompositionStart={() => {
                        isComposingImageNameRef.current = true;
                        setIsComposingImageName(true);
                      }}
                      onCompositionEnd={(e) => {
                        isComposingImageNameRef.current = false;
                        setIsComposingImageName(false);
                        const finalVal = e.currentTarget.value;
                        setDraftImageName(finalVal);
                        applyImageNameValue(finalVal, false);
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftImageName(val);
                        if (!isComposingImageNameRef.current && !(e.nativeEvent as InputEvent)?.isComposing) {
                          applyImageNameValue(val, false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (isComposingImageNameRef.current || e.nativeEvent.isComposing) return;
                          e.preventDefault();
                          applyImageNameValue(e.currentTarget.value, true);
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={(e) => {
                        isComposingImageNameRef.current = false;
                        setIsComposingImageName(false);
                        applyImageNameValue(e.currentTarget.value, true);
                      }}
                      className={`flex-1 min-w-0 px-3 py-1.5 rounded-md text-sm border focus:outline-none ${inputCls}`}
                      placeholder={t('sidebar.imageNamePlaceholder')}
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        isComposingImageNameRef.current = false;
                        setIsComposingImageName(false);
                        const val = imageNameInputRef.current?.value ?? draftImageName;
                        setDraftImageName(val);
                        applyImageNameValue(val, true);
                        imageNameInputRef.current?.blur();
                      }}
                      className={`px-2.5 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                        draftImageName !== selectedImage.name ? btnActive : btnInactive
                      }`}
                      title={t('sidebar.confirmImageNameTip')}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('canvas.confirm')}</span>
                    </button>
                  </div>
                </div>

                <div className={`flex items-center justify-between font-mono text-[11px] tabular-nums ${textMuted}`}>
                  <span>{t('sidebar.canvasCoords')}</span>
                  <span className={textHeading}>X: {selectedImage.x}, Y: {selectedImage.y}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => replaceImageInputRef.current?.click()}
                    className={`flex-1 py-1.5 px-2.5 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${btnInactive}`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t('sidebar.replaceLocalImage')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplaceUrlOpen((prev) => !prev);
                      setReplaceUrlError('');
                    }}
                    className={`py-1.5 px-2.5 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      isReplaceUrlOpen ? btnActive : btnInactive
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{t('sidebar.urlBtn')}</span>
                  </button>
                </div>

                {isReplaceUrlOpen && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="url"
                        value={replaceUrlInput}
                        onChange={(e) => {
                          setReplaceUrlInput(e.target.value);
                          if (replaceUrlError) setReplaceUrlError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleReplaceImageUrl();
                          if (e.key === 'Escape') setIsReplaceUrlOpen(false);
                        }}
                        placeholder={t('sidebar.replaceUrlPlaceholder')}
                        className={`flex-1 px-2 py-1 text-xs rounded-md border focus:outline-none ${inputCls}`}
                      />
                      <button
                        type="button"
                        onClick={handleReplaceImageUrl}
                        className={`px-2 py-1 rounded-md text-xs border cursor-pointer shrink-0 ${btnActive}`}
                      >
                        {t('colorModal.apply')}
                      </button>
                    </div>
                    {replaceUrlError && (
                      <p className="text-[11px] text-rose-500">{replaceUrlError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Base Dimensions & Aspect Ratio Lock */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${textHeading}`}>{t('sidebar.baseDimensions')}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateImage?.({
                        ...selectedImage,
                        preserveAspectRatio: selectedImage.preserveAspectRatio === false,
                      })
                    }
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] transition-colors cursor-pointer ${
                      selectedImage.preserveAspectRatio !== false ? btnActive : btnInactive
                    }`}
                  >
                    {selectedImage.preserveAspectRatio !== false ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Unlock className="w-3 h-3" />
                    )}
                    <span>{selectedImage.preserveAspectRatio !== false ? t('sidebar.lockAspect') : t('sidebar.freeStretch')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className={textMuted}>{t('sidebar.width')}</span>
                      <span className="font-mono tabular-nums">{Math.round(selectedImage.width)}</span>
                    </div>
                    <input
                      type="number"
                      min={8}
                      step={1}
                      value={Math.round(selectedImage.width)}
                      onChange={(e) => {
                        const nextW = Math.max(8, Math.round(parseFloat(e.target.value) || 8));
                        if (selectedImage.preserveAspectRatio !== false && selectedImage.width > 0) {
                          const ratio = selectedImage.height / selectedImage.width;
                          onUpdateImage?.({
                            ...selectedImage,
                            width: nextW,
                            height: Math.max(8, Math.round(nextW * ratio)),
                          });
                        } else {
                          onUpdateImage?.({ ...selectedImage, width: nextW });
                        }
                      }}
                      className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className={textMuted}>{t('sidebar.height')}</span>
                      <span className="font-mono tabular-nums">{Math.round(selectedImage.height)}</span>
                    </div>
                    <input
                      type="number"
                      min={8}
                      step={1}
                      value={Math.round(selectedImage.height)}
                      onChange={(e) => {
                        const nextH = Math.max(8, Math.round(parseFloat(e.target.value) || 8));
                        if (selectedImage.preserveAspectRatio !== false && selectedImage.height > 0) {
                          const ratio = selectedImage.width / selectedImage.height;
                          onUpdateImage?.({
                            ...selectedImage,
                            height: nextH,
                            width: Math.max(8, Math.round(nextH * ratio)),
                          });
                        } else {
                          onUpdateImage?.({ ...selectedImage, height: nextH });
                        }
                      }}
                      className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                    />
                  </div>
                </div>
              </div>

              {/* Z-Order */}
              {onUpdateImageZIndex && (
                <div className="p-4">
                  <ZOrderControl
                    value={selectedImage.zIndex ?? -1}
                    onChange={(nextZ) => onUpdateImageZIndex(selectedImage.id, nextZ)}
                    targetType="image"
                    theme={theme}
                  />
                </div>
              )}

              {/* SVG Image Free Transform */}
              {(() => {
                const curScale = selectedImage.scale ?? 1;
                const curScaleX = selectedImage.scaleX ?? 1;
                const curScaleY = selectedImage.scaleY ?? 1;
                const curRot = selectedImage.rotation ?? 0;
                const curOpacity = selectedImage.opacity ?? 1;
                const isModified =
                  curScale !== 1 || curScaleX !== 1 || curScaleY !== 1 || curRot !== 0 || curOpacity !== 1;
                const scaleMax = Math.max(4, Math.ceil(curScale + 1));

                return (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${textHeading}`}>{t('sidebar.svgFreeTransform')}</span>
                      {isModified && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateImage?.({
                              ...selectedImage,
                              scale: 1,
                              scaleX: 1,
                              scaleY: 1,
                              rotation: 0,
                              opacity: 1,
                            })
                          }
                          className={`text-[11px] underline cursor-pointer ${textMuted}`}
                        >
                          {t('sidebar.resetDefault')}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>{t('sidebar.overallScale')}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={0.1}
                            min={0.1}
                            value={curScale}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) {
                                onUpdateImage?.({ ...selectedImage, scale: normalizeSvgScale(v, 0.1) });
                              }
                            }}
                            className={`w-16 px-1.5 py-0.5 text-center font-mono font-semibold text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                          />
                          <span className={`font-mono text-[10px] ${textMuted}`}>×</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={scaleMax}
                        step={0.05}
                        value={Math.min(scaleMax, curScale)}
                        onChange={(e) =>
                          onUpdateImage?.({
                            ...selectedImage,
                            scale: normalizeSvgScale(parseFloat(e.target.value), 0.1),
                          })
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                      <div className="grid grid-cols-5 gap-1">
                        {[0.25, 0.5, 1, 1.5, 2].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => onUpdateImage?.({ ...selectedImage, scale: preset })}
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
                          <span className={textMuted}>{t('sidebar.stretchX')}</span>
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
                              onUpdateImage?.({ ...selectedImage, scaleX: normalizeSvgScale(v, 0.1) });
                            }
                          }}
                          className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={textMuted}>{t('sidebar.stretchY')}</span>
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
                              onUpdateImage?.({ ...selectedImage, scaleY: normalizeSvgScale(v, 0.1) });
                            }
                          }}
                          className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>{t('sidebar.rotationAngle')}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={curRot}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) {
                                onUpdateImage?.({ ...selectedImage, rotation: normalizeSvgAngle(v) });
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
                          onUpdateImage?.({
                            ...selectedImage,
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
                            onClick={() => onUpdateImage?.({ ...selectedImage, rotation: deg })}
                            className={`py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer tabular-nums ${
                              curRot === deg ? btnActive : btnInactive
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className={textMuted}>{t('sidebar.opacity')}</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {Math.round(curOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={1}
                        step={0.05}
                        value={curOpacity}
                        onChange={(e) =>
                          onUpdateImage?.({
                            ...selectedImage,
                            opacity: normalizeOpacity(parseFloat(e.target.value)),
                          })
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 5. SVG Text Inspector */}
          {selectedText && !selectedStation && !selectedConnection && !selectedImage && (
            <div className={`divide-y text-xs ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className={`w-4 h-4 ${textMuted}`} />
                  <h2 className={`font-semibold text-sm ${textHeading}`}>{t('sidebar.textTitle')}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDeleteText?.(selectedText.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    title={t('sidebar.deleteTextTip')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${textMuted}`}
                      title={t('sidebar.closePanelTip')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content & Position */}
              <div className="p-4 space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`font-medium ${textMuted}`}>{t('sidebar.textContent')}</label>
                    {isComposingTextContent && (
                      <span className="text-[10px] font-mono text-zinc-400">{t('sidebar.composing')}</span>
                    )}
                  </div>
                  <textarea
                    ref={textContentRef}
                    rows={3}
                    value={draftTextContent}
                    onCompositionStart={() => {
                      isComposingTextContentRef.current = true;
                      setIsComposingTextContent(true);
                    }}
                    onCompositionEnd={(e) => {
                      isComposingTextContentRef.current = false;
                      setIsComposingTextContent(false);
                      const finalVal = e.currentTarget.value;
                      setDraftTextContent(finalVal);
                      applyTextContentValue(finalVal, false);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftTextContent(val);
                      if (!isComposingTextContentRef.current && !(e.nativeEvent as InputEvent)?.isComposing) {
                        applyTextContentValue(val, false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        if (isComposingTextContentRef.current || e.nativeEvent.isComposing) return;
                        e.preventDefault();
                        applyTextContentValue(e.currentTarget.value, true);
                        e.currentTarget.blur();
                      }
                    }}
                    onBlur={(e) => {
                      isComposingTextContentRef.current = false;
                      setIsComposingTextContent(false);
                      applyTextContentValue(e.currentTarget.value, true);
                    }}
                    className={`w-full px-3 py-2 rounded-md text-sm border focus:outline-none resize-y ${inputCls}`}
                    placeholder={t('sidebar.textPlaceholder')}
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className={`text-[10px] ${textMuted}`}>{t('sidebar.textSaveHint')}</span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        isComposingTextContentRef.current = false;
                        setIsComposingTextContent(false);
                        const val = textContentRef.current?.value ?? draftTextContent;
                        setDraftTextContent(val);
                        applyTextContentValue(val, true);
                        textContentRef.current?.blur();
                      }}
                      className={`px-2.5 py-1 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors ${
                        draftTextContent !== selectedText.content ? btnActive : btnInactive
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{t('canvas.confirm')}</span>
                    </button>
                  </div>
                </div>
                <div className={`flex items-center justify-between font-mono text-[11px] tabular-nums ${textMuted}`}>
                  <span>{t('sidebar.canvasCoords')}</span>
                  <span className={textHeading}>X: {selectedText.x}, Y: {selectedText.y}</span>
                </div>
              </div>

              {/* Typography Controls */}
              {(() => {
                const curSize = normalizeFontSize(selectedText.fontSize);
                const sizeMax = Math.max(72, curSize + 24);
                const curWeight = selectedText.fontWeight || 'semibold';
                const curAnchor = selectedText.textAnchor || 'middle';
                const curSpacing = selectedText.letterSpacing ?? 0;
                const curHalo = selectedText.hasHalo !== false;

                return (
                  <div className="p-4 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>{t('sidebar.fontSize')}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateText?.({
                                ...selectedText,
                                fontSize: normalizeFontSize(curSize - 2),
                              })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${btnInactive}`}
                          >
                            -2
                          </button>
                          <input
                            type="number"
                            min={4}
                            step={1}
                            value={curSize}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) {
                                onUpdateText?.({
                                  ...selectedText,
                                  fontSize: normalizeFontSize(v),
                                });
                              }
                            }}
                            className={`w-14 px-1.5 py-0.5 text-center font-mono font-semibold text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateText?.({
                                ...selectedText,
                                fontSize: normalizeFontSize(curSize + 2),
                              })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${btnInactive}`}
                          >
                            +2
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={8}
                        max={sizeMax}
                        step={1}
                        value={curSize}
                        onChange={(e) =>
                          onUpdateText?.({
                            ...selectedText,
                            fontSize: normalizeFontSize(parseFloat(e.target.value)),
                          })
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                      <div className="grid grid-cols-6 gap-1">
                        {[12, 16, 20, 28, 36, 48].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => onUpdateText?.({ ...selectedText, fontSize: sz })}
                            className={`py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer tabular-nums ${
                              curSize === sz ? btnActive : btnInactive
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className={`text-[11px] block mb-1.5 ${textMuted}`}>{t('sidebar.fontWeight')}</span>
                      <div className="grid grid-cols-4 gap-1">
                        {(
                          [
                            { id: 'normal', label: t('sidebar.weightNormal') },
                            { id: 'medium', label: t('sidebar.weightMedium') },
                            { id: 'semibold', label: t('sidebar.weightSemibold') },
                            { id: 'bold', label: t('sidebar.weightBold') },
                          ] as const
                        ).map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => onUpdateText?.({ ...selectedText, fontWeight: w.id })}
                            className={`py-1 rounded-md text-[11px] border transition-colors cursor-pointer ${
                              curWeight === w.id ? btnActive : btnInactive
                            }`}
                          >
                            {w.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className={`text-[11px] block mb-1.5 ${textMuted}`}>{t('sidebar.textAlign')}</span>
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            { id: 'start', label: t('sidebar.alignLeft'), Icon: AlignLeft },
                            { id: 'middle', label: t('sidebar.alignCenter'), Icon: AlignCenter },
                            { id: 'end', label: t('sidebar.alignRight'), Icon: AlignRight },
                          ] as const
                        ).map(({ id, label, Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => onUpdateText?.({ ...selectedText, textAnchor: id })}
                            className={`py-1.5 px-2 rounded-md text-[11px] border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                              curAnchor === id ? btnActive : btnInactive
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>{t('sidebar.letterSpacing')}</span>
                        <input
                          type="number"
                          step={0.5}
                          value={curSpacing}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) {
                              onUpdateText?.({
                                ...selectedText,
                                letterSpacing: Math.round(v * 2) / 2,
                              });
                            }
                          }}
                          className={`w-14 px-1.5 py-0.5 text-center font-mono font-semibold text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                        />
                      </div>
                      <input
                        type="range"
                        min={-2}
                        max={20}
                        step={0.5}
                        value={Math.max(-2, Math.min(20, curSpacing))}
                        onChange={(e) =>
                          onUpdateText?.({
                            ...selectedText,
                            letterSpacing: parseFloat(e.target.value),
                          })
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className={`font-medium ${textHeading}`}>{t('sidebar.textHalo')}</div>
                        <div className={`text-[10px] ${textMuted}`}>{t('sidebar.textHaloDesc')}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpdateText?.({ ...selectedText, hasHalo: !curHalo })}
                        className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors cursor-pointer ${
                          curHalo ? btnActive : btnInactive
                        }`}
                      >
                        {curHalo ? t('sidebar.enabled') : t('sidebar.disabled')}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Text Color Picker */}
              <div className="p-4 space-y-2.5">
                <label className={`block font-medium ${textMuted}`}>{t('sidebar.textColor')}</label>
                <div className={`flex items-center gap-2 p-1.5 rounded-md border ${surfaceSubtle}`}>
                  <input
                    type="color"
                    value={selectedText.color || (isLight ? '#18181B' : '#F4F4F5')}
                    onChange={(e) => {
                      const newCol = e.target.value.toUpperCase();
                      setTextHexInput(newCol);
                      onUpdateText?.({ ...selectedText, color: newCol });
                    }}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                    title={t('sidebar.pickTextColorTip')}
                  />
                  <div className="flex items-center gap-1 flex-1">
                    <Hash className={`w-3.5 h-3.5 ${textMuted}`} />
                    <input
                      type="text"
                      value={textHexInput}
                      onChange={handleTextHexChange}
                      maxLength={7}
                      className={`bg-transparent font-mono uppercase font-semibold focus:outline-none w-full text-xs ${textHeading}`}
                      placeholder="#18181B"
                    />
                  </div>
                </div>

                {recentColors.length > 0 && (
                  <div className="grid grid-cols-5 gap-1.5">
                    {recentColors.slice(0, 15).map((color, idx) => (
                      <button
                        key={`txt-col-${color}-${idx}`}
                        type="button"
                        onClick={() => {
                          setTextHexInput(color);
                          onUpdateText?.({ ...selectedText, color });
                        }}
                        className="w-full h-5 rounded hover:scale-105 transition-transform border border-black/20 cursor-pointer"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Z-Order */}
              {onUpdateTextZIndex && (
                <div className="p-4">
                  <ZOrderControl
                    value={selectedText.zIndex ?? 1}
                    onChange={(nextZ) => onUpdateTextZIndex(selectedText.id, nextZ)}
                    targetType="text"
                    theme={theme}
                  />
                </div>
              )}

              {/* SVG Text Free Transform */}
              {(() => {
                const curScale = selectedText.scale ?? 1;
                const curScaleX = selectedText.scaleX ?? 1;
                const curScaleY = selectedText.scaleY ?? 1;
                const curRot = selectedText.rotation ?? 0;
                const curOpacity = selectedText.opacity ?? 1;
                const isModified =
                  curScale !== 1 || curScaleX !== 1 || curScaleY !== 1 || curRot !== 0 || curOpacity !== 1;
                const scaleMax = Math.max(4, Math.ceil(curScale + 1));

                return (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${textHeading}`}>{t('sidebar.svgFreeTransform')}</span>
                      {isModified && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateText?.({
                              ...selectedText,
                              scale: 1,
                              scaleX: 1,
                              scaleY: 1,
                              rotation: 0,
                              opacity: 1,
                            })
                          }
                          className={`text-[11px] underline cursor-pointer ${textMuted}`}
                        >
                          {t('sidebar.resetDefault')}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>{t('sidebar.overallScale')}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={0.1}
                            min={0.1}
                            value={curScale}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) {
                                onUpdateText?.({ ...selectedText, scale: normalizeSvgScale(v, 0.1) });
                              }
                            }}
                            className={`w-16 px-1.5 py-0.5 text-center font-mono font-semibold text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                          />
                          <span className={`font-mono text-[10px] ${textMuted}`}>×</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={scaleMax}
                        step={0.05}
                        value={Math.min(scaleMax, curScale)}
                        onChange={(e) =>
                          onUpdateText?.({
                            ...selectedText,
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
                            onClick={() => onUpdateText?.({ ...selectedText, scale: preset })}
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
                          <span className={textMuted}>{t('sidebar.stretchX')}</span>
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
                              onUpdateText?.({ ...selectedText, scaleX: normalizeSvgScale(v, 0.1) });
                            }
                          }}
                          className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className={textMuted}>{t('sidebar.stretchY')}</span>
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
                              onUpdateText?.({ ...selectedText, scaleY: normalizeSvgScale(v, 0.1) });
                            }
                          }}
                          className={`w-full px-2 py-1 text-center font-mono text-[11px] rounded border focus:outline-none tabular-nums ${inputCls}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={textMuted}>{t('sidebar.rotationAngle')}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={curRot}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (Number.isFinite(v)) {
                                onUpdateText?.({ ...selectedText, rotation: normalizeSvgAngle(v) });
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
                          onUpdateText?.({
                            ...selectedText,
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
                            onClick={() => onUpdateText?.({ ...selectedText, rotation: deg })}
                            className={`py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer tabular-nums ${
                              curRot === deg ? btnActive : btnInactive
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className={textMuted}>{t('sidebar.opacity')}</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {Math.round(curOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={1}
                        step={0.05}
                        value={curOpacity}
                        onChange={(e) =>
                          onUpdateText?.({
                            ...selectedText,
                            opacity: normalizeOpacity(parseFloat(e.target.value)),
                          })
                        }
                        className="w-full h-1.5 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Default State: Overview & Quick Directory */}
          {!selectedStation && !selectedConnection && !selectedImage && !selectedText && (
            <div className={`divide-y text-xs leading-relaxed ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
              {/* City Metro Style Presets (Standard / Beijing / Shanghai / Guangzhou) */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className={`font-semibold text-xs ${textHeading}`}>{t('sidebar.cityPresetTitle')}</h2>
                    <p className={`text-[10px] mt-0.5 ${textMuted}`}>{t('sidebar.cityPresetSubtitle')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      {
                        id: 'default' as StationStyle,
                        label: t('sidebar.cityDefault'),
                        desc: t('sidebar.cityDefaultDesc'),
                        preview: (
                          <svg className="w-16 h-6" viewBox="0 0 64 24">
                            <line x1={6} y1={12} x2={58} y2={12} stroke="#E11D48" strokeWidth={4} strokeLinecap="round" />
                            <circle cx={20} cy={12} r={5} fill="#ffffff" stroke="#0f172a" strokeWidth={2} />
                            <circle cx={44} cy={12} r={6.5} fill="#ffffff" stroke="#0f172a" strokeWidth={2.2} />
                            <circle cx={42} cy={12} r={2} fill="#E11D48" />
                            <circle cx={46} cy={12} r={2} fill="#2563EB" />
                          </svg>
                        ),
                      },
                      {
                        id: 'beijing' as StationStyle,
                        label: t('sidebar.cityBeijing'),
                        desc: t('sidebar.cityBeijingDesc'),
                        preview: (
                          <svg className="w-16 h-6" viewBox="0 0 64 24">
                            <line x1={6} y1={12} x2={58} y2={12} stroke={isLight ? '#FFFFFF' : '#09090B'} strokeWidth={6.5} strokeLinecap="round" />
                            <line x1={6} y1={12} x2={58} y2={12} stroke="#E11D48" strokeWidth={4} strokeLinecap="round" />
                            <g transform="translate(19, 12)">
                              <CityStationSymbol variant="beijing_basic" />
                            </g>
                            <g transform="translate(44, 12)">
                              <CityStationSymbol variant="beijing_interchange" />
                            </g>
                          </svg>
                        ),
                      },
                      {
                        id: 'shanghai' as StationStyle,
                        label: t('sidebar.cityShanghai'),
                        desc: t('sidebar.cityShanghaiDesc'),
                        preview: (
                          <svg className="w-16 h-6" viewBox="0 0 64 24">
                            <line x1={6} y1={12} x2={58} y2={12} stroke={isLight ? '#FFFFFF' : '#09090B'} strokeWidth={6} strokeLinecap="round" />
                            <line x1={6} y1={12} x2={58} y2={12} stroke="#2563EB" strokeWidth={4} strokeLinecap="round" />
                            <g transform="translate(19, 12)">
                              <CityStationSymbol variant="shanghai_basic" />
                            </g>
                            <g transform="translate(44, 12)">
                              <CityStationSymbol variant="shanghai_interchange" />
                            </g>
                          </svg>
                        ),
                      },
                      {
                        id: 'guangzhou' as StationStyle,
                        label: t('sidebar.cityGuangzhou'),
                        desc: t('sidebar.cityGuangzhouDesc'),
                        preview: (
                          <svg className="w-16 h-6" viewBox="-32 -12 64 24">
                            <line x1={-28} y1={0} x2={28} y2={0} stroke="#16A34A" strokeWidth={7} strokeOpacity={0.22} strokeLinecap="round" />
                            <line x1={-28} y1={0} x2={28} y2={0} stroke="#16A34A" strokeWidth={3.6} strokeLinecap="round" />
                            <g transform="translate(0, 0) scale(0.75)">
                              <CityStationSymbol variant="guangzhou_interchange" />
                            </g>
                          </svg>
                        ),
                      },
                    ]
                  ).map((city) => {
                    const active = defaultCityPreset === city.id;
                    return (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => onSelectCityPreset?.(city.id)}
                        title={city.desc}
                        className={`p-2 rounded-md border text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          active ? btnActive : btnInactive
                        }`}
                      >
                        {city.preview}
                        <span className="text-[11px] leading-none">{city.label}</span>
                      </button>
                    );
                  })}
                </div>

                {onApplyCityPresetToAll && (stations.length > 0 || connections.length > 0) && (
                  <button
                    type="button"
                    onClick={() => onApplyCityPresetToAll(defaultCityPreset)}
                    className={`w-full py-1.5 px-2.5 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${btnInactive}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('sidebar.applyPresetAll')}</span>
                  </button>
                )}
              </div>

              {(svgImages.length > 0 || svgTexts.length > 0) && (
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${textHeading}`}>
                      {t('sidebar.mediaListTitle', { count: svgImages.length + svgTexts.length })}
                    </span>
                    <span className={`text-[10px] ${textMuted}`}>{t('sidebar.clickSelect')}</span>
                  </div>
                  <div
                    className={`max-h-44 overflow-y-auto divide-y border rounded-lg ${borderCol} ${
                      isLight ? 'divide-zinc-100' : 'divide-zinc-800/70'
                    }`}
                  >
                    {svgImages.map((img) => (
                      <div
                        key={img.id}
                        className={`flex items-center justify-between px-2.5 py-2 transition-colors ${
                          isLight ? 'hover:bg-zinc-50 text-zinc-800' : 'hover:bg-zinc-900/60 text-zinc-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectImage?.(img.id)}
                          className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-xs font-medium truncate">
                            {img.name || t('canvas.defaultImageName')}
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                            Z{(img.zIndex ?? -1) > 0 ? `+${img.zIndex ?? -1}` : img.zIndex ?? -1}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteImage?.(img.id)}
                            className="p-1 text-zinc-400 hover:text-rose-500 rounded cursor-pointer"
                            title={t('sidebar.deleteImgTitle')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {svgTexts.map((txt) => (
                      <div
                        key={txt.id}
                        className={`flex items-center justify-between px-2.5 py-2 transition-colors ${
                          isLight ? 'hover:bg-zinc-50 text-zinc-800' : 'hover:bg-zinc-900/60 text-zinc-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectText?.(txt.id)}
                          className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer"
                        >
                          <Type className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="text-xs font-medium truncate">
                            {txt.content.trim().split('\n')[0] || t('sidebar.blankText')}
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                            Z{(txt.zIndex ?? 1) > 0 ? `+${txt.zIndex ?? 1}` : txt.zIndex ?? 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteText?.(txt.id)}
                            className="p-1 text-zinc-400 hover:text-rose-500 rounded cursor-pointer"
                            title={t('sidebar.deleteTxtTitle')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {stations.length > 0 && (
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${textHeading}`}>
                      {t('sidebar.stationListTitle', { count: stations.length })}
                    </span>
                    <span className={`text-[10px] ${textMuted}`}>{t('sidebar.clickSelect')}</span>
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
                              {st.isVirtual ? `${t('canvas.virtualNode')} (${st.x}, ${st.y})` : st.name}
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

              {/* Show More Toggle in Overview */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreOverview((prev) => !prev)}
                  className={`w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer transition-colors ${
                    isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="min-w-0">
                    <span className={`font-semibold text-xs block ${textHeading}`}>
                      {showMoreOverview ? t('sidebar.showLess') : t('sidebar.showMore')}
                    </span>
                    <span className={`text-[10px] mt-0.5 block truncate ${textMuted}`}>
                      {t('sidebar.moreOverviewHint')}
                    </span>
                  </div>
                  <span className={textMuted}>
                    {showMoreOverview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {showMoreOverview && (
                  <div className={`divide-y border-t ${borderCol} ${isLight ? 'divide-zinc-200' : 'divide-zinc-800'}`}>
                    {/* Quick Guide */}
                    <div className="p-4 space-y-3">
                      <h2 className={`text-xs font-semibold ${textHeading}`}>{t('sidebar.guideTitle')}</h2>
                      <div className={`space-y-2.5 ${textMuted}`}>
                        <div className="flex gap-2.5">
                          <span className="font-mono text-[11px] font-semibold w-4 shrink-0">01</span>
                          <div>
                            <span className={`font-medium ${textHeading}`}>{t('sidebar.guide1Title')}</span> — {t('sidebar.guide1Desc')}
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <span className="font-mono text-[11px] font-semibold w-4 shrink-0">02</span>
                          <div>
                            <span className={`font-medium ${textHeading}`}>{t('sidebar.guide2Title')}</span> — {t('sidebar.guide2Desc')}
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <span className="font-mono text-[11px] font-semibold w-4 shrink-0">03</span>
                          <div>
                            <span className={`font-medium ${textHeading}`}>{t('sidebar.guide3Title')}</span> — {t('sidebar.guide3Desc')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Shortcuts & Stats Callouts */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${textHeading}`}>{t('sidebar.shortcutsTitle')}</span>
                        {onOpenShortcuts && (
                          <button
                            type="button"
                            onClick={onOpenShortcuts}
                            className={`text-[11px] hover:underline cursor-pointer ${textMuted}`}
                          >
                            {t('sidebar.fullList')}
                          </button>
                        )}
                      </div>
                      <div className={`space-y-1 font-mono text-[11px] ${textMuted}`}>
                        <div className="flex justify-between"><span>{t('sidebar.scSelectPan')}</span><span>V / S / H</span></div>
                        <div className="flex justify-between"><span>{t('sidebar.scNodesConnect')}</span><span>N / M / C</span></div>
                        <div className="flex justify-between"><span>{t('sidebar.scZOrder')}</span><span>[ / ]</span></div>
                        <div className="flex justify-between"><span>{t('sidebar.scDeleteEsc')}</span><span>Del / Esc</span></div>
                      </div>

                      <div className="pt-1 space-y-1.5">
                        {onOpenShortcuts && (
                          <button
                            type="button"
                            onClick={onOpenShortcuts}
                            className={`w-full py-1.5 px-2.5 rounded-md text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${btnInactive}`}
                          >
                            <Keyboard className="w-3.5 h-3.5" />
                            <span>{t('sidebar.openFullShortcuts')}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleTabChange('stats')}
                          className={`w-full py-1.5 px-2.5 rounded-md text-xs font-medium border flex items-center justify-between transition-colors cursor-pointer ${btnInactive}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>{t('sidebar.viewNetworkStats')}</span>
                          </div>
                          <span className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
                            {t('sidebar.statsSummary', { lines: connections.length, stations: stations.length })}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </aside>
  );
};
