/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Station, 
  MetroLine, 
  Connection, 
  ToolMode, 
  RouteType, 
  Point,
  ThemeMode,
  EffectiveTheme,
  clampZOrder,
  clampLineOffset,
  CanvasImage,
  CanvasText,
  StationStyle,
  StationVariant,
  StrokeStyle,
} from './types/metro';
import { getCityFromVariant } from './components/CityStationSymbol';
import { DEFAULT_LINES, DEMO_STATIONS, DEMO_CONNECTIONS } from './data/initialData';
import { MetroCanvas } from './components/MetroCanvas';
import { Toolbar } from './components/Toolbar';
import { LeftToolbar } from './components/LeftToolbar';
import { ColorModal } from './components/ColorModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ExportModal } from './components/ExportModal';
import { Sidebar } from './components/Sidebar';
import {
  TrainTrack,
  Download,
  Sun,
  Moon,
  Clock,
  Save,
} from 'lucide-react';
import { ShortestPathResult } from './utils/pathfinding';
import { useI18n } from './i18n/I18nContext';
import { LanguageSelector } from './components/LanguageSelector';

const STORAGE_KEY = 'metro_network_data';

interface HistorySnapshot {
  stations: Station[];
  connections: Connection[];
  svgImages?: CanvasImage[];
  svgTexts?: CanvasText[];
}

interface SavedNetworkData {
  version: string;
  savedAt: string;
  stations: Station[];
  connections: Connection[];
  svgImages?: CanvasImage[];
  svgTexts?: CanvasText[];
}

const loadSavedNetwork = (): SavedNetworkData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.stations) && Array.isArray(parsed.connections)) {
      return parsed as SavedNetworkData;
    }
  } catch (err) {
    console.error('Failed to parse saved network from localStorage:', err);
  }
  return null;
};

