/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { Sidebar } from './components/Sidebar';
import { TrainTrack, Download, Sun, Moon, Clock } from 'lucide-react';

export default function App() {
  const [stations, setStations] = useState<Station[]>(DEMO_STATIONS);
  const [lines] = useState<MetroLine[]>(DEFAULT_LINES);
  const [connections, setConnections] = useState<Connection[]>(DEMO_CONNECTIONS);

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

  // Active Route Type among the 5 styles
  const [activeRouteType, setActiveRouteType] = useState<RouteType>('135_bend');

  // Tool Mode controlled by the Left Toolbar
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

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
    setStations((prev) => [...prev, station]);
  };

  const handleUpdateStationPos = (id: string, x: number, y: number) => {
    setStations((prev) =>
      prev.map((st) => (st.id === id ? { ...st, x, y } : st))
    );
  };

  const handleUpdateStation = (updated: Station) => {
    setStations((prev) =>
      prev.map((st) => (st.id === updated.id ? updated : st))
    );
  };

  const handleDeleteStation = (id: string) => {
    setStations((prev) => prev.filter((st) => st.id !== id));
    setConnections((prev) =>
      prev.filter((c) => c.fromStationId !== id && c.toStationId !== id)
    );
    if (selectedStationId === id) setSelectedStationId(null);
  };

  // Check and auto-convert stations to interchange when 2+ different colors intersect
  const autoConvertInterchanges = (updatedConns: Connection[]) => {
    setStations((prevStations) =>
      prevStations.map((st) => {
        if (st.isVirtual) return st;
        const stConns = updatedConns.filter(
          (c) => c.fromStationId === st.id || c.toStationId === st.id
        );
        const distinctColors = new Set(stConns.map((c) => c.color.toUpperCase()));
        if (distinctColors.size >= 2 && st.type !== 'interchange') {
          return { ...st, type: 'interchange' };
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
    setConnections((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, routeType } : c))
    );
  };

  const handleToggleConnectionFlip = (connId: string) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === connId ? { ...c, isFlipped: !c.isFlipped } : c))
    );
  };

  const handleUpdateConnectionAngles = (connId: string, angleA?: number, angleB?: number) => {
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
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (selectedConnectionId === id) setSelectedConnectionId(null);
  };

  const handleDeleteSelected = () => {
    if (selectedStationId) {
      handleDeleteStation(selectedStationId);
    } else if (selectedConnectionId) {
      handleDeleteConnection(selectedConnectionId);
    }
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (window.confirm('確定要清空畫布上的所有節點與連線嗎？')) {
      setStations([]);
      setConnections([]);
      setSelectedStationId(null);
      setSelectedConnectionId(null);
    }
  };

  // Load Demo Network
  const handleLoadDemo = () => {
    setStations(DEMO_STATIONS);
    setConnections(DEMO_CONNECTIONS);
    setSelectedStationId(null);
    setSelectedConnectionId(null);
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
            className={`text-xs border rounded px-2 py-0.5 ml-1 ${
              isLight
                ? 'text-slate-600 border-slate-300 bg-slate-100'
                : 'text-slate-400 border-slate-700/60'
            }`}
          >
            第一階段：基礎功能
          </span>
        </div>

        <nav
          className={`hidden md:flex items-center gap-6 text-xs font-medium ${
            isLight ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <span className="text-indigo-600 font-semibold cursor-default">01. 基礎功能 (節點與連接)</span>
          <span className={`${isLight ? 'hover:text-slate-900' : 'hover:text-slate-200'} transition-colors cursor-default`}>
            02. 標籤與樣式
          </span>
          <span className={`${isLight ? 'hover:text-slate-900' : 'hover:text-slate-200'} transition-colors cursor-default`}>
            03. 路網進階分析
          </span>
          <span className={`${isLight ? 'hover:text-slate-900' : 'hover:text-slate-200'} transition-colors cursor-default`}>
            04. 匯出與分享
          </span>
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

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm whitespace-nowrap cursor-pointer"
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

        {/* Infinite Canvas */}
        <MetroCanvas
          stations={stations}
          lines={lines}
          connections={connections}
          activeColor={activeColor}
          toolMode={toolMode}
          onSetToolMode={setToolMode}
          selectedStationId={selectedStationId}
          selectedConnectionId={selectedConnectionId}
          gridSnap={gridSnap}
          gridSize={gridSize}
          nodeAlign={nodeAlign}
          activeRouteType={activeRouteType}
          onSelectStation={(id) => {
            setSelectedStationId(id);
            if (id) setSelectedConnectionId(null);
          }}
          onSelectConnection={(id) => {
            setSelectedConnectionId(id);
            if (id) setSelectedStationId(null);
          }}
          onAddStation={handleAddStation}
          onUpdateStationPos={handleUpdateStationPos}
          onUpdateStation={handleUpdateStation}
          onAddConnection={handleAddConnection}
          onUpdateConnectionWaypoints={handleUpdateConnectionWaypoints}
          onDeleteSelected={handleDeleteSelected}
          theme={effectiveTheme}
        />

        {/* Mobile Backdrop when Inspector Drawer is open */}
        {(selectedStation || selectedConnection) && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-2xs transition-opacity"
            onClick={() => {
              setSelectedStationId(null);
              setSelectedConnectionId(null);
            }}
          />
        )}

        {/* Right Inspector Sidebar */}
        <Sidebar
          selectedStation={selectedStation}
          selectedConnection={selectedConnection}
          stations={stations}
          lines={lines}
          connections={connections}
          recentColors={recentColors}
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
          }}
        />
      </div>
    </div>
  );
}
