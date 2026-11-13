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
  EffectiveTheme
} from './types/metro';
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
  Image as ImageIcon, 
  ChevronDown, 
  Check,
  FileText
} from 'lucide-react';
import { exportMetroCanvasToPng, triggerPngDownload } from './utils/exportImage';
import { ShortestPathResult } from './utils/pathfinding';

const STORAGE_KEY = 'metro_network_data';

interface HistorySnapshot {
  stations: Station[];
  connections: Connection[];
}

interface SavedNetworkData {
  version: string;
  savedAt: string;
  stations: Station[];
  connections: Connection[];
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
  const initialSavedRef = useRef<SavedNetworkData | null>(loadSavedNetwork());
  const [stations, setStations] = useState<Station[]>(() => initialSavedRef.current?.stations ?? DEMO_STATIONS);
  const [lines] = useState<MetroLine[]>(DEFAULT_LINES);
  const [connections, setConnections] = useState<Connection[]>(() => initialSavedRef.current?.connections ?? DEMO_CONNECTIONS);

  // Auto-save state & references
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(() =>
    initialSavedRef.current?.savedAt ? new Date(initialSavedRef.current.savedAt) : null
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const hasUnsavedChangesRef = useRef<boolean>(false);
  const currentNetworkRef = useRef<{ stations: Station[]; connections: Connection[] }>({
    stations,
    connections,
  });

  // Keep network ref synchronized with latest state
  useEffect(() => {
    currentNetworkRef.current = { stations, connections };
  }, [stations, connections]);

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
        },
        ...prevFuture,
      ]);

      setStations(previous.stations);
      setConnections(previous.connections);
      setSelectedStationId(null);
      setSelectedStationIds([]);
      setSelectedConnectionId(null);
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
          },
        ];
      });

      setStations(next.stations);
      setConnections(next.connections);
      setSelectedStationId(null);
      setSelectedStationIds([]);
      setSelectedConnectionId(null);
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

  // 1. Listen to stations and connections changes via useEffect
  useEffect(() => {
    hasUnsavedChangesRef.current = true;
  }, [stations, connections]);

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

  // Active color & Recent 20 colors history (initially empty until colors are used)
  const [activeColor, setActiveColor] = useState<string>('#E11D48');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [isColorModalOpen, setIsColorModalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportModalFormat, setExportModalFormat] = useState<'pdf' | 'png'>('pdf');
  const [isExportingPNG, setIsExportingPNG] = useState<boolean>(false);
  const [pngExportSuccess, setPngExportSuccess] = useState<boolean>(false);
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

  // Tool Mode controlled by the Left Toolbar
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'inspector' | 'stats'>('inspector');

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
    setStations((prev) =>
      prev.map((st) => (st.id === updated.id ? updated : st))
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

  // Connection Handlers
  const handleAddConnection = (
    fromId: string, 
    toId: string, 
    color: string, 
    routeType: RouteType = activeRouteType,
    waypoints?: Point[]
  ) => {
    if (fromId === toId) return;

    // Check duplicate
    const exists = connections.some(
      (c) =>
        (c.fromStationId === fromId && c.toStationId === toId) ||
        (c.fromStationId === toId && c.toStationId === fromId)
    );

    if (exists) return;

    pushHistory();

    const newConn: Connection = {
      id: `conn-${Date.now()}`,
      fromStationId: fromId,
      toStationId: toId,
      color,
      routeType,
      waypoints,
    };

    const nextConnections = [...connections, newConn];
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

  const handleDeleteConnection = (id: string) => {
    pushHistory();
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (selectedConnectionId === id) setSelectedConnectionId(null);
  };

  const handleDeleteSelected = () => {
    if (selectedStationIds.length > 0) {
      handleBatchDeleteStations(selectedStationIds);
    } else if (selectedStationId) {
      handleDeleteStation(selectedStationId);
    } else if (selectedConnectionId) {
      handleDeleteConnection(selectedConnectionId);
    }
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (window.confirm('確定要清空畫布上的所有節點與連線嗎？')) {
      pushHistory();
      setStations([]);
      setConnections([]);
      setSelectedStationId(null);
      setSelectedConnectionId(null);
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
    setSelectedConnectionId(null);
    hasUnsavedChangesRef.current = true;
  };

  // Export JSON
  const handleExportJSON = () => {
    const data = {
      name: '地鐵路網繪製資料',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      activeColor,
      activeRouteType,
      recentColors,
      stations,
      connections,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metro-network-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to PNG Image using canvas.toDataURL() as requested
  const handleExportPNG = async () => {
    const svg = document.getElementById('metro-canvas-svg') as SVGSVGElement | null;
    if (!svg) {
      console.warn('MetroCanvas SVG element not found');
      return;
    }

    setIsExportingPNG(true);
    try {
      const result = await exportMetroCanvasToPng(svg, stations, connections, {
        scope: 'full',
        scale: 2, // 2x high resolution Retina scale
        background: 'theme',
        theme: effectiveTheme,
      });

      // Directly trigger image download using the dataUrl generated via canvas.toDataURL()
      triggerPngDownload(result.dataUrl, `metro-map-${Date.now()}.png`);
      setPngExportSuccess(true);
      setTimeout(() => setPngExportSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export PNG image:', err);
    } finally {
      setIsExportingPNG(false);
    }
  };

  const selectedStation = stations.find((s) => s.id === selectedStationId) || null;
  const selectedConnection = connections.find((c) => c.id === selectedConnectionId) || null;

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors ${
        isLight ? 'bg-[#F8FAFC] text-slate-850' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Bar following Top Bar Contract: Brand - Nav - Primary Action */}
      <header
        className={`flex items-center justify-between gap-6 px-6 py-2.5 border-b shrink-0 transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-2xs'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <TrainTrack className="w-4 h-4" />
          </div>
          <span className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            地鐵路網繪製器
          </span>
          <span
            className={`text-xs border rounded-md px-2 py-0.5 ml-1 font-medium ${
              isLight
                ? 'text-indigo-700 border-indigo-200 bg-indigo-50 font-semibold'
                : 'text-indigo-300 border-indigo-800/80 bg-indigo-950/60 font-semibold'
            }`}
          >
            階段二：路網統計分析
          </span>
        </div>

        <nav
          className={`hidden md:flex items-center gap-4 text-xs font-medium ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <button
            type="button"
            onClick={() => setSidebarTab('inspector')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              sidebarTab === 'inspector'
                ? 'text-indigo-600 font-bold bg-indigo-50/70 dark:bg-indigo-950/50'
                : isLight
                ? 'hover:text-slate-900'
                : 'hover:text-slate-200'
            }`}
          >
            01. 基礎屬性檢視
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('stats')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
              sidebarTab === 'stats'
                ? 'text-indigo-600 font-bold bg-indigo-50/70 dark:bg-indigo-950/50'
                : isLight
                ? 'hover:text-slate-900'
                : 'hover:text-slate-200'
            }`}
          >
            <span>02. 路網統計</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-600 text-white font-mono font-bold">
              二階
            </span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className={`${isLight ? 'hover:text-slate-900' : 'hover:text-slate-200'} transition-colors cursor-default`}>
            03. 路網進階分析
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-100 hover:text-emerald-700' : 'hover:bg-slate-800 hover:text-emerald-400'
            }`}
            title="開啟匯出面板：匯出 PNG 高畫質圖片或 JSON 資料"
          >
            <span>04. 匯出與分享</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-bold">
              PNG
            </span>
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Theme Mode Segmented Controller (黑白模式自由切換 + 自動判定時間模式) */}
          <div
            className={`flex items-center p-1 rounded-xl border text-xs gap-0.5 transition-colors ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950 border-slate-800'
            }`}
          >
            {/* 1. 亮色模式 (白色模式) */}
            <button
              onClick={() => handleSetThemeMode('light')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                themeMode === 'light'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
              title="白色模式 (淺色主題)"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>亮色</span>
            </button>

            {/* 2. 暗色模式 (黑夜模式) */}
            <button
              onClick={() => handleSetThemeMode('dark')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                themeMode === 'dark'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
              title="黑夜模式 (深色主題)"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>暗色</span>
            </button>

            {/* 3. 自動時控模式 (06:00 - 18:00 白天白色模式，其餘黑夜模式) */}
            <button
              onClick={() => handleSetThemeMode('auto')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                themeMode === 'auto'
                  ? isLight
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-sky-600 text-white font-bold shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
              title={`自動時控模式：上午 6 點至下午 6 點 (06:00-18:00) 為白色模式，其餘為黑夜模式（當前狀態：${
                effectiveTheme === 'light' ? '白色模式 ☀️ 白天' : '黑夜模式 🌙 夜晚'
              }）`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>自動</span>
              {themeMode === 'auto' && (
                <span className="text-[10px] opacity-90 font-mono ml-0.5">
                  ({effectiveTheme === 'light' ? '06-18 白' : '18-06 夜'})
                </span>
              )}
            </button>
          </div>

          {/* Auto-save Status Indicator (每 30 秒自動保存至 localStorage) */}
          <button
            type="button"
            onClick={saveToLocalStorage}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border cursor-pointer select-none ${
              isLight
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 shadow-2xs'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="系統每 30 秒自動儲存路網至瀏覽器 (localStorage)。點擊可立即手動儲存。"
          >
            {isSaving ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[11px] text-amber-500 font-semibold">儲存中...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-slate-600 dark:text-slate-300 font-sans">
                  {lastSavedTime
                    ? `已儲存 ${lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : '每 30 秒自動保存'}
                </span>
                <Save className="w-3 h-3 opacity-60 ml-0.5" />
              </>
            )}
          </button>

          {/* Export PDF Button (利用 jsPDF 向量文件匯出) */}
          <button
            type="button"
            onClick={() => {
              setExportModalFormat('pdf');
              setIsExportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-all shadow-sm whitespace-nowrap cursor-pointer active:scale-[0.98]"
            title="利用 jsPDF 庫將 MetroCanvas 轉為向量 PDF 文件，支援高品質列印與分享"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>匯出 PDF</span>
          </button>

          {/* Export to PNG Image Button (利用 canvas.toDataURL 下載) */}
          <div className="flex items-center rounded-lg shadow-sm">
            <button
              type="button"
              onClick={handleExportPNG}
              disabled={isExportingPNG}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-l-lg transition-all shadow-sm whitespace-nowrap cursor-pointer ${
                pngExportSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]'
              } ${isExportingPNG ? 'opacity-80 cursor-wait' : ''}`}
              title="利用 canvas.toDataURL() 將目前畫布轉為 PNG 圖片下載"
            >
              {isExportingPNG ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>轉圖中...</span>
                </>
              ) : pngExportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>已下載 PNG！</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>匯出 PNG</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setExportModalFormat('png');
                setIsExportModalOpen(true);
              }}
              className="px-1.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 border-l border-emerald-500/40 rounded-r-lg transition-colors cursor-pointer"
              title="開啟進階匯出選項 (自訂範圍/背景/解析度)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm whitespace-nowrap cursor-pointer"
            title="匯出完整路網資料結構為 JSON 檔案"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出資料</span>
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
      />

      {/* Main Workspace: Left Toolbar + Infinite Canvas + Right Inspector Sidebar */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left Toolbar: Select, Create Node, Virtual Node, Connect Nodes (with 5-style flyout), and Active Color */}
        <LeftToolbar
          toolMode={toolMode}
          onSetToolMode={(mode) => {
            setToolMode(mode);
            if (mode === 'add_station' || mode === 'add_virtual_node') {
              setSelectedStationId(null);
              setSelectedConnectionId(null);
            }
          }}
          activeRouteType={activeRouteType}
          onChangeRouteType={setActiveRouteType}
          activeColor={activeColor}
          onOpenColorModal={() => setIsColorModalOpen(true)}
          theme={effectiveTheme}
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
          theme={effectiveTheme}
          onExportJSON={handleExportJSON}
          initialFormat={exportModalFormat}
        />

        {/* Infinite Canvas */}
        <MetroCanvas
          stations={stations}
          lines={lines}
          connections={connections}
          activeColor={activeColor}
          toolMode={toolMode}
          onSetToolMode={setToolMode}
          selectedStationId={selectedStationId}
          selectedStationIds={selectedStationIds}
          selectedConnectionId={selectedConnectionId}
          gridSnap={gridSnap}
          gridSize={gridSize}
          nodeAlign={nodeAlign}
          activeRouteType={activeRouteType}
          onSelectStation={(id) => {
            setSelectedStationId(id);
            if (id) {
              setSelectedConnectionId(null);
              setSelectedStationIds((prev) => (prev.includes(id) && prev.length > 1 ? prev : [id]));
            } else {
              setSelectedStationIds([]);
            }
          }}
          onSelectStationIds={(ids) => {
            setSelectedStationIds(ids);
            if (ids.length === 0) {
              setSelectedStationId(null);
            } else if (!ids.includes(selectedStationId || '')) {
              setSelectedStationId(ids[0]);
            }
          }}
          onSelectConnection={(id) => {
            setSelectedConnectionId(id);
            if (id) {
              setSelectedStationId(null);
              setSelectedStationIds([]);
            }
          }}
          onAddStation={handleAddStation}
          onUpdateStationPos={handleUpdateStationPos}
          onUpdateStationsPos={handleUpdateStationsPos}
          onBatchDeleteStations={handleBatchDeleteStations}
          onUpdateStation={handleUpdateStation}
          onAddConnection={handleAddConnection}
          onUpdateConnectionWaypoints={handleUpdateConnectionWaypoints}
          onDeleteSelected={handleDeleteSelected}
          onRecordHistory={pushHistory}
          theme={effectiveTheme}
          shortestPathResult={shortestPathResult}
          showShortestPathPreview={showPathPreview}
        />

        {/* Mobile Backdrop when Inspector or Stats Drawer is open */}
        {(selectedStation || selectedConnection || sidebarTab === 'stats') && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-2xs transition-opacity"
            onClick={() => {
              setSelectedStationId(null);
              setSelectedConnectionId(null);
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
          onSelectStation={(id) => {
            setSelectedStationId(id);
            if (id) {
              setSelectedConnectionId(null);
              setSelectedStationIds([id]);
            } else {
              setSelectedStationIds([]);
            }
          }}
          onUpdateStation={handleUpdateStation}
          onDeleteStation={handleDeleteStation}
          onUpdateConnectionColor={handleUpdateConnectionColor}
          onUpdateConnectionRouteType={handleUpdateConnectionRouteType}
          onToggleConnectionFlip={handleToggleConnectionFlip}
          onUpdateConnectionAngles={handleUpdateConnectionAngles}
          onDeleteConnection={handleDeleteConnection}
          theme={effectiveTheme}
          onClose={() => {
            setSelectedStationId(null);
            setSelectedConnectionId(null);
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
        />
      </div>
    </div>
  );
}