export default function App() {
  const { t } = useI18n();
  const initialSavedRef = useRef<SavedNetworkData | null>(loadSavedNetwork());
  const [stations, setStations] = useState<Station[]>(() => initialSavedRef.current?.stations ?? DEMO_STATIONS);
  const [lines] = useState<MetroLine[]>(DEFAULT_LINES);
  const [connections, setConnections] = useState<Connection[]>(() => initialSavedRef.current?.connections ?? DEMO_CONNECTIONS);
  const [svgImages, setSvgImages] = useState<CanvasImage[]>(() => initialSavedRef.current?.svgImages ?? []);
  const [svgTexts, setSvgTexts] = useState<CanvasText[]>(() => initialSavedRef.current?.svgTexts ?? []);

  // Auto-save state & references
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(() =>
    initialSavedRef.current?.savedAt ? new Date(initialSavedRef.current.savedAt) : null
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const hasUnsavedChangesRef = useRef<boolean>(false);
  const currentNetworkRef = useRef<{
    stations: Station[];
    connections: Connection[];
    svgImages: CanvasImage[];
    svgTexts: CanvasText[];
  }>({
    stations,
    connections,
    svgImages,
    svgTexts,
  });

  // Keep network ref synchronized with latest state
  useEffect(() => {
    currentNetworkRef.current = { stations, connections, svgImages, svgTexts };
  }, [stations, connections, svgImages, svgTexts]);

  // History Stack for Undo/Redo operations
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  // Function to push current network state to past history before an operation
  const pushHistory = useCallback(() => {
    setPast((prev) => {
      const MAX_HISTORY = 60;
      const snapshot: HistorySnapshot = {
        stations: currentNetworkRef.current.stations,
        connections: currentNetworkRef.current.connections,
        svgImages: currentNetworkRef.current.svgImages,
        svgTexts: currentNetworkRef.current.svgTexts,
      };
      return [...prev.slice(-MAX_HISTORY + 1), snapshot];
    });
    setFuture([]); // New action invalidates redo history
  }, []);

  // Undo (復原)
  const handleUndo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;

      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);

      // Save current network state into future stack for Redo
      setFuture((prevFuture) => [
        {
          stations: currentNetworkRef.current.stations,
          connections: currentNetworkRef.current.connections,
          svgImages: currentNetworkRef.current.svgImages,
          svgTexts: currentNetworkRef.current.svgTexts,
        },
        ...prevFuture,
      ]);

      setStations(previous.stations);
      setConnections(previous.connections);
      setSvgImages(previous.svgImages ?? []);
      setSvgTexts(previous.svgTexts ?? []);
      setSelectedStationId(null);
      setSelectedStationIds([]);
      setSelectedConnectionId(null);
      setSelectedImageId(null);
      setSelectedTextId(null);
      hasUnsavedChangesRef.current = true;

      return newPast;
    });
  }, []);

  // Redo (重做)
  const handleRedo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;

      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      // Save current network state into past stack for Undo
      setPast((prevPast) => {
        const MAX_HISTORY = 60;
        return [
          ...prevPast.slice(-MAX_HISTORY + 1),
          {
            stations: currentNetworkRef.current.stations,
            connections: currentNetworkRef.current.connections,
            svgImages: currentNetworkRef.current.svgImages,
            svgTexts: currentNetworkRef.current.svgTexts,
          },
        ];
      });

      setStations(next.stations);
      setConnections(next.connections);
      setSvgImages(next.svgImages ?? []);
      setSvgTexts(next.svgTexts ?? []);
      setSelectedStationId(null);
      setSelectedStationIds([]);
      setSelectedConnectionId(null);
      setSelectedImageId(null);
      setSelectedTextId(null);
      hasUnsavedChangesRef.current = true;

      return newFuture;
    });
  }, []);

  // Keyboard Shortcuts: Ctrl+Z (Undo) and Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleUndoRedoKeys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;

      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleUndoRedoKeys);
    return () => {
      window.removeEventListener('keydown', handleUndoRedoKeys);
    };
  }, [handleUndo, handleRedo]);

  // Execute save to localStorage
  const saveToLocalStorage = () => {
    try {
      setIsSaving(true);
      const payload: SavedNetworkData = {
        version: '1.0',
        savedAt: new Date().toISOString(),
        stations: currentNetworkRef.current.stations,
        connections: currentNetworkRef.current.connections,
        svgImages: currentNetworkRef.current.svgImages,
        svgTexts: currentNetworkRef.current.svgTexts,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      hasUnsavedChangesRef.current = false;
      setLastSavedTime(new Date());
      setTimeout(() => setIsSaving(false), 600);
    } catch (err) {
      console.error('Auto-save to localStorage failed:', err);
      setIsSaving(false);
    }
  };

  // 1. Listen to stations, connections, svgImages, svgTexts changes via useEffect
  useEffect(() => {
    hasUnsavedChangesRef.current = true;
  }, [stations, connections, svgImages, svgTexts]);

  // 2. Periodic 30-second auto-save timer + beforeunload hook to protect against unexpected tab/browser closing
  useEffect(() => {
    const timer = setInterval(() => {
      if (hasUnsavedChangesRef.current) {
        saveToLocalStorage();
      }
    }, 30000); // 30 秒自動保存週期

    const handleBeforeUnload = () => {
      if (hasUnsavedChangesRef.current) {
        try {
          const payload: SavedNetworkData = {
            version: '1.0',
            savedAt: new Date().toISOString(),
            stations: currentNetworkRef.current.stations,
            connections: currentNetworkRef.current.connections,
            svgImages: currentNetworkRef.current.svgImages,
            svgTexts: currentNetworkRef.current.svgTexts,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Theme mode: 'dark' | 'light' | 'auto'
  // Auto mode logic: 06:00 to 18:00 (上午6點至下午6點) is light mode (白色模式), other times are dark mode (黑夜模式)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('metro_theme_mode');
    if (saved === 'dark' || saved === 'light' || saved === 'auto') {
      return saved;
    }
    return 'auto';
  });

  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Periodically check local time (every 30s) so auto theme updates seamlessly across 06:00 and 18:00
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem('metro_theme_mode', mode);
  };

  // Determine effective theme
  const getAutoEffectiveTheme = (date: Date): EffectiveTheme => {
    const hours = date.getHours();
    return hours >= 6 && hours < 18 ? 'light' : 'dark';
  };

  const effectiveTheme: EffectiveTheme =
    themeMode === 'auto' ? getAutoEffectiveTheme(currentTime) : themeMode;

  const isLight = effectiveTheme === 'light';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !isLight);
  }, [isLight]);

  // Active color & Recent 20 colors history (initially empty until colors are used)
  const [activeColor, setActiveColor] = useState<string>('#E11D48');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [isColorModalOpen, setIsColorModalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportModalFormat, setExportModalFormat] = useState<'pdf' | 'png'>('pdf');
  const [shortestPathResult, setShortestPathResult] = useState<ShortestPathResult | null>(null);
  const [showPathPreview, setShowPathPreview] = useState<boolean>(true);

  // Global shortcut ? or F1 to open/close shortcuts modal
  useEffect(() => {
    const handleGlobalShortcutsKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/') || e.key === 'F1') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcutsKey);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcutsKey);
    };
  }, []);

  // Active Route Type among the 5 styles
  const [activeRouteType, setActiveRouteType] = useState<RouteType>('135_bend');
  const [defaultStationStyle, setDefaultStationStyle] = useState<StationStyle>(() => {
    const saved = localStorage.getItem('metro_default_station_style');
    if (saved === 'default' || saved === 'beijing' || saved === 'shanghai' || saved === 'guangzhou') {
      return saved;
    }
    return 'default';
  });
  const [defaultStationVariant, setDefaultStationVariant] = useState<StationVariant>(() => {
    const saved = localStorage.getItem('metro_default_station_variant') as StationVariant | null;
    if (
      saved === 'auto' ||
      saved === 'shanghai_basic' ||
      saved === 'shanghai_2020' ||
      saved === 'shanghai_interchange' ||
      saved === 'shanghai_suburban' ||
      saved === 'guangzhou_basic' ||
      saved === 'guangzhou_interchange' ||
      saved === 'guangzhou_interchange_2024' ||
      saved === 'beijing_basic' ||
      saved === 'beijing_interchange'
    ) {
      return saved;
    }
    return 'auto';
  });
  const [defaultStrokeStyle, setDefaultStrokeStyle] = useState<StrokeStyle>(() => {
    const saved = localStorage.getItem('metro_default_stroke_style') as StrokeStyle | null;
    if (
      saved === 'solid' ||
      saved === 'dashed' ||
      saved === 'dotted' ||
      saved === 'double' ||
      saved === 'beijing_cased' ||
      saved === 'beijing_rail' ||
      saved === 'shanghai_metro' ||
      saved === 'shanghai_maglev' ||
      saved === 'guangzhou_metro' ||
      saved === 'guangzhou_intercity'
    ) {
      return saved;
    }
    return 'solid';
  });

  // Tool Mode controlled by the Left Toolbar
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'inspector' | 'stats' | 'routing'>('inspector');

  const viewportCenterRef = useRef<Point>({ x: 300, y: 220 });
  const handleViewportCenterChange = useCallback((center: Point) => {
    viewportCenterRef.current = center;
  }, []);

  const [gridSnap, setGridSnap] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(20);
  const [nodeAlign, setNodeAlign] = useState<boolean>(false);

  // Color selection & history management (maintains top 20 recent colors)
  const handleSelectColor = (newColor: string) => {
    const formatted = newColor.toUpperCase();
    setActiveColor(formatted);
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c.toUpperCase() !== formatted);
      return [formatted, ...filtered].slice(0, 20);
    });
  };

  // Station Handlers
  const handleAddStation = (station: Station) => {
    pushHistory();
    setStations((prev) => [...prev, station]);
  };

  const handleUpdateStationPos = (id: string, x: number, y: number) => {
    setStations((prev) =>
      prev.map((st) => (st.id === id ? { ...st, x, y } : st))
    );
  };

  const handleUpdateStationsPos = (updates: { id: string; x: number; y: number }[]) => {
    if (updates.length === 0) return;
    const map = new Map(updates.map((u) => [u.id, u]));
    setStations((prev) =>
      prev.map((st) => {
        const u = map.get(st.id);
        return u ? { ...st, x: u.x, y: u.y } : st;
      })
    );
  };

  const handleUpdateStation = (updated: Station) => {
    pushHistory();
    const cloned: Station = { ...updated };
    setStations((prev) =>
      prev.map((st) => (st.id === cloned.id ? cloned : st))
    );
  };

  const handleUpdateStationLive = (updated: Station) => {
    const cloned: Station = { ...updated };
    setStations((prev) =>
      prev.map((st) => (st.id === cloned.id ? cloned : st))
    );
  };

  const handleBatchUpdateStations = (updates: Array<{ id: string } & Partial<Station>>) => {
    if (updates.length === 0) return;
    const map = new Map(updates.map((u) => [u.id, u]));
    setStations((prev) =>
      prev.map((st) => {
        const u = map.get(st.id);
        return u ? { ...st, ...u } : st;
      })
    );
  };

  const handleDeleteStation = (id: string) => {
    pushHistory();
    setStations((prev) => prev.filter((st) => st.id !== id));
    setConnections((prev) =>
      prev.filter((c) => c.fromStationId !== id && c.toStationId !== id)
    );
    if (selectedStationId === id) setSelectedStationId(null);
    setSelectedStationIds((prev) => prev.filter((sId) => sId !== id));
  };

  const handleBatchDeleteStations = (ids: string[]) => {
    if (ids.length === 0) return;
    pushHistory();
    const idSet = new Set(ids);
    setStations((prev) => prev.filter((st) => !idSet.has(st.id)));
    setConnections((prev) =>
      prev.filter((c) => !idSet.has(c.fromStationId) && !idSet.has(c.toStationId))
    );
    setSelectedStationIds([]);
    setSelectedStationId(null);
  };

  // Check and auto-convert stations to multi-line interchange when 2+ distinct colors intersect (支援無限制多線換乘)
  const autoConvertInterchanges = (updatedConns: Connection[]) => {
    setStations((prevStations) =>
      prevStations.map((st) => {
        if (st.isVirtual) return st;
        const stConns = updatedConns.filter(
          (c) => c.fromStationId === st.id || c.toStationId === st.id
        );
        const distinctColors = new Set(stConns.map((c) => c.color.toUpperCase()));
        if (distinctColors.size >= 2) {
          if (st.type !== 'interchange') {
            return { ...st, type: 'interchange' };
          }
        }
        return st;
      })
    );
  };

  // Connection Handlers (支援同一站點對之間建立多條平行並線並自動計算偏移)
  const handleAddConnection = (
    fromId: string, 
    toId: string, 
    color: string, 
    routeType: RouteType = activeRouteType,
    waypoints?: Point[]
  ) => {
    if (fromId === toId) return;

    pushHistory();

    const pairConns = connections.filter(
      (c) =>
        (c.fromStationId === fromId && c.toStationId === toId) ||
        (c.fromStationId === toId && c.toStationId === fromId)
    );

    const canonFrom = fromId < toId ? fromId : toId;
    const isNewCanon = fromId === canonFrom;

    let newOffset = 0;
    let updatedExisting = connections;

    if (pairConns.length === 1 && Math.abs(pairConns[0].offset ?? 0) < 0.05) {
      // Auto-spread first pair cleanly into -4px and +4px parallel tracks (並線)
      const first = pairConns[0];
      const firstSign = first.fromStationId === canonFrom ? 1 : -1;
      const newSign = isNewCanon ? 1 : -1;
      updatedExisting = connections.map((c) =>
        c.id === first.id ? { ...c, offset: -4 * firstSign } : c
      );
      newOffset = 4 * newSign;
    } else if (pairConns.length >= 1) {
      // Pick next unused canonical slot (unlimited alternating multiples of 4px)
      const usedCanonOffsets = pairConns.map((c) => {
        const sign = c.fromStationId === canonFrom ? 1 : -1;
        return (c.offset ?? 0) * sign;
      });
      let freeSlot = 0;
      for (let step = 0; step <= pairConns.length + 2; step++) {
        const candidates = step === 0 ? [0] : [step * 4, -step * 4];
        const found = candidates.find((slot) =>
          usedCanonOffsets.every((used) => Math.abs(used - slot) >= 3.5)
        );
        if (found !== undefined) {
          freeSlot = found;
          break;
        }
      }
      const newSign = isNewCanon ? 1 : -1;
      newOffset = clampLineOffset(freeSlot * newSign);
    }

    const newConn: Connection = {
      id: `conn-${Date.now()}`,
      fromStationId: fromId,
      toStationId: toId,
      color,
      routeType: pairConns.length > 0 && !waypoints ? (pairConns[0].routeType || routeType) : routeType,
      isFlipped:
        pairConns.length > 0
          ? pairConns[0].fromStationId === fromId
            ? pairConns[0].isFlipped
            : !pairConns[0].isFlipped
          : undefined,
      waypoints,
      offset: newOffset,
      strokeStyle: defaultStrokeStyle,
    };

    const nextConnections = [...updatedExisting, newConn];
    setConnections(nextConnections);
    setSelectedConnectionId(newConn.id);
    handleSelectColor(color);

    // Auto-convert any node with 2+ distinct colors into an interchange station
    autoConvertInterchanges(nextConnections);
  };

  const handleUpdateConnectionWaypoints = (connId: string, waypoints: Point[]) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, waypoints } : c))
    );
  };

  const handleUpdateConnectionColor = (connId: string, newColor: string) => {
    pushHistory();
    const formatted = newColor.toUpperCase();
    const nextConnections = connections.map((c) =>
      c.id === connId ? { ...c, color: formatted } : c
    );
    setConnections(nextConnections);
    handleSelectColor(formatted);

    // Auto-convert when color change creates an intersection of 2+ colors
    autoConvertInterchanges(nextConnections);
  };

  const handleUpdateConnectionRouteType = (connId: string, routeType: RouteType) => {
    pushHistory();
    setConnections((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, routeType } : c))
    );
  };

  const handleToggleConnectionFlip = (connId: string) => {
    pushHistory();
    setConnections((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, isFlipped: !c.isFlipped } : c))
    );
  };

  const handleUpdateConnectionAngles = (connId: string, angleA?: number, angleB?: number) => {
    pushHistory();
    setConnections((prev) =>
      prev.map((c) =>
        c.id === connId
          ? {
              ...c,
              ...(angleA !== undefined ? { angleA } : {}),
              ...(angleB !== undefined ? { angleB } : {}),
            }
          : c
      )
    );
  };

  const handleUpdateConnectionZIndex = (connId: string, zIndex: number) => {
    const clamped = clampZOrder(zIndex);
    const current = connections.find((c) => c.id === connId);
    if (!current || (current.zIndex ?? 0) === clamped) return;
    pushHistory();
    setConnections((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, zIndex: clamped } : c))
    );
  };

  const handleUpdateConnectionOffset = (connId: string, offset: number) => {
    const clamped = clampLineOffset(offset);
    const current = connections.find((c) => c.id === connId);
    if (!current || (current.offset ?? 0) === clamped) return;
    pushHistory();
    setConnections((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, offset: clamped } : c))
    );
  };

  const handleUpdateConnectionStyle = (connId: string, patch: Partial<Connection>) => {
    pushHistory();
    setConnections((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, ...patch } : c))
    );
  };

  const handleUpdateConnectionStyleLive = (connId: string, patch: Partial<Connection>) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, ...patch } : c))
    );
  };

  const getFlagshipStrokeStyle = (preset: StationStyle): StrokeStyle => {
    if (preset === 'beijing') return 'beijing_cased';
    if (preset === 'shanghai') return 'shanghai_metro';
    if (preset === 'guangzhou') return 'guangzhou_metro';
    return 'solid';
  };

  const handleSelectCityPreset = (preset: StationStyle) => {
    const nextStroke = getFlagshipStrokeStyle(preset);
    setDefaultStationStyle(preset);
    setDefaultStationVariant('auto');
    setDefaultStrokeStyle(nextStroke);
    localStorage.setItem('metro_default_station_style', preset);
    localStorage.setItem('metro_default_station_variant', 'auto');
    localStorage.setItem('metro_default_stroke_style', nextStroke);
  };

  const handleSelectStationVariant = (variant: StationVariant) => {
    setDefaultStationVariant(variant);
    localStorage.setItem('metro_default_station_variant', variant);

    if (variant !== 'auto') {
      const city = getCityFromVariant(variant);
      const nextStroke = getFlagshipStrokeStyle(city);
      setDefaultStationStyle(city);
      setDefaultStrokeStyle(nextStroke);
      localStorage.setItem('metro_default_station_style', city);
      localStorage.setItem('metro_default_stroke_style', nextStroke);
    }

    if (selectedStationId) {
      const target = stations.find((s) => s.id === selectedStationId);
      if (target && !target.isVirtual) {
        const isInterchangeVar =
          variant === 'shanghai_interchange' ||
          variant === 'guangzhou_interchange' ||
          variant === 'guangzhou_interchange_2024' ||
          variant === 'beijing_interchange';
        pushHistory();
        setStations((prev) =>
          prev.map((st) =>
            st.id === selectedStationId
              ? {
                  ...st,
                  stationVariant: variant === 'auto' ? undefined : variant,
                  ...(variant !== 'auto'
                    ? {
                        stationStyle: getCityFromVariant(variant),
                        type: isInterchangeVar ? 'interchange' : 'regular',
                      }
                    : {}),
                }
              : st
          )
        );
      }
    }
  };

  const handleChangeDefaultStrokeStyle = (style: StrokeStyle) => {
    setDefaultStrokeStyle(style);
    localStorage.setItem('metro_default_stroke_style', style);
  };

  const handleApplyCityPresetToAll = (preset: StationStyle) => {
    const nextStroke = getFlagshipStrokeStyle(preset);
    pushHistory();
    setDefaultStationStyle(preset);
    setDefaultStationVariant('auto');
    setDefaultStrokeStyle(nextStroke);
    localStorage.setItem('metro_default_station_style', preset);
    localStorage.setItem('metro_default_station_variant', 'auto');
    localStorage.setItem('metro_default_stroke_style', nextStroke);
    setStations((prev) =>
      prev.map((st) =>
        st.isVirtual ? st : { ...st, stationStyle: preset, stationVariant: undefined }
      )
    );
    setConnections((prev) =>
      prev.map((c) => ({ ...c, strokeStyle: nextStroke }))
    );
  };

  const handleApplyStationStyleToAll = (style: StationStyle) => {
    pushHistory();
    setDefaultStationStyle(style);
    setDefaultStationVariant('auto');
    localStorage.setItem('metro_default_station_style', style);
    localStorage.setItem('metro_default_station_variant', 'auto');
    setStations((prev) =>
      prev.map((st) =>
        st.isVirtual ? st : { ...st, stationStyle: style, stationVariant: undefined }
      )
    );
  };

  const handleApplyLineStyleToSameColor = (connId: string) => {
    const source = connections.find((c) => c.id === connId);
    if (!source) return;
    const targetColor = (source.color || '').toUpperCase();
    pushHistory();
    setConnections((prev) =>
      prev.map((c) =>
        (c.color || '').toUpperCase() === targetColor
          ? {
              ...c,
              strokeStyle: source.strokeStyle,
              strokeWidth: source.strokeWidth,
              cornerRadius: source.cornerRadius,
              lineCap: source.lineCap,
              opacity: source.opacity,
            }
          : c
      )
    );
  };

  const handleApplyLineStyleToAll = (connId: string) => {
    const source = connections.find((c) => c.id === connId);
    if (!source) return;
    const nextStroke = source.strokeStyle ?? 'solid';
    pushHistory();
    setDefaultStrokeStyle(nextStroke);
    localStorage.setItem('metro_default_stroke_style', nextStroke);
    setConnections((prev) =>
      prev.map((c) => ({
        ...c,
        strokeStyle: source.strokeStyle,
        strokeWidth: source.strokeWidth,
        cornerRadius: source.cornerRadius,
        lineCap: source.lineCap,
        opacity: source.opacity,
      }))
    );
  };

  const handleDuplicateParallelConnection = (connId: string) => {
    const source = connections.find((c) => c.id === connId);
    if (!source) return;

    // Pick activeColor if different from source, otherwise choose a distinct metro palette color
    const PALETTE = ['#2563EB', '#E11D48', '#16A34A', '#EA580C', '#9333EA', '#CA8A04', '#06B6D4'];
    const pairConns = connections.filter(
      (c) =>
        (c.fromStationId === source.fromStationId && c.toStationId === source.toStationId) ||
        (c.fromStationId === source.toStationId && c.toStationId === source.fromStationId)
    );
    const usedColors = new Set(pairConns.map((c) => (c.color || '').toUpperCase()));
    let nextColor = activeColor;
    if (usedColors.has(nextColor.toUpperCase())) {
      nextColor = PALETTE.find((p) => !usedColors.has(p.toUpperCase())) || activeColor;
    }

    handleAddConnection(
      source.fromStationId,
      source.toStationId,
      nextColor,
      source.routeType || '135_bend',
      source.waypoints ? [...source.waypoints] : undefined
    );
  };

  const handleAutoBundleConnections = (connId: string, spacing: number = 8) => {
    const target = connections.find((c) => c.id === connId);
    if (!target) return;

    const a = target.fromStationId;
    const b = target.toStationId;
    const canonFrom = a < b ? a : b;

    const pairConns = connections.filter(
      (c) =>
        (c.fromStationId === a && c.toStationId === b) ||
        (c.fromStationId === b && c.toStationId === a)
    );
    if (pairConns.length < 2) return;

    pushHistory();

    const n = pairConns.length;
    const offsetById = new Map<string, number>();
    pairConns.forEach((c, idx) => {
      const canonSlot = (idx - (n - 1) / 2) * spacing;
      const sign = c.fromStationId === canonFrom ? 1 : -1;
      offsetById.set(c.id, clampLineOffset(canonSlot * sign));
    });

    setConnections((prev) =>
      prev.map((c) => {
        if (!offsetById.has(c.id)) return c;
        // Align routeType & flip direction with the selected reference connection so parallel curves match cleanly
        const sameDir = c.fromStationId === target.fromStationId;
        return {
          ...c,
          offset: offsetById.get(c.id),
          routeType: target.routeType,
          isFlipped: sameDir ? target.isFlipped : !target.isFlipped,
          ...(target.routeType === 'free_curve' && target.waypoints ? { waypoints: [...target.waypoints] } : {}),
        };
      })
    );
  };

  const handleUpdateStationZIndex = (stationId: string, zIndex: number) => {
    const clamped = clampZOrder(zIndex);
    const current = stations.find((s) => s.id === stationId);
    if (!current || (current.zIndex ?? 0) === clamped) return;
    pushHistory();
    setStations((prev) =>
      prev.map((st) => (st.id === stationId ? { ...st, zIndex: clamped } : st))
    );
  };

  const handleBatchUpdateStationsZIndex = (stationIds: string[], delta: number) => {
    if (stationIds.length === 0 || delta === 0) return;
    const idSet = new Set(stationIds);
    pushHistory();
    setStations((prev) =>
      prev.map((st) =>
        idSet.has(st.id)
          ? { ...st, zIndex: clampZOrder((st.zIndex ?? 0) + delta) }
          : st
      )
    );
  };

  const handleDeleteConnection = (id: string) => {
    pushHistory();
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (selectedConnectionId === id) setSelectedConnectionId(null);
  };

  // SVG Image & Text Handlers
  const handleAddImage = (imgData: Omit<CanvasImage, 'id' | 'x' | 'y'>) => {
    pushHistory();
    const center = viewportCenterRef.current;
    const newImg: CanvasImage = {
      ...imgData,
      id: `img-${Date.now()}`,
      x: Math.round(center.x),
      y: Math.round(center.y),
      zIndex: imgData.zIndex ?? -1,
    };
    setSvgImages((prev) => [...prev, newImg]);
    setSelectedImageId(newImg.id);
    setSelectedTextId(null);
    setSelectedStationId(null);
    setSelectedStationIds([]);
    setSelectedConnectionId(null);
    setToolMode('select');
    setSidebarTab('inspector');
  };

  const handleUpdateImage = (updated: CanvasImage) => {
    pushHistory();
    const cloned: CanvasImage = { ...updated };
    setSvgImages((prev) => prev.map((img) => (img.id === cloned.id ? cloned : img)));
  };

  const handleUpdateImageLive = (updated: CanvasImage) => {
    const cloned: CanvasImage = { ...updated };
    setSvgImages((prev) => prev.map((img) => (img.id === cloned.id ? cloned : img)));
  };

  const handleUpdateImageZIndex = (id: string, zIndex: number) => {
    const clamped = clampZOrder(zIndex);
    const current = svgImages.find((img) => img.id === id);
    if (!current || (current.zIndex ?? -1) === clamped) return;
    pushHistory();
    setSvgImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, zIndex: clamped } : img))
    );
  };

  const handleDeleteImage = (id: string) => {
    pushHistory();
    setSvgImages((prev) => prev.filter((img) => img.id !== id));
    if (selectedImageId === id) setSelectedImageId(null);
  };

  const handleAddText = (partial?: Partial<CanvasText>) => {
    pushHistory();
    const center = viewportCenterRef.current;
    const newText: CanvasText = {
      id: `txt-${Date.now()}`,
      content: t('app.defaultTextContent'),
      x: Math.round(center.x),
      y: Math.round(center.y),
      fontSize: 20,
      color: isLight ? '#18181B' : '#F4F4F5',
      fontWeight: 'semibold',
      textAnchor: 'middle',
      letterSpacing: 0,
      hasHalo: true,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      ...partial,
    };
    setSvgTexts((prev) => [...prev, newText]);
    setSelectedTextId(newText.id);
    setSelectedImageId(null);
    setSelectedStationId(null);
    setSelectedStationIds([]);
    setSelectedConnectionId(null);
    setToolMode('select');
    setSidebarTab('inspector');
  };

  const handleUpdateText = (updated: CanvasText) => {
    pushHistory();
    const cloned: CanvasText = { ...updated };
    setSvgTexts((prev) => prev.map((t) => (t.id === cloned.id ? cloned : t)));
  };

  const handleUpdateTextLive = (updated: CanvasText) => {
    const cloned: CanvasText = { ...updated };
    setSvgTexts((prev) => prev.map((t) => (t.id === cloned.id ? cloned : t)));
  };

  const handleUpdateTextZIndex = (id: string, zIndex: number) => {
    const clamped = clampZOrder(zIndex);
    const current = svgTexts.find((t) => t.id === id);
    if (!current || (current.zIndex ?? 1) === clamped) return;
    pushHistory();
    setSvgTexts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, zIndex: clamped } : t))
    );
  };

  const handleDeleteText = (id: string) => {
    pushHistory();
    setSvgTexts((prev) => prev.filter((t) => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const handleDeleteSelected = () => {
    if (selectedStationIds.length > 0) {
      handleBatchDeleteStations(selectedStationIds);
    } else if (selectedStationId) {
      handleDeleteStation(selectedStationId);
    } else if (selectedConnectionId) {
      handleDeleteConnection(selectedConnectionId);
    } else if (selectedImageId) {
      handleDeleteImage(selectedImageId);
    } else if (selectedTextId) {
      handleDeleteText(selectedTextId);
    }
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (window.confirm(t('app.confirmClear'))) {
      pushHistory();
      setStations([]);
      setConnections([]);
      setSvgImages([]);
      setSvgTexts([]);
      setSelectedStationId(null);
      setSelectedStationIds([]);
      setSelectedConnectionId(null);
      setSelectedImageId(null);
      setSelectedTextId(null);
      hasUnsavedChangesRef.current = true;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setLastSavedTime(null);
    }
  };

  // Load Demo Network
  const handleLoadDemo = () => {
    pushHistory();
    setStations(DEMO_STATIONS);
    setConnections(DEMO_CONNECTIONS);
    setSelectedStationId(null);
    setSelectedStationIds([]);
    setSelectedConnectionId(null);
    setSelectedImageId(null);
    setSelectedTextId(null);
    hasUnsavedChangesRef.current = true;
  };

  // Export JSON
  const handleExportJSON = () => {
    const data = {
      name: t('app.defaultExportName'),
      version: '1.0',
      exportedAt: new Date().toISOString(),
      activeColor,
      activeRouteType,
      recentColors,
      stations,
      connections,
      svgImages,
      svgTexts,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metro-network-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedStation = stations.find((s) => s.id === selectedStationId) || null;
  const selectedConnection = connections.find((c) => c.id === selectedConnectionId) || null;
  const selectedImage = svgImages.find((img) => img.id === selectedImageId) || null;
  const selectedText = svgTexts.find((t) => t.id === selectedTextId) || null;

  return (
    <div
      translate="no"
      className={`notranslate flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors ${
        isLight ? 'bg-[#FAFAFA] text-zinc-900' : 'bg-[#09090B] text-zinc-100'
      }`}
    >
      {/* Minimalist 3-Zone Top Bar */}
      <header
        className={`h-12 flex items-center justify-between gap-8 px-5 border-b shrink-0 transition-colors ${
          isLight
            ? 'bg-white border-zinc-200 text-zinc-900'
            : 'bg-[#111113] border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Zone 1: Single-line Brand */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <TrainTrack className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
          <span className="text-sm font-semibold tracking-tight">
            {t('app.title')}
          </span>
        </div>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav
          className={`hidden md:flex items-center gap-6 text-xs font-medium ${
            isLight ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          <button
            type="button"
            onClick={() => setSidebarTab('inspector')}
            className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
              sidebarTab === 'inspector'
                ? isLight
                  ? 'text-zinc-900 border-zinc-900 font-semibold'
                  : 'text-zinc-100 border-zinc-100 font-semibold'
                : 'border-transparent hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {t('app.tab.inspector')}
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('routing')}
            className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
              sidebarTab === 'routing'
                ? isLight
                  ? 'text-zinc-900 border-zinc-900 font-semibold'
                  : 'text-zinc-100 border-zinc-100 font-semibold'
                : 'border-transparent hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {t('app.tab.routing')}
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('stats')}
            className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
              sidebarTab === 'stats'
                ? isLight
                  ? 'text-zinc-900 border-zinc-900 font-semibold'
                  : 'text-zinc-100 border-zinc-100 font-semibold'
                : 'border-transparent hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {t('app.tab.stats')}
          </button>
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 border-transparent hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            {t('app.tab.shortcuts')}
          </button>
        </nav>

        {/* Zone 3: Language, Theme Switch, Save & Primary Export Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <LanguageSelector theme={effectiveTheme} />

          {/* Theme Segmented Control */}
          <div
            className={`flex items-center p-0.5 rounded-md border text-xs ${
              isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <button
              type="button"
              onClick={() => handleSetThemeMode('light')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                themeMode === 'light'
                  ? isLight
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'bg-zinc-800 text-zinc-100 font-semibold'
                  : isLight
                  ? 'text-zinc-500 hover:text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={t('app.theme.lightTip')}
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('app.theme.light')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetThemeMode('dark')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                themeMode === 'dark'
                  ? isLight
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'bg-zinc-800 text-zinc-100 font-semibold'
                  : isLight
                  ? 'text-zinc-500 hover:text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={t('app.theme.darkTip')}
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('app.theme.dark')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetThemeMode('auto')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                themeMode === 'auto'
                  ? isLight
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'bg-zinc-800 text-zinc-100 font-semibold'
                  : isLight
                  ? 'text-zinc-500 hover:text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={t('app.theme.autoTip')}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('app.theme.auto')}</span>
            </button>
          </div>

          {/* Quiet Manual Save */}
          <button
            type="button"
            onClick={saveToLocalStorage}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              isLight
                ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
            title={t('app.saveTip')}
          >
            <Save className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px] tabular-nums">
              {isSaving
                ? t('app.saving')
                : lastSavedTime
                ? lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : t('app.save')}
            </span>
          </button>

          {/* Primary Export CTA */}
          <button
            type="button"
            onClick={() => {
              setExportModalFormat('pdf');
              setIsExportModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isLight
                ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                : 'bg-zinc-100 hover:bg-white text-zinc-900'
            }`}
            title={t('app.exportTip')}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('app.export')}</span>
          </button>
        </div>
      </header>

      {/* Top Bar: Canvas Movement Settings, Demo & Clear */}
      <Toolbar
        gridSnap={gridSnap}
        onToggleGridSnap={() => setGridSnap((v) => !v)}
        gridSize={gridSize}
        onChangeGridSize={setGridSize}
        nodeAlign={nodeAlign}
        onToggleNodeAlign={() => setNodeAlign((v) => !v)}
        onClearCanvas={handleClearCanvas}
        onLoadDemo={handleLoadDemo}
        stationCount={stations.length}
        connectionCount={connections.length}
        theme={effectiveTheme}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        canUndo={past.length > 0}
        onUndo={handleUndo}
        canRedo={future.length > 0}
        onRedo={handleRedo}
        onOpenStats={() => setSidebarTab((prev) => (prev === 'stats' ? 'inspector' : 'stats'))}
        isStatsActive={sidebarTab === 'stats'}
        onOpenRouting={() => setSidebarTab((prev) => (prev === 'routing' ? 'inspector' : 'routing'))}
        isRoutingActive={sidebarTab === 'routing'}
      />

      {/* Main Workspace: Left Toolbar + Infinite Canvas + Right Inspector Sidebar */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left Toolbar: Select, Create Node, Virtual Node, Connect Nodes, Media, City Styles, Show More (Scrollable) */}
        <LeftToolbar
          toolMode={toolMode}
          onSetToolMode={(mode) => {
            setToolMode(mode);
            if (mode === 'add_station' || mode === 'add_virtual_node') {
              setSelectedStationId(null);
              setSelectedConnectionId(null);
              setSelectedImageId(null);
              setSelectedTextId(null);
            }
          }}
          activeRouteType={activeRouteType}
          onChangeRouteType={setActiveRouteType}
          activeColor={activeColor}
          onOpenColorModal={() => setIsColorModalOpen(true)}
          onAddImage={handleAddImage}
          onAddText={() => handleAddText()}
          theme={effectiveTheme}
          defaultStationStyle={defaultStationStyle}
          defaultStationVariant={defaultStationVariant}
          defaultStrokeStyle={defaultStrokeStyle}
          onSelectCityPreset={handleSelectCityPreset}
          onSelectStationVariant={handleSelectStationVariant}
          onApplyCityPresetToAll={handleApplyCityPresetToAll}
          onChangeDefaultStrokeStyle={handleChangeDefaultStrokeStyle}
          gridSnap={gridSnap}
          onToggleGridSnap={() => setGridSnap((v) => !v)}
          nodeAlign={nodeAlign}
          onToggleNodeAlign={() => setNodeAlign((v) => !v)}
          canUndo={past.length > 0}
          onUndo={handleUndo}
          canRedo={future.length > 0}
          onRedo={handleRedo}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />

        {/* Color Modal Window (~1/9th of the screen) containing 16,777,216 Spectrum, Hex Input & Recent 20 Colors */}
        <ColorModal
          isOpen={isColorModalOpen}
          onClose={() => setIsColorModalOpen(false)}
          activeColor={activeColor}
          recentColors={recentColors}
          onSelectColor={handleSelectColor}
          theme={effectiveTheme}
        />

        {/* Keyboard Shortcuts Guide Modal */}
        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
          theme={effectiveTheme}
        />

        {/* PDF & PNG & Network Export Modal */}
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          stations={stations}
          connections={connections}
          svgImages={svgImages}
          svgTexts={svgTexts}
          theme={effectiveTheme}
          onExportJSON={handleExportJSON}
          initialFormat={exportModalFormat}
        />

        {/* Infinite Canvas */}
        <MetroCanvas
          stations={stations}
          lines={lines}
          connections={connections}
          svgImages={svgImages}
          svgTexts={svgTexts}
          activeColor={activeColor}
          toolMode={toolMode}
          onSetToolMode={setToolMode}
          selectedStationId={selectedStationId}
          selectedStationIds={selectedStationIds}
          selectedConnectionId={selectedConnectionId}
          selectedImageId={selectedImageId}
          selectedTextId={selectedTextId}
          gridSnap={gridSnap}
          gridSize={gridSize}
          nodeAlign={nodeAlign}
          activeRouteType={activeRouteType}
          onSelectStation={(id) => {
            setSelectedStationId(id);
            if (id) {
              setSelectedConnectionId(null);
              setSelectedImageId(null);
              setSelectedTextId(null);
              setSelectedStationIds((prev) => (prev.includes(id) && prev.length > 1 ? prev : [id]));
            } else {
              setSelectedStationIds([]);
            }
          }}
          onSelectStationIds={(ids) => {
            setSelectedStationIds(ids);
            if (ids.length === 0) {
              setSelectedStationId(null);
            } else {
              setSelectedImageId(null);
              setSelectedTextId(null);
              if (!ids.includes(selectedStationId || '')) {
                setSelectedStationId(ids[0]);
              }
            }
          }}
          onSelectConnection={(id) => {
            setSelectedConnectionId(id);
            if (id) {
              setSelectedStationId(null);
              setSelectedStationIds([]);
              setSelectedImageId(null);
              setSelectedTextId(null);
            }
          }}
          onSelectImage={(id) => {
            setSelectedImageId(id);
            if (id) {
              setSelectedStationId(null);
              setSelectedStationIds([]);
              setSelectedConnectionId(null);
              setSelectedTextId(null);
              setSidebarTab('inspector');
            }
          }}
          onSelectText={(id) => {
            setSelectedTextId(id);
            if (id) {
              setSelectedStationId(null);
              setSelectedStationIds([]);
              setSelectedConnectionId(null);
              setSelectedImageId(null);
              setSidebarTab('inspector');
            }
          }}
          onAddStation={handleAddStation}
          onUpdateStationPos={handleUpdateStationPos}
          onUpdateStationsPos={handleUpdateStationsPos}
          onBatchUpdateStations={handleBatchUpdateStations}
          onBatchDeleteStations={handleBatchDeleteStations}
          onUpdateStation={handleUpdateStationLive}
          onAddConnection={handleAddConnection}
          onUpdateConnectionWaypoints={handleUpdateConnectionWaypoints}
          onUpdateStationZIndex={handleUpdateStationZIndex}
          onBatchUpdateStationsZIndex={handleBatchUpdateStationsZIndex}
          onUpdateConnectionZIndex={handleUpdateConnectionZIndex}
          onUpdateConnectionOffset={handleUpdateConnectionOffset}
          onUpdateConnectionStyle={handleUpdateConnectionStyleLive}
          onUpdateImage={handleUpdateImageLive}
          onUpdateText={handleUpdateTextLive}
          onUpdateImageZIndex={handleUpdateImageZIndex}
          onUpdateTextZIndex={handleUpdateTextZIndex}
          onViewportCenterChange={handleViewportCenterChange}
          onDeleteSelected={handleDeleteSelected}
          onRecordHistory={pushHistory}
          theme={effectiveTheme}
          defaultStationStyle={defaultStationStyle}
          defaultStationVariant={defaultStationVariant}
          shortestPathResult={shortestPathResult}
          showShortestPathPreview={showPathPreview}
        />

        {/* Mobile Backdrop when Inspector, Routing, or Stats Drawer is open */}
        {(selectedStation ||
          selectedConnection ||
          selectedImage ||
          selectedText ||
          sidebarTab === 'stats' ||
          sidebarTab === 'routing') && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-2xs transition-opacity"
            onClick={() => {
              setSelectedStationId(null);
              setSelectedConnectionId(null);
              setSelectedImageId(null);
              setSelectedTextId(null);
              setSidebarTab('inspector');
            }}
          />
        )}

        {/* Right Inspector & Stats Sidebar */}
        <Sidebar
          selectedStation={selectedStation}
          selectedConnection={selectedConnection}
          selectedStationIds={selectedStationIds}
          stations={stations}
          lines={lines}
          connections={connections}
          recentColors={recentColors}
          svgImages={svgImages}
          svgTexts={svgTexts}
          selectedImage={selectedImage}
          selectedText={selectedText}
          onSelectStation={(id) => {
            setSelectedStationId(id);
            if (id) {
              setSelectedConnectionId(null);
              setSelectedImageId(null);
              setSelectedTextId(null);
              setSelectedStationIds([id]);
            } else {
              setSelectedStationIds([]);
            }
          }}
          onSelectConnection={(id) => {
            setSelectedConnectionId(id);
            if (id) {
              setSelectedStationId(null);
              setSelectedStationIds([]);
              setSelectedImageId(null);
              setSelectedTextId(null);
            }
          }}
          onSelectImage={(id) => {
            setSelectedImageId(id);
            if (id) {
              setSelectedStationId(null);
              setSelectedStationIds([]);
              setSelectedConnectionId(null);
              setSelectedTextId(null);
            }
          }}
          onSelectText={(id) => {
            setSelectedTextId(id);
            if (id) {
              setSelectedStationId(null);
              setSelectedStationIds([]);
              setSelectedConnectionId(null);
              setSelectedImageId(null);
            }
          }}
          onUpdateStation={handleUpdateStation}
          onUpdateStationLive={handleUpdateStationLive}
          onDeleteStation={handleDeleteStation}
          onUpdateConnectionColor={handleUpdateConnectionColor}
          onUpdateConnectionRouteType={handleUpdateConnectionRouteType}
          onToggleConnectionFlip={handleToggleConnectionFlip}
          onUpdateConnectionAngles={handleUpdateConnectionAngles}
          onUpdateConnectionZIndex={handleUpdateConnectionZIndex}
          onUpdateConnectionOffset={handleUpdateConnectionOffset}
          onUpdateConnectionStyle={handleUpdateConnectionStyle}
          onDuplicateParallelConnection={handleDuplicateParallelConnection}
          onAutoBundleConnections={handleAutoBundleConnections}
          onUpdateStationZIndex={handleUpdateStationZIndex}
          onDeleteConnection={handleDeleteConnection}
          onUpdateImage={handleUpdateImage}
          onUpdateImageLive={handleUpdateImageLive}
          onUpdateImageZIndex={handleUpdateImageZIndex}
          onDeleteImage={handleDeleteImage}
          onUpdateText={handleUpdateText}
          onUpdateTextLive={handleUpdateTextLive}
          onUpdateTextZIndex={handleUpdateTextZIndex}
          onDeleteText={handleDeleteText}
          onRecordHistory={pushHistory}
          theme={effectiveTheme}
          onClose={() => {
            setSelectedStationId(null);
            setSelectedConnectionId(null);
            setSelectedImageId(null);
            setSelectedTextId(null);
            setSidebarTab('inspector');
          }}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          shortestPathResult={shortestPathResult}
          onUpdateShortestPath={setShortestPathResult}
          showPathPreview={showPathPreview}
          onTogglePathPreview={setShowPathPreview}
          onAddConnection={handleAddConnection}
          activeColor={activeColor}
          activeRouteType={activeRouteType}
          defaultCityPreset={defaultStationStyle}
          onSelectCityPreset={handleSelectCityPreset}
          onApplyCityPresetToAll={handleApplyCityPresetToAll}
          onApplyStationStyleToAll={handleApplyStationStyleToAll}
          onApplyLineStyleToSameColor={handleApplyLineStyleToSameColor}
          onApplyLineStyleToAll={handleApplyLineStyleToAll}
        />
      </div>
    </div>
  );
}
