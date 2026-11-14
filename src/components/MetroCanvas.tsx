import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Station, 
  MetroLine, 
  Connection, 
  CanvasImage,
  CanvasText,
  ToolMode, 
  RouteType, 
  Point, 
  EffectiveTheme,
  LabelPosition,
  LABEL_POSITION_PRESETS,
  MIN_Z_ORDER,
  MAX_Z_ORDER,
  clampZOrder,
  clampLineOffset,
  normalizeSvgScale,
  normalizeSvgAngle,
  normalizeStrokeWidth
} from '../types/metro';
import { 
  snapToGrid, 
  getMetroPath, 
  getSmoothCatmullRomPath,
  simplifyPoints
} from '../utils/geometry';
import { ShortestPathResult } from '../utils/pathfinding';
import { 
  Plus, 
  Minus, 
  Maximize2, 
  Crosshair, 
  Compass,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Layers,
  RotateCcw,
  Check
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export interface AlignmentGuide {
  id: string;
  type: 'horizontal' | 'vertical' | 'diagonal_45' | 'diagonal_135';
  targetStation: Station;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angleLabel: string;
}

export interface EqualDistanceGuide {
  id: string;
  sourceStation: Station;
  refStation: Station;
  targetPos: Point;
  targetStation?: Station;
  distance: number;
  label: string;
}

interface MetroCanvasProps {
  stations: Station[];
  lines: MetroLine[];
  connections: Connection[];
  svgImages?: CanvasImage[];
  svgTexts?: CanvasText[];
  activeColor: string;
  toolMode: ToolMode;
  onSetToolMode: (mode: ToolMode) => void;
  selectedStationId: string | null;
  selectedStationIds?: string[];
  selectedConnectionId: string | null;
  selectedImageId?: string | null;
  selectedTextId?: string | null;
  gridSnap: boolean;
  gridSize: number;
  nodeAlign?: boolean;
  activeRouteType: RouteType;
  onSelectStation: (id: string | null) => void;
  onSelectStationIds?: (ids: string[]) => void;
  onSelectConnection: (id: string | null) => void;
  onSelectImage?: (id: string | null) => void;
  onSelectText?: (id: string | null) => void;
  onAddStation: (station: Station) => void;
  onUpdateStationPos: (id: string, x: number, y: number) => void;
  onUpdateStationsPos?: (updates: { id: string; x: number; y: number }[]) => void;
  onBatchUpdateStations?: (updates: Array<{ id: string } & Partial<Station>>) => void;
  onBatchDeleteStations?: (ids: string[]) => void;
  onUpdateStation?: (updated: Station) => void;
  onUpdateImage?: (updated: CanvasImage) => void;
  onUpdateText?: (updated: CanvasText) => void;
  onAddConnection: (
    fromId: string, 
    toId: string, 
    color: string, 
    routeType: RouteType, 
    waypoints?: Point[]
  ) => void;
  onUpdateConnectionWaypoints: (connId: string, waypoints: Point[]) => void;
  onUpdateStationZIndex?: (stationId: string, zIndex: number) => void;
  onBatchUpdateStationsZIndex?: (stationIds: string[], delta: number) => void;
  onUpdateConnectionZIndex?: (connId: string, zIndex: number) => void;
  onUpdateImageZIndex?: (imageId: string, zIndex: number) => void;
  onUpdateTextZIndex?: (textId: string, zIndex: number) => void;
  onUpdateConnectionOffset?: (connId: string, offset: number) => void;
  onUpdateConnectionStyle?: (connId: string, patch: Partial<Connection>) => void;
  onViewportCenterChange?: (center: Point) => void;
  onDeleteSelected: () => void;
  onRecordHistory?: () => void;
  theme?: EffectiveTheme;
  shortestPathResult?: ShortestPathResult | null;
  showShortestPathPreview?: boolean;
}

export const MetroCanvas: React.FC<MetroCanvasProps> = ({
  stations,
  lines: _lines,
  connections,
  svgImages = [],
  svgTexts = [],
  activeColor,
  toolMode,
  onSetToolMode,
  selectedStationId,
  selectedStationIds = [],
  selectedConnectionId,
  selectedImageId = null,
  selectedTextId = null,
  gridSnap,
  gridSize,
  nodeAlign,
  activeRouteType,
  onSelectStation,
  onSelectStationIds,
  onSelectConnection,
  onSelectImage,
  onSelectText,
  onAddStation,
  onUpdateStationPos,
  onUpdateStationsPos,
  onBatchUpdateStations,
  onBatchDeleteStations,
  onUpdateStation,
  onUpdateImage,
  onUpdateText,
  onAddConnection,
  onUpdateConnectionWaypoints,
  onUpdateStationZIndex,
  onBatchUpdateStationsZIndex,
  onUpdateConnectionZIndex,
  onUpdateImageZIndex,
  onUpdateTextZIndex,
  onUpdateConnectionOffset,
  onUpdateConnectionStyle,
  onViewportCenterChange,
  onDeleteSelected,
  onRecordHistory,
  theme = 'dark',
  shortestPathResult,
  showShortestPathPreview = true,
}) => {
  const { t } = useI18n();
  const isLight = theme === 'light';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Current active selected station IDs list
  const currentSelectedStationIds = selectedStationIds.length > 0 
    ? selectedStationIds 
    : (selectedStationId ? [selectedStationId] : []);

  // Infinite Canvas Viewport State: X, Y offset in pixels, and scale factor
  const [viewTransform, setViewTransform] = useState({ x: 120, y: 100, scale: 1 });
  
  // Pan interaction states
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const canvasPointerDownRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const hasDraggedCanvasRef = useRef(false);

  // Marquee selection box state (Shift + Drag on canvas)
  interface MarqueeBox {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }
  const [marqueeBox, setMarqueeBox] = useState<MarqueeBox | null>(null);
  const marqueeRef = useRef<{
    startWorldX: number;
    startWorldY: number;
    startClientX: number;
    startClientY: number;
    hasDragged: boolean;
    initialSelectedIds: string[];
    isAdditive: boolean;
  } | null>(null);

  // Station drag tracking (supports single station or batch dragging multiple stations)
  const [draggingStationId, setDraggingStationId] = useState<string | null>(null);
  const dragInfoRef = useRef<{
    stationId: string;
    startWorldX: number;
    startWorldY: number;
    startStationX: number;
    startStationY: number;
    batchStationIds: string[];
    initialPositions: Record<string, { x: number; y: number }>;
    hasRecordedHistory?: boolean;
  } | null>(null);

  // Draggable Station Name tracking (自由站名可拖動)
  const [draggingLabelStationId, setDraggingLabelStationId] = useState<string | null>(null);
  const labelDragRef = useRef<{
    stationId: string;
    startClientX: number;
    startClientY: number;
    origDx: number;
    origDy: number;
    hasRecordedHistory?: boolean;
  } | null>(null);

  // Inline Double-Click Station Rename Overlay State (IME-safe)
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [editingStationName, setEditingStationName] = useState('');
  const editingStationOrigNameRef = useRef<string>('');
  const isComposingInlineNameRef = useRef<boolean>(false);
  const inlineHistoryRecordedRef = useRef<boolean>(false);
  const inlineNameInputRef = useRef<HTMLInputElement | null>(null);

  const startInlineEditStation = (station: Station) => {
    if (
      station.isVirtual ||
      toolMode === 'connect' ||
      toolMode === 'pan' ||
      toolMode === 'add_station' ||
      toolMode === 'add_virtual_node'
    ) {
      return;
    }
    labelDragRef.current = null;
    setDraggingLabelStationId(null);
    dragInfoRef.current = null;
    setDraggingStationId(null);

    onSelectStation(station.id);
    onSelectStationIds?.([station.id]);
    onSelectConnection(null);
    onSelectImage?.(null);
    onSelectText?.(null);

    editingStationOrigNameRef.current = station.name;
    isComposingInlineNameRef.current = false;
    inlineHistoryRecordedRef.current = false;
    setEditingStationId(station.id);
    setEditingStationName(station.name);

    requestAnimationFrame(() => {
      inlineNameInputRef.current?.focus();
      inlineNameInputRef.current?.select();
    });
  };

  const applyInlineStationName = (nextName: string, closeEditor: boolean) => {
    if (!editingStationId) return;
    const target = stations.find((s) => s.id === editingStationId);
    if (target && nextName !== target.name) {
      if (!inlineHistoryRecordedRef.current) {
        onRecordHistory?.();
        inlineHistoryRecordedRef.current = true;
      }
      onUpdateStation?.({ ...target, name: nextName });
    }
    if (closeEditor) {
      setEditingStationId(null);
      isComposingInlineNameRef.current = false;
      inlineHistoryRecordedRef.current = false;
    }
  };

  const cancelInlineEditStation = () => {
    if (!editingStationId) return;
    const target = stations.find((s) => s.id === editingStationId);
    const orig = editingStationOrigNameRef.current;
    if (target && target.name !== orig) {
      onUpdateStation?.({ ...target, name: orig });
    }
    setEditingStationId(null);
    isComposingInlineNameRef.current = false;
    inlineHistoryRecordedRef.current = false;
  };

  // Active 8-direction alignment guides during station dragging
  const [activeAlignmentGuides, setActiveAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const isCtrlPressedRef = useRef(false);
  const [isCtrlDown, setIsCtrlDown] = useState(false);
  const isShiftPressedRef = useRef(false);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const isSpacePressedRef = useRef(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  // Active equal-distance red dashed guides (已有線段時，另一節點連線產生紅色虛線讓線段等距)
  const [activeEqualDistanceGuide, setActiveEqualDistanceGuide] = useState<EqualDistanceGuide | null>(null);
  const activeEqualDistanceGuideRef = useRef<EqualDistanceGuide | null>(null);

  // Connection source state
  const [connectSourceStationId, setConnectSourceStationId] = useState<string | null>(null);
  const justCompletedConnectRef = useRef(false);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number } | null>(null);

  // Freehand mouse trajectory recording points while connecting in free_curve mode
  const [freeDrawingPoints, setFreeDrawingPoints] = useState<Point[]>([]);
  const freeDrawingPointsRef = useRef<Point[]>([]);

  // Waypoint handle dragging state for freehand lines
  const waypointDragRef = useRef<{
    connId: string;
    index: number;
    startWorldX: number;
    startWorldY: number;
    origPoint: Point;
    hasRecordedHistory?: boolean;
  } | null>(null);
  const [draggingWaypointInfo, setDraggingWaypointInfo] = useState<{
    connId: string;
    index: number;
  } | null>(null);

  // Stage 3: Single Station & Multi-Station Group SVG Free Transform states
  type TransformHandleKind = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | 'rotate';
  const stationTransformRef = useRef<{
    stationId: string;
    handle: TransformHandleKind;
    centerX: number;
    centerY: number;
    baseHalf: number;
    startDist: number;
    startAngle: number;
    origScale: number;
    origScaleX: number;
    origScaleY: number;
    origRotation: number;
    hasRecordedHistory?: boolean;
  } | null>(null);

  const groupTransformRef = useRef<{
    handle: TransformHandleKind;
    cx: number;
    cy: number;
    halfW: number;
    halfH: number;
    startAngle: number;
    startDist: number;
    initialStations: Array<{ id: string; x: number; y: number; scale: number }>;
    hasRecordedHistory?: boolean;
  } | null>(null);

  const [transformHudText, setTransformHudText] = useState<string | null>(null);

  // SVG Image & Text drag + Stage 3 Free Transform tracking
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null);
  const imageDragRef = useRef<{
    imageId: string;
    startWorldX: number;
    startWorldY: number;
    origX: number;
    origY: number;
    hasRecordedHistory?: boolean;
  } | null>(null);

  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const textDragRef = useRef<{
    textId: string;
    startWorldX: number;
    startWorldY: number;
    origX: number;
    origY: number;
    hasRecordedHistory?: boolean;
  } | null>(null);

  const imageTransformRef = useRef<{
    imageId: string;
    handle: TransformHandleKind;
    centerX: number;
    centerY: number;
    baseHalfW: number;
    baseHalfH: number;
    startDist: number;
    startAngle: number;
    origScale: number;
    origScaleX: number;
    origScaleY: number;
    origRotation: number;
    hasRecordedHistory?: boolean;
  } | null>(null);

  const textTransformRef = useRef<{
    textId: string;
    handle: TransformHandleKind;
    centerX: number;
    centerY: number;
    baseHalfW: number;
    baseHalfH: number;
    startDist: number;
    startAngle: number;
    origScale: number;
    origScaleX: number;
    origScaleY: number;
    origRotation: number;
    hasRecordedHistory?: boolean;
  } | null>(null);

  // Sync viewport center coordinates for newly imported images / added text
  useEffect(() => {
    if (!onViewportCenterChange || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = Math.round((rect.width / 2 - viewTransform.x) / viewTransform.scale);
    const cy = Math.round((rect.height / 2 - viewTransform.y) / viewTransform.scale);
    onViewportCenterChange({ x: cx, y: cy });
  }, [viewTransform, onViewportCenterChange]);

  // Multi-touch tracking for pinch-to-zoom & two-finger pan on mobile/tablet
  const touchPointsRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchStartRef = useRef<{
    dist: number;
    scale: number;
    centerX: number;
    centerY: number;
    viewX: number;
    viewY: number;
  } | null>(null);

  // Convert screen coordinates to infinite SVG world space
  const screenToWorld = useCallback(
    (clientX: number, clientY: number, snap: boolean = gridSnap) => {
      if (!containerRef.current) return { x: 0, y: 0, rawX: 0, rawY: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = (clientX - rect.left - viewTransform.x) / viewTransform.scale;
      const rawY = (clientY - rect.top - viewTransform.y) / viewTransform.scale;

      return {
        x: snap ? snapToGrid(rawX, gridSize) : Math.round(rawX),
        y: snap ? snapToGrid(rawY, gridSize) : Math.round(rawY),
        rawX,
        rawY,
      };
    },
    [viewTransform, gridSnap, gridSize]
  );

  // Reset connect source if tool mode changes
  useEffect(() => {
    if (toolMode !== 'connect') {
      setConnectSourceStationId(null);
      freeDrawingPointsRef.current = [];
      setFreeDrawingPoints([]);
      setActiveEqualDistanceGuide(null);
      activeEqualDistanceGuideRef.current = null;
    }
  }, [toolMode]);

  // Track Ctrl / Meta / Shift key state for alignment and multi-selection
  useEffect(() => {
    const handleKeyChange = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      isCtrlPressedRef.current = isCtrl;
      setIsCtrlDown(isCtrl);

      const isShift = e.shiftKey;
      isShiftPressedRef.current = isShift;
      setIsShiftDown(isShift);

      if (e.code === 'Space' || e.key === ' ') {
        if (e.type === 'keydown') {
          if (!isSpacePressedRef.current) {
            isSpacePressedRef.current = true;
            setIsSpaceDown(true);
          }
        } else if (e.type === 'keyup') {
          isSpacePressedRef.current = false;
          setIsSpaceDown(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyChange);
    window.addEventListener('keyup', handleKeyChange);
    return () => {
      window.removeEventListener('keydown', handleKeyChange);
      window.removeEventListener('keyup', handleKeyChange);
    };
  }, []);

  // Keyboard events: Delete to remove, Esc to cancel, Space to pan, V/A/X/C shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        onDeleteSelected();
      } else if (e.key === 'Escape') {
        setConnectSourceStationId(null);
        freeDrawingPointsRef.current = [];
        setFreeDrawingPoints([]);
        setActiveEqualDistanceGuide(null);
        activeEqualDistanceGuideRef.current = null;
        onSelectStation(null);
        onSelectStationIds?.([]);
        onSelectConnection(null);
        onSelectImage?.(null);
        onSelectText?.(null);
        onSetToolMode('select');
      } else if (e.key === 'v' || e.key === 'V') {
        onSetToolMode('select');
      } else if (e.key === 's' || e.key === 'S') {
        onSetToolMode('marquee_select');
      } else if (e.key === 'a' || e.key === 'A') {
        onSetToolMode('add_station');
      } else if (e.key === 'x' || e.key === 'X') {
        onSetToolMode('add_virtual_node');
      } else if (e.key === 'c' || e.key === 'C') {
        onSetToolMode('connect');
      } else if (e.key === '[' || e.key === '{' || e.key === ']' || e.key === '}') {
        const isUp = e.key === ']' || e.key === '}';
        const toExtreme = e.shiftKey || e.key === '{' || e.key === '}';
        if (selectedImageId && onUpdateImageZIndex) {
          const img = svgImages.find((i) => i.id === selectedImageId);
          if (img) {
            e.preventDefault();
            const cur = img.zIndex ?? -1;
            const next = toExtreme
              ? (isUp ? MAX_Z_ORDER : MIN_Z_ORDER)
              : clampZOrder(cur + (isUp ? 1 : -1));
            onUpdateImageZIndex(img.id, next);
          }
        } else if (selectedTextId && onUpdateTextZIndex) {
          const txt = svgTexts.find((t) => t.id === selectedTextId);
          if (txt) {
            e.preventDefault();
            const cur = txt.zIndex ?? 1;
            const next = toExtreme
              ? (isUp ? MAX_Z_ORDER : MIN_Z_ORDER)
              : clampZOrder(cur + (isUp ? 1 : -1));
            onUpdateTextZIndex(txt.id, next);
          }
        } else if (selectedConnectionId && onUpdateConnectionZIndex) {
          const conn = connections.find((c) => c.id === selectedConnectionId);
          if (conn) {
            e.preventDefault();
            const cur = conn.zIndex ?? 0;
            const next = toExtreme
              ? (isUp ? MAX_Z_ORDER : MIN_Z_ORDER)
              : clampZOrder(cur + (isUp ? 1 : -1));
            onUpdateConnectionZIndex(conn.id, next);
          }
        } else if (currentSelectedStationIds.length > 1 && onBatchUpdateStationsZIndex) {
          e.preventDefault();
          onBatchUpdateStationsZIndex(currentSelectedStationIds, isUp ? 1 : -1);
        } else if (selectedStationId && onUpdateStationZIndex) {
          const st = stations.find((s) => s.id === selectedStationId);
          if (st) {
            e.preventDefault();
            const cur = st.zIndex ?? 0;
            const next = toExtreme
              ? (isUp ? MAX_Z_ORDER : MIN_Z_ORDER)
              : clampZOrder(cur + (isUp ? 1 : -1));
            onUpdateStationZIndex(st.id, next);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    onDeleteSelected,
    onSelectStation,
    onSelectStationIds,
    onSelectConnection,
    onSelectImage,
    onSelectText,
    onSetToolMode,
    selectedConnectionId,
    selectedStationId,
    selectedImageId,
    selectedTextId,
    currentSelectedStationIds,
    connections,
    stations,
    svgImages,
    svgTexts,
    onUpdateConnectionZIndex,
    onUpdateStationZIndex,
    onBatchUpdateStationsZIndex,
    onUpdateImageZIndex,
    onUpdateTextZIndex,
  ]);

  // Batch alignment tools for selected stations
  const handleBatchAlignY = () => {
    if (currentSelectedStationIds.length < 2) return;
    const selectedStations = stations.filter((s) => currentSelectedStationIds.includes(s.id));
    if (selectedStations.length < 2) return;
    onRecordHistory?.();
    const targetY = selectedStations[0].y;
    const updates = selectedStations.map((s) => ({ id: s.id, x: s.x, y: targetY }));
    if (onUpdateStationsPos) {
      onUpdateStationsPos(updates);
    } else {
      updates.forEach((u) => onUpdateStationPos(u.id, u.x, u.y));
    }
  };

  const handleBatchAlignX = () => {
    if (currentSelectedStationIds.length < 2) return;
    const selectedStations = stations.filter((s) => currentSelectedStationIds.includes(s.id));
    if (selectedStations.length < 2) return;
    onRecordHistory?.();
    const targetX = selectedStations[0].x;
    const updates = selectedStations.map((s) => ({ id: s.id, x: targetX, y: s.y }));
    if (onUpdateStationsPos) {
      onUpdateStationsPos(updates);
    } else {
      updates.forEach((u) => onUpdateStationPos(u.id, u.x, u.y));
    }
  };

  const handleBatchDistributeH = () => {
    if (currentSelectedStationIds.length < 3) return;
    const sorted = stations
      .filter((s) => currentSelectedStationIds.includes(s.id))
      .sort((a, b) => a.x - b.x);
    if (sorted.length < 3) return;
    onRecordHistory?.();
    const minX = sorted[0].x;
    const maxX = sorted[sorted.length - 1].x;
    const step = (maxX - minX) / (sorted.length - 1);
    const updates = sorted.map((s, idx) => ({
      id: s.id,
      x: Math.round(minX + idx * step),
      y: s.y,
    }));
    if (onUpdateStationsPos) {
      onUpdateStationsPos(updates);
    } else {
      updates.forEach((u) => onUpdateStationPos(u.id, u.x, u.y));
    }
  };


  // Infinite Canvas Pan / Zoom via Wheel & Trackpad
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey || (!e.shiftKey && Math.abs(e.deltaY) > 0 && Math.abs(e.deltaX) === 0)) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newScale = Math.min(Math.max(viewTransform.scale * zoomFactor, 0.15), 4.0);

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newX = mouseX - ((mouseX - viewTransform.x) * newScale) / viewTransform.scale;
      const newY = mouseY - ((mouseY - viewTransform.y) * newScale) / viewTransform.scale;

      setViewTransform({ x: newX, y: newY, scale: newScale });
    } else {
      setViewTransform((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Zoom controls
  const handleZoom = (direction: 'in' | 'out') => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const factor = direction === 'in' ? 1.25 : 0.8;
    const newScale = Math.min(Math.max(viewTransform.scale * factor, 0.15), 4.0);

    const newX = centerX - ((centerX - viewTransform.x) * newScale) / viewTransform.scale;
    const newY = centerY - ((centerY - viewTransform.y) * newScale) / viewTransform.scale;

    setViewTransform({ x: newX, y: newY, scale: newScale });
  };

  // Reset to origin (0, 0)
  const handleResetToOrigin = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setViewTransform({
      x: rect.width / 2 - 200,
      y: rect.height / 2 - 150,
      scale: 1,
    });
  };

  // Fit all stations, images, and texts into view
  const handleFitView = () => {
    if (
      !containerRef.current ||
      (stations.length === 0 && svgImages.length === 0 && svgTexts.length === 0)
    ) {
      handleResetToOrigin();
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    stations.forEach((st) => {
      minX = Math.min(minX, st.x);
      maxX = Math.max(maxX, st.x);
      minY = Math.min(minY, st.y);
      maxY = Math.max(maxY, st.y);
    });

    svgImages.forEach((img) => {
      const hw = (img.width * (img.scale ?? 1) * (img.scaleX ?? 1)) / 2;
      const hh = (img.height * (img.scale ?? 1) * (img.scaleY ?? 1)) / 2;
      minX = Math.min(minX, img.x - hw);
      maxX = Math.max(maxX, img.x + hw);
      minY = Math.min(minY, img.y - hh);
      maxY = Math.max(maxY, img.y + hh);
    });

    svgTexts.forEach((txt) => {
      minX = Math.min(minX, txt.x - 60);
      maxX = Math.max(maxX, txt.x + 60);
      minY = Math.min(minY, txt.y - 30);
      maxY = Math.max(maxY, txt.y + 30);
    });

    const padding = 100;
    const width = Math.max(maxX - minX + padding * 2, 400);
    const height = Math.max(maxY - minY + padding * 2, 400);

    const scaleX = rect.width / width;
    const scaleY = rect.height / height;
    const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 1.8);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setViewTransform({
      x: rect.width / 2 - centerX * newScale,
      y: rect.height / 2 - centerY * newScale,
      scale: newScale,
    });
  };

  // Window Pointer listeners for zero-lag drag, freehand trajectory recording & waypoint adjustment
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      // 0. 手機與平板多點觸控手勢：雙指縮放 (Pinch-to-Zoom) 與雙指平移 (Two-Finger Pan)
      if (e.pointerType === 'touch') {
        if (touchPointsRef.current.has(e.pointerId)) {
          touchPointsRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
        }
        if (touchPointsRef.current.size >= 2 && pinchStartRef.current) {
          const pts = Array.from(touchPointsRef.current.values());
          const p1 = pts[0];
          const p2 = pts[1];
          const curDist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
          const curCenterX = (p1.clientX + p2.clientX) / 2;
          const curCenterY = (p1.clientY + p2.clientY) / 2;

          const ratio = curDist / pinchStartRef.current.dist;
          const nextScale = Math.min(Math.max(pinchStartRef.current.scale * ratio, 0.15), 4.0);

          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relStartX = pinchStartRef.current.centerX - rect.left;
            const relStartY = pinchStartRef.current.centerY - rect.top;
            const relCurX = curCenterX - rect.left;
            const relCurY = curCenterY - rect.top;

            const worldX = (relStartX - pinchStartRef.current.viewX) / pinchStartRef.current.scale;
            const worldY = (relStartY - pinchStartRef.current.viewY) / pinchStartRef.current.scale;

            const nextViewX = relCurX - worldX * nextScale;
            const nextViewY = relCurY - worldY * nextScale;

            setViewTransform({ x: nextViewX, y: nextViewY, scale: nextScale });
          }
          return;
        }
      }

      // Stage 3: SVG Image Free Transform Drag
      if (imageTransformRef.current) {
        const info = imageTransformRef.current;
        const curWorld = screenToWorld(e.clientX, e.clientY, false);
        const dx = curWorld.rawX - info.centerX;
        const dy = curWorld.rawY - info.centerY;

        if (!info.hasRecordedHistory) {
          info.hasRecordedHistory = true;
          onRecordHistory?.();
        }

        const img = svgImages.find((i) => i.id === info.imageId);
        if (img && onUpdateImage) {
          if (info.handle === 'rotate') {
            const curAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
            let nextRot = info.origRotation + (curAngle - info.startAngle);
            if (e.shiftKey) {
              nextRot = Math.round(nextRot / 15) * 15;
            }
            const normalizedRot = normalizeSvgAngle(nextRot);
            onUpdateImage({ ...img, rotation: normalizedRot });
            setTransformHudText(`${t('sidebar.rotationAngle')} ${normalizedRot}°`);
          } else {
            const rad = -(info.origRotation * Math.PI) / 180;
            const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
            const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

            if (info.handle === 'e' || info.handle === 'w') {
              const nextScaleX = normalizeSvgScale(
                Math.abs(localX) / Math.max(8, info.baseHalfW * info.origScale),
                0.08
              );
              onUpdateImage({ ...img, scaleX: nextScaleX });
              setTransformHudText(`X ${nextScaleX}×`);
            } else if (info.handle === 'n' || info.handle === 's') {
              const nextScaleY = normalizeSvgScale(
                Math.abs(localY) / Math.max(8, info.baseHalfH * info.origScale),
                0.08
              );
              onUpdateImage({ ...img, scaleY: nextScaleY });
              setTransformHudText(`Y ${nextScaleY}×`);
            } else if (e.shiftKey) {
              const nextScaleX = normalizeSvgScale(
                Math.abs(localX) / Math.max(8, info.baseHalfW * info.origScale),
                0.08
              );
              const nextScaleY = normalizeSvgScale(
                Math.abs(localY) / Math.max(8, info.baseHalfH * info.origScale),
                0.08
              );
              onUpdateImage({ ...img, scaleX: nextScaleX, scaleY: nextScaleY });
              setTransformHudText(`${nextScaleX}× · ${nextScaleY}×`);
            } else {
              const curDist = Math.max(8, Math.hypot(dx, dy));
              const nextScale = normalizeSvgScale(
                info.origScale * (curDist / Math.max(8, info.startDist)),
                0.08
              );
              onUpdateImage({ ...img, scale: nextScale });
              setTransformHudText(`${t('canvas.scale')} ${nextScale}×`);
            }
          }
        }
        return;
      }

      // Stage 3: SVG Text Free Transform Drag
      if (textTransformRef.current) {
        const info = textTransformRef.current;
        const curWorld = screenToWorld(e.clientX, e.clientY, false);
        const dx = curWorld.rawX - info.centerX;
        const dy = curWorld.rawY - info.centerY;

        if (!info.hasRecordedHistory) {
          info.hasRecordedHistory = true;
          onRecordHistory?.();
        }

        const txt = svgTexts.find((t) => t.id === info.textId);
        if (txt && onUpdateText) {
          if (info.handle === 'rotate') {
            const curAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
            let nextRot = info.origRotation + (curAngle - info.startAngle);
            if (e.shiftKey) {
              nextRot = Math.round(nextRot / 15) * 15;
            }
            const normalizedRot = normalizeSvgAngle(nextRot);
            onUpdateText({ ...txt, rotation: normalizedRot });
            setTransformHudText(`${t('sidebar.rotationAngle')} ${normalizedRot}°`);
          } else {
            const rad = -(info.origRotation * Math.PI) / 180;
            const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
            const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

            if (info.handle === 'e' || info.handle === 'w') {
              const nextScaleX = normalizeSvgScale(
                Math.abs(localX) / Math.max(8, info.baseHalfW * info.origScale),
                0.15
              );
              onUpdateText({ ...txt, scaleX: nextScaleX });
              setTransformHudText(`X ${nextScaleX}×`);
            } else if (info.handle === 'n' || info.handle === 's') {
              const nextScaleY = normalizeSvgScale(
                Math.abs(localY) / Math.max(8, info.baseHalfH * info.origScale),
                0.15
              );
              onUpdateText({ ...txt, scaleY: nextScaleY });
              setTransformHudText(`Y ${nextScaleY}×`);
            } else if (e.shiftKey) {
              const nextScaleX = normalizeSvgScale(
                Math.abs(localX) / Math.max(8, info.baseHalfW * info.origScale),
                0.15
              );
              const nextScaleY = normalizeSvgScale(
                Math.abs(localY) / Math.max(8, info.baseHalfH * info.origScale),
                0.15
              );
              onUpdateText({ ...txt, scaleX: nextScaleX, scaleY: nextScaleY });
              setTransformHudText(`${nextScaleX}× · ${nextScaleY}×`);
            } else {
              const curDist = Math.max(8, Math.hypot(dx, dy));
              const nextScale = normalizeSvgScale(
                info.origScale * (curDist / Math.max(8, info.startDist)),
                0.15
              );
              onUpdateText({ ...txt, scale: nextScale });
              setTransformHudText(`${t('canvas.scale')} ${nextScale}×`);
            }
          }
        }
        return;
      }

      // SVG Image Dragging
      if (imageDragRef.current) {
        const { imageId, startWorldX, startWorldY, origX, origY } = imageDragRef.current;
        const curWorld = screenToWorld(e.clientX, e.clientY, false);
        const deltaX = curWorld.rawX - startWorldX;
        const deltaY = curWorld.rawY - startWorldY;

        if (!imageDragRef.current.hasRecordedHistory && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
          imageDragRef.current.hasRecordedHistory = true;
          onRecordHistory?.();
        }

        const img = svgImages.find((i) => i.id === imageId);
        if (img && onUpdateImage) {
          const isCtrlActive = e.ctrlKey || e.metaKey || isCtrlPressedRef.current;
          const nextX = gridSnap && !isCtrlActive ? snapToGrid(origX + deltaX, gridSize) : Math.round(origX + deltaX);
          const nextY = gridSnap && !isCtrlActive ? snapToGrid(origY + deltaY, gridSize) : Math.round(origY + deltaY);
          onUpdateImage({ ...img, x: nextX, y: nextY });
        }
        return;
      }

      // SVG Text Dragging
      if (textDragRef.current) {
        const { textId, startWorldX, startWorldY, origX, origY } = textDragRef.current;
        const curWorld = screenToWorld(e.clientX, e.clientY, false);
        const deltaX = curWorld.rawX - startWorldX;
        const deltaY = curWorld.rawY - startWorldY;

        if (!textDragRef.current.hasRecordedHistory && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
          textDragRef.current.hasRecordedHistory = true;
          onRecordHistory?.();
        }

        const txt = svgTexts.find((t) => t.id === textId);
        if (txt && onUpdateText) {
          const isCtrlActive = e.ctrlKey || e.metaKey || isCtrlPressedRef.current;
          const nextX = gridSnap && !isCtrlActive ? snapToGrid(origX + deltaX, gridSize) : Math.round(origX + deltaX);
          const nextY = gridSnap && !isCtrlActive ? snapToGrid(origY + deltaY, gridSize) : Math.round(origY + deltaY);
          onUpdateText({ ...txt, x: nextX, y: nextY });
        }
        return;
      }

      // Stage 3: Single Station Free SVG Transform Drag
      if (stationTransformRef.current) {
        const info = stationTransformRef.current;
        const curWorld = screenToWorld(e.clientX, e.clientY, false);
        const dx = curWorld.rawX - info.centerX;
        const dy = curWorld.rawY - info.centerY;

        if (!info.hasRecordedHistory) {
          info.hasRecordedHistory = true;
          onRecordHistory?.();
        }

        const st = stations.find((s) => s.id === info.stationId);
        if (st && onUpdateStation) {
          if (info.handle === 'rotate') {
            const curAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
            let nextRot = info.origRotation + (curAngle - info.startAngle);
            if (e.shiftKey) {
              nextRot = Math.round(nextRot / 15) * 15;
            }
            const normalizedRot = normalizeSvgAngle(nextRot);
            onUpdateStation({ ...st, rotation: normalizedRot });
            setTransformHudText(`${t('sidebar.rotationAngle')} ${normalizedRot}°`);
          } else {
            const rad = -(info.origRotation * Math.PI) / 180;
            const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
            const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

            if (info.handle === 'e' || info.handle === 'w') {
              const nextScaleX = normalizeSvgScale(
                Math.abs(localX) / Math.max(4, info.baseHalf * info.origScale),
                0.15
              );
              onUpdateStation({ ...st, scaleX: nextScaleX });
              setTransformHudText(`X ${nextScaleX}×`);
            } else if (info.handle === 'n' || info.handle === 's') {
              const nextScaleY = normalizeSvgScale(
                Math.abs(localY) / Math.max(4, info.baseHalf * info.origScale),
                0.15
              );
              onUpdateStation({ ...st, scaleY: nextScaleY });
              setTransformHudText(`Y ${nextScaleY}×`);
            } else if (e.shiftKey) {
              const nextScaleX = normalizeSvgScale(
                Math.abs(localX) / Math.max(4, info.baseHalf * info.origScale),
                0.15
              );
              const nextScaleY = normalizeSvgScale(
                Math.abs(localY) / Math.max(4, info.baseHalf * info.origScale),
                0.15
              );
              onUpdateStation({ ...st, scaleX: nextScaleX, scaleY: nextScaleY });
              setTransformHudText(`${nextScaleX}× · ${nextScaleY}×`);
            } else {
              const curDist = Math.max(4, Math.hypot(dx, dy));
              const nextScale = normalizeSvgScale(
                info.origScale * (curDist / Math.max(4, info.startDist)),
                0.15
              );
              onUpdateStation({ ...st, scale: nextScale });
              setTransformHudText(`${t('canvas.scale')} ${nextScale}×`);
            }
          }
        }
        return;
      }

      // Stage 3: Multi-Station Group Free SVG Transform Drag
      if (groupTransformRef.current) {
        const info = groupTransformRef.current;
        const curWorld = screenToWorld(e.clientX, e.clientY, false);
        const dx = curWorld.rawX - info.cx;
        const dy = curWorld.rawY - info.cy;

        if (!info.hasRecordedHistory) {
          info.hasRecordedHistory = true;
          onRecordHistory?.();
        }

        if (info.handle === 'rotate') {
          const curAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
          let deltaDeg = curAngle - info.startAngle;
          if (e.shiftKey) {
            deltaDeg = Math.round(deltaDeg / 15) * 15;
          }
          const rad = (deltaDeg * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const updates = info.initialStations.map((s) => ({
            id: s.id,
            x: Math.round(info.cx + (s.x - info.cx) * cos - (s.y - info.cy) * sin),
            y: Math.round(info.cy + (s.x - info.cx) * sin + (s.y - info.cy) * cos),
          }));
          if (onBatchUpdateStations) {
            onBatchUpdateStations(updates);
          } else {
            onUpdateStationsPos?.(updates);
          }
          setTransformHudText(`${t('sidebar.rotationAngle')} ${Math.round(deltaDeg)}°`);
        } else {
          let ratioX = 1;
          let ratioY = 1;
          let uniformRatio = 1;

          if (info.handle === 'e' || info.handle === 'w') {
            ratioX = Math.max(0.1, Math.abs(dx) / Math.max(8, info.halfW));
            setTransformHudText(`X ${ratioX.toFixed(2)}×`);
          } else if (info.handle === 'n' || info.handle === 's') {
            ratioY = Math.max(0.1, Math.abs(dy) / Math.max(8, info.halfH));
            setTransformHudText(`Y ${ratioY.toFixed(2)}×`);
          } else if (e.shiftKey) {
            ratioX = Math.max(0.1, Math.abs(dx) / Math.max(8, info.halfW));
            ratioY = Math.max(0.1, Math.abs(dy) / Math.max(8, info.halfH));
            setTransformHudText(`${ratioX.toFixed(2)}× · ${ratioY.toFixed(2)}×`);
          } else {
            const curDist = Math.max(8, Math.hypot(dx, dy));
            uniformRatio = Math.max(0.1, curDist / Math.max(8, info.startDist));
            ratioX = uniformRatio;
            ratioY = uniformRatio;
            setTransformHudText(`${t('canvas.scale')} ${uniformRatio.toFixed(2)}×`);
          }

          const updates = info.initialStations.map((s) => ({
            id: s.id,
            x: Math.round(info.cx + (s.x - info.cx) * ratioX),
            y: Math.round(info.cy + (s.y - info.cy) * ratioY),
            ...(e.altKey && uniformRatio !== 1 && info.handle !== 'e' && info.handle !== 'w' && info.handle !== 'n' && info.handle !== 's'
              ? { scale: normalizeSvgScale(s.scale * uniformRatio, 0.15) }
              : {}),
          }));
          if (onBatchUpdateStations) {
            onBatchUpdateStations(updates);
          } else {
            onUpdateStationsPos?.(updates);
          }
        }
        return;
      }

      // 框選多個站點 (Marquee box selection drag)
      if (marqueeRef.current) {
        const moveDist = Math.hypot(
          e.clientX - marqueeRef.current.startClientX,
          e.clientY - marqueeRef.current.startClientY
        );

        if (!marqueeRef.current.hasDragged && moveDist >= 3) {
          marqueeRef.current.hasDragged = true;
        }

        if (marqueeRef.current.hasDragged) {
          const curWorld = screenToWorld(e.clientX, e.clientY, false);
          const startX = marqueeRef.current.startWorldX;
          const startY = marqueeRef.current.startWorldY;
          const endX = curWorld.rawX;
          const endY = curWorld.rawY;

          setMarqueeBox({
            startX,
            startY,
            endX,
            endY,
          });

          const minX = Math.min(startX, endX);
          const maxX = Math.max(startX, endX);
          const minY = Math.min(startY, endY);
          const maxY = Math.max(startY, endY);

          // Find stations overlapping or inside selection box (with tolerance for station radius)
          const insideIds = stations
            .filter((st) => {
              const radius = st.isVirtual ? 6 : 14;
              return (
                st.x + radius >= minX &&
                st.x - radius <= maxX &&
                st.y + radius >= minY &&
                st.y - radius <= maxY
              );
            })
            .map((st) => st.id);

          const combined = Array.from(new Set([...marqueeRef.current.initialSelectedIds, ...insideIds]));
          onSelectStationIds?.(combined);
          if (combined.length > 0) {
            onSelectStation(combined[0]);
          } else {
            onSelectStation(null);
          }
        }
        return;
      }

      // 自由站名拖動處理 (Draggable station name)
      if (labelDragRef.current) {
        const { stationId, startClientX, startClientY, origDx, origDy } = labelDragRef.current;
        const deltaX = (e.clientX - startClientX) / viewTransform.scale;
        const deltaY = (e.clientY - startClientY) / viewTransform.scale;

        if (!labelDragRef.current.hasRecordedHistory && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
          labelDragRef.current.hasRecordedHistory = true;
          onRecordHistory?.();
        }

        const newDx = Math.round(origDx + deltaX);
        const newDy = Math.round(origDy + deltaY);

        const st = stations.find((s) => s.id === stationId);
        if (st && onUpdateStation) {
          onUpdateStation({
            ...st,
            labelPosition: 'custom',
            labelOffset: { x: newDx, y: newDy },
          });
        }
        return;
      }

      const worldPos = screenToWorld(e.clientX, e.clientY);
      setMouseCanvasPos({ x: worldPos.x, y: worldPos.y });

      // Freehand mouse trajectory recording while connecting in free_curve mode
      if (toolMode === 'connect' && connectSourceStationId && activeRouteType === 'free_curve') {
        const lastPt = freeDrawingPointsRef.current[freeDrawingPointsRef.current.length - 1];
        const rawPt = screenToWorld(e.clientX, e.clientY, false);
        const dist = lastPt
          ? Math.hypot(rawPt.rawX - lastPt.x, rawPt.rawY - lastPt.y)
          : Infinity;
        if (dist >= 6) {
          const newPt: Point = {
            x: Math.round(rawPt.rawX),
            y: Math.round(rawPt.rawY),
          };
          const nextPoints = [...freeDrawingPointsRef.current, newPt];
          freeDrawingPointsRef.current = nextPoints;
          setFreeDrawingPoints(nextPoints);
        }
      }

      // 等距對齊紅色虛線計算：當開啟對齊模式 (nodeAlign 或 Ctrl) 且在連線模式中
      if (toolMode === 'connect' && connectSourceStationId) {
        const isAlignmentActive = e.ctrlKey || e.metaKey || isCtrlPressedRef.current || !!nodeAlign;
        const sourceSt = stations.find((s) => s.id === connectSourceStationId);

        if (sourceSt && isAlignmentActive) {
          interface RefSeg {
            otherStation: Station;
            distance: number;
          }
          const directRefs: RefSeg[] = [];
          const otherRefs: RefSeg[] = [];

          connections.forEach((conn) => {
            const isFrom = conn.fromStationId === sourceSt.id;
            const isTo = conn.toStationId === sourceSt.id;
            if (isFrom || isTo) {
              const otherId = isFrom ? conn.toStationId : conn.fromStationId;
              const otherSt = stations.find((s) => s.id === otherId);
              if (otherSt) {
                const d = Math.hypot(otherSt.x - sourceSt.x, otherSt.y - sourceSt.y);
                if (d > 15) {
                  directRefs.push({ otherStation: otherSt, distance: d });
                }
              }
            } else {
              const s1 = stations.find((s) => s.id === conn.fromStationId);
              const s2 = stations.find((s) => s.id === conn.toStationId);
              if (s1 && s2) {
                const d = Math.hypot(s2.x - s1.x, s2.y - s1.y);
                if (d > 15) {
                  otherRefs.push({ otherStation: s2, distance: d });
                }
              }
            }
          });

          const candidateRefs = directRefs.length > 0 ? directRefs : otherRefs;

          if (candidateRefs.length > 0) {
            const snapTolerance = Math.round(24 / Math.max(0.4, Math.min(2.5, viewTransform.scale)));
            const rawPt = screenToWorld(e.clientX, e.clientY, false);
            const dx = rawPt.rawX - sourceSt.x;
            const dy = rawPt.rawY - sourceSt.y;
            const currentDist = Math.hypot(dx, dy);

            if (currentDist >= 20) {
              let bestRef: RefSeg | null = null;
              let minDiff = Infinity;

              for (const ref of candidateRefs) {
                const diff = Math.abs(currentDist - ref.distance);
                if (diff <= snapTolerance && diff < minDiff) {
                  minDiff = diff;
                  bestRef = ref;
                }
              }

              if (bestRef) {
                const targetDist = bestRef.distance;
                const currentRad = Math.atan2(dy, dx);
                const currentDeg = ((currentRad * 180) / Math.PI + 360) % 360;

                // 檢查是否與前一段線段同向共線延伸 (直線筆直貫穿)
                const collinearRad = Math.atan2(sourceSt.y - bestRef.otherStation.y, sourceSt.x - bestRef.otherStation.x);
                const collinearDeg = ((collinearRad * 180) / Math.PI + 360) % 360;
                const diffCollinear = Math.min(
                  Math.abs(currentDeg - collinearDeg),
                  360 - Math.abs(currentDeg - collinearDeg)
                );

                // 檢查是否與八方軸向 (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°) 對齊
                const nearest8 = (Math.round(currentDeg / 45) * 45) % 360;
                const diff8 = Math.min(
                  Math.abs(currentDeg - nearest8),
                  360 - Math.abs(currentDeg - nearest8)
                );

                let snappedRad = currentRad;
                if (diffCollinear <= 22.5) {
                  snappedRad = collinearRad;
                } else if (diff8 <= 22.5) {
                  snappedRad = (nearest8 * Math.PI) / 180;
                }

                let finalTargetX = Math.round(sourceSt.x + targetDist * Math.cos(snappedRad));
                let finalTargetY = Math.round(sourceSt.y + targetDist * Math.sin(snappedRad));

                // 檢查周圍是否剛好有另外一個現有站點
                const nearbyOtherStation = stations.find(
                  (s) => s.id !== sourceSt.id && Math.hypot(s.x - finalTargetX, s.y - finalTargetY) <= snapTolerance * 1.5
                );

                if (nearbyOtherStation) {
                  finalTargetX = nearbyOtherStation.x;
                  finalTargetY = nearbyOtherStation.y;
                }

                const guide: EqualDistanceGuide = {
                  id: `eq-${sourceSt.id}-${bestRef.otherStation.id}`,
                  sourceStation: sourceSt,
                  refStation: bestRef.otherStation,
                  targetPos: { x: finalTargetX, y: finalTargetY },
                  targetStation: nearbyOtherStation,
                  distance: targetDist,
                  label: t('canvas.equalDist', { dist: Math.round(targetDist) }),
                };

                activeEqualDistanceGuideRef.current = guide;
                setActiveEqualDistanceGuide(guide);
                setMouseCanvasPos({ x: finalTargetX, y: finalTargetY });
              } else {
                activeEqualDistanceGuideRef.current = null;
                setActiveEqualDistanceGuide(null);
              }
            } else {
              activeEqualDistanceGuideRef.current = null;
              setActiveEqualDistanceGuide(null);
            }
          } else {
            activeEqualDistanceGuideRef.current = null;
            setActiveEqualDistanceGuide(null);
          }
        } else {
          activeEqualDistanceGuideRef.current = null;
          setActiveEqualDistanceGuide(null);
        }
      }

      // Waypoint dragging for freehand routes
      if (waypointDragRef.current) {
        const { connId, index, startWorldX, startWorldY, origPoint } = waypointDragRef.current;
        const deltaX = worldPos.rawX - startWorldX;
        const deltaY = worldPos.rawY - startWorldY;

        if (!waypointDragRef.current.hasRecordedHistory && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
          waypointDragRef.current.hasRecordedHistory = true;
          onRecordHistory?.();
        }

        const rawTargetX = origPoint.x + deltaX;
        const rawTargetY = origPoint.y + deltaY;
        const newX = gridSnap ? snapToGrid(rawTargetX, gridSize) : Math.round(rawTargetX);
        const newY = gridSnap ? snapToGrid(rawTargetY, gridSize) : Math.round(rawTargetY);

        const targetConn = connections.find((c) => c.id === connId);
        if (targetConn && targetConn.waypoints) {
          const nextWaypoints = [...targetConn.waypoints];
          nextWaypoints[index] = { x: newX, y: newY };
          onUpdateConnectionWaypoints(connId, nextWaypoints);
        }
        return;
      }

      // Station Drag: lock-step with lines (支援單一站點與多站點批次移動)
      if (dragInfoRef.current) {
        const { stationId, startWorldX, startWorldY, startStationX, startStationY, batchStationIds, initialPositions } = dragInfoRef.current;
        const deltaX = worldPos.rawX - startWorldX;
        const deltaY = worldPos.rawY - startWorldY;

        if (!dragInfoRef.current.hasRecordedHistory && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
          dragInfoRef.current.hasRecordedHistory = true;
          onRecordHistory?.();
        }

        const candX = Math.round(startStationX + deltaX);
        const candY = Math.round(startStationY + deltaY);

        const applyStationPosition = (targetX: number, targetY: number) => {
          const moveDx = targetX - startStationX;
          const moveDy = targetY - startStationY;
          if (batchStationIds && batchStationIds.length > 1) {
            const updates = batchStationIds.map((id) => {
              const init = initialPositions[id] || { x: 0, y: 0 };
              return {
                id,
                x: init.x + moveDx,
                y: init.y + moveDy,
              };
            });
            if (onUpdateStationsPos) {
              onUpdateStationsPos(updates);
            } else {
              updates.forEach((u) => onUpdateStationPos(u.id, u.x, u.y));
            }
          } else {
            onUpdateStationPos(stationId, targetX, targetY);
          }
        };

        // 平滑移動模式：按住 Ctrl 或開啟對齊模式觸發八方虛線與等距紅色虛線對齊
        const isCtrlActive = e.ctrlKey || e.metaKey || isCtrlPressedRef.current || !!nodeAlign;

        if (gridSnap && !isCtrlActive) {
          setActiveAlignmentGuides([]);
          activeEqualDistanceGuideRef.current = null;
          setActiveEqualDistanceGuide(null);
          applyStationPosition(
            snapToGrid(candX, gridSize),
            snapToGrid(candY, gridSize)
          );
          return;
        }

        if (!isCtrlActive) {
          setActiveAlignmentGuides([]);
          activeEqualDistanceGuideRef.current = null;
          setActiveEqualDistanceGuide(null);
          applyStationPosition(candX, candY);
          return;
        }

        // 觸發 Ctrl：計算與其他節點的八方 (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°) 軸向對齊與虛線
        const candidateStations = stations.filter((s) => !batchStationIds?.includes(s.id));
        if (candidateStations.length === 0) {
          setActiveAlignmentGuides([]);
          applyStationPosition(candX, candY);
          return;
        }

        const snapTolerance = Math.round(15 / Math.max(0.4, Math.min(2.5, viewTransform.scale)));
        let bestH: { station: Station; dist: number } | null = null;
        let bestV: { station: Station; dist: number } | null = null;
        let bestDiag45: { station: Station; dist: number; C: number } | null = null;
        let bestDiag135: { station: Station; dist: number; S: number } | null = null;

        for (const other of candidateStations) {
          // 1. 水平對齊 (0° / 180°)
          const distH = Math.abs(candY - other.y);
          if (distH <= snapTolerance && (!bestH || distH < bestH.dist)) {
            bestH = { station: other, dist: distH };
          }

          // 2. 垂直對齊 (90° / 270°)
          const distV = Math.abs(candX - other.x);
          if (distV <= snapTolerance && (!bestV || distV < bestV.dist)) {
            bestV = { station: other, dist: distV };
          }

          // 3. 正斜 45° 對角線 (45° / 225°: y - x = other.y - other.x)
          const C = other.y - other.x;
          const distDiag45 = Math.abs((candY - candX) - C) / Math.SQRT2;
          if (distDiag45 <= snapTolerance && (!bestDiag45 || distDiag45 < bestDiag45.dist)) {
            bestDiag45 = { station: other, dist: distDiag45, C };
          }

          // 4. 反斜 135° 對角線 (135° / 315°: y + x = other.y + other.x)
          const S = other.x + other.y;
          const distDiag135 = Math.abs((candX + candY) - S) / Math.SQRT2;
          if (distDiag135 <= snapTolerance && (!bestDiag135 || distDiag135 < bestDiag135.dist)) {
            bestDiag135 = { station: other, dist: distDiag135, S };
          }
        }

        let finalX = candX;
        let finalY = candY;
        const guides: AlignmentGuide[] = [];

        const createHGuide = (target: Station, x: number, y: number): AlignmentGuide => ({
          id: `guide-h-${target.id}`,
          type: 'horizontal',
          targetStation: target,
          x1: Math.min(target.x, x) - 220,
          y1: target.y,
          x2: Math.max(target.x, x) + 220,
          y2: target.y,
          angleLabel: target.x < x ? `0° ${t('canvas.alignH')}` : `180° ${t('canvas.alignH')}`,
        });

        const createVGuide = (target: Station, x: number, y: number): AlignmentGuide => ({
          id: `guide-v-${target.id}`,
          type: 'vertical',
          targetStation: target,
          x1: target.x,
          y1: Math.min(target.y, y) - 220,
          x2: target.x,
          y2: Math.max(target.y, y) + 220,
          angleLabel: target.y < y ? `90° ${t('canvas.alignV')}` : `270° ${t('canvas.alignV')}`,
        });

        const createDiag45Guide = (target: Station, x: number, y: number): AlignmentGuide => {
          const span = Math.max(Math.abs(x - target.x), 160) + 160;
          const midX = (target.x + x) / 2;
          const midY = (target.y + y) / 2;
          return {
            id: `guide-d45-${target.id}`,
            type: 'diagonal_45',
            targetStation: target,
            x1: midX - span,
            y1: midY - span,
            x2: midX + span,
            y2: midY + span,
            angleLabel: x >= target.x ? `45° ${t('canvas.aligning')}` : `225° ${t('canvas.aligning')}`,
          };
        };

        const createDiag135Guide = (target: Station, x: number, y: number): AlignmentGuide => {
          const span = Math.max(Math.abs(x - target.x), 160) + 160;
          const midX = (target.x + x) / 2;
          const midY = (target.y + y) / 2;
          return {
            id: `guide-d135-${target.id}`,
            type: 'diagonal_135',
            targetStation: target,
            x1: midX - span,
            y1: midY + span,
            x2: midX + span,
            y2: midY - span,
            angleLabel: x >= target.x ? `315° ${t('canvas.aligning')}` : `135° ${t('canvas.aligning')}`,
          };
        };

        if (bestH && bestV) {
          finalX = bestV.station.x;
          finalY = bestH.station.y;
          guides.push(createHGuide(bestH.station, finalX, finalY));
          guides.push(createVGuide(bestV.station, finalX, finalY));
        } else if (bestH) {
          finalY = bestH.station.y;
          const bestDiag = !bestDiag45 || (bestDiag135 && bestDiag135.dist < bestDiag45.dist) ? bestDiag135 : bestDiag45;
          if (bestDiag && bestDiag.dist <= snapTolerance) {
            if (bestDiag === bestDiag45) {
              finalX = finalY - bestDiag45.C;
              guides.push(createDiag45Guide(bestDiag45.station, finalX, finalY));
            } else if (bestDiag135) {
              finalX = bestDiag135.S - finalY;
              guides.push(createDiag135Guide(bestDiag135.station, finalX, finalY));
            }
          }
          guides.push(createHGuide(bestH.station, finalX, finalY));
        } else if (bestV) {
          finalX = bestV.station.x;
          const bestDiag = !bestDiag45 || (bestDiag135 && bestDiag135.dist < bestDiag45.dist) ? bestDiag135 : bestDiag45;
          if (bestDiag && bestDiag.dist <= snapTolerance) {
            if (bestDiag === bestDiag45) {
              finalY = finalX + bestDiag45.C;
              guides.push(createDiag45Guide(bestDiag45.station, finalX, finalY));
            } else if (bestDiag135) {
              finalY = bestDiag135.S - finalX;
              guides.push(createDiag135Guide(bestDiag135.station, finalX, finalY));
            }
          }
          guides.push(createVGuide(bestV.station, finalX, finalY));
        } else {
          const bestDiag = !bestDiag45 || (bestDiag135 && bestDiag135.dist < bestDiag45.dist) ? bestDiag135 : bestDiag45;
          if (bestDiag && bestDiag.dist <= snapTolerance) {
            if (bestDiag === bestDiag45) {
              const projX = (candX + candY - bestDiag45.C) / 2;
              const projY = (candX + candY + bestDiag45.C) / 2;
              finalX = Math.round(projX);
              finalY = Math.round(projY);
              guides.push(createDiag45Guide(bestDiag45.station, finalX, finalY));
            } else if (bestDiag135) {
              const projX = (candX - candY + bestDiag135.S) / 2;
              const projY = (candY - candX + bestDiag135.S) / 2;
              finalX = Math.round(projX);
              finalY = Math.round(projY);
              guides.push(createDiag135Guide(bestDiag135.station, finalX, finalY));
            }
          }
        }

        // 當開啟對齊模式時，如果當前拖動的節點已連接其他站點，檢查與相鄰節點的線段距離是否能與既有線段等距
        let eqGuide: EqualDistanceGuide | null = null;
        const stationConns = connections.filter(
          (c) => c.fromStationId === stationId || c.toStationId === stationId
        );
        if (stationConns.length > 0) {
          for (const conn of stationConns) {
            const parentId = conn.fromStationId === stationId ? conn.toStationId : conn.fromStationId;
            const parentSt = stations.find((s) => s.id === parentId);
            if (!parentSt) continue;

            const otherConns = connections.filter(
              (c) =>
                (c.fromStationId === parentId || c.toStationId === parentId) &&
                c.id !== conn.id
            );
            for (const oConn of otherConns) {
              const refId = oConn.fromStationId === parentId ? oConn.toStationId : oConn.fromStationId;
              const refSt = stations.find((s) => s.id === refId);
              if (!refSt) continue;
              const refDist = Math.hypot(refSt.x - parentSt.x, refSt.y - parentSt.y);
              if (refDist < 15) continue;

              const curDist = Math.hypot(finalX - parentSt.x, finalY - parentSt.y);
              if (Math.abs(curDist - refDist) <= snapTolerance) {
                const angle = Math.atan2(finalY - parentSt.y, finalX - parentSt.x);
                finalX = Math.round(parentSt.x + refDist * Math.cos(angle));
                finalY = Math.round(parentSt.y + refDist * Math.sin(angle));
                eqGuide = {
                  id: `eq-drag-${parentSt.id}-${refSt.id}`,
                  sourceStation: parentSt,
                  refStation: refSt,
                  targetPos: { x: finalX, y: finalY },
                  targetStation: stations.find((s) => s.id === stationId),
                  distance: refDist,
                  label: t('canvas.equalDist', { dist: Math.round(refDist) }),
                };
                break;
              }
            }
            if (eqGuide) break;
          }
        }
        activeEqualDistanceGuideRef.current = eqGuide;
        setActiveEqualDistanceGuide(eqGuide);

        setActiveAlignmentGuides(guides);
        applyStationPosition(finalX, finalY);
        return;
      }

      // Effortless canvas panning on mouse slide
      if (canvasPointerDownRef.current) {
        const dx = e.clientX - canvasPointerDownRef.current.clientX;
        const dy = e.clientY - canvasPointerDownRef.current.clientY;

        if (!hasDraggedCanvasRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          hasDraggedCanvasRef.current = true;
          setIsPanning(true);
        }

        if (hasDraggedCanvasRef.current) {
          setViewTransform((prev) => ({
            ...prev,
            x: e.clientX - panStartRef.current.x,
            y: e.clientY - panStartRef.current.y,
          }));
        }
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      // Clean up touch points tracking for pinch-to-zoom
      if (e.pointerType === 'touch') {
        touchPointsRef.current.delete(e.pointerId);
        if (touchPointsRef.current.size < 2) {
          pinchStartRef.current = null;
        }
      }

      // Release marquee box selection
      if (marqueeRef.current) {
        const info = marqueeRef.current;
        const didDrag = info.hasDragged;
        const curWorld = screenToWorld(e.clientX, e.clientY, false);
        const startX = info.startWorldX;
        const startY = info.startWorldY;
        const endX = curWorld.rawX;
        const endY = curWorld.rawY;

        marqueeRef.current = null;
        setMarqueeBox(null);

        if (!didDrag) {
          // Clean click on empty canvas without dragging: clear selection
          if (!info.isAdditive) {
            onSelectStationIds?.([]);
            onSelectStation(null);
            onSelectConnection(null);
          }
        } else {
          // Finalize selection from drag
          const minX = Math.min(startX, endX);
          const maxX = Math.max(startX, endX);
          const minY = Math.min(startY, endY);
          const maxY = Math.max(startY, endY);

          const insideIds = stations
            .filter((st) => {
              const radius = st.isVirtual ? 6 : 14;
              return (
                st.x + radius >= minX &&
                st.x - radius <= maxX &&
                st.y + radius >= minY &&
                st.y - radius <= maxY
              );
            })
            .map((st) => st.id);

          const combined = Array.from(new Set([...info.initialSelectedIds, ...insideIds]));
          onSelectStationIds?.(combined);
          if (combined.length > 0) {
            onSelectStation(combined[0]);
          } else {
            onSelectStation(null);
          }
        }
        return;
      }

      // Release Stage 3 free transforms
      if (imageTransformRef.current) {
        imageTransformRef.current = null;
        setTransformHudText(null);
        return;
      }
      if (textTransformRef.current) {
        textTransformRef.current = null;
        setTransformHudText(null);
        return;
      }
      if (stationTransformRef.current) {
        stationTransformRef.current = null;
        setTransformHudText(null);
        return;
      }
      if (groupTransformRef.current) {
        groupTransformRef.current = null;
        setTransformHudText(null);
        return;
      }

      // Release SVG image / text drag
      if (imageDragRef.current) {
        imageDragRef.current = null;
        setDraggingImageId(null);
      }
      if (textDragRef.current) {
        textDragRef.current = null;
        setDraggingTextId(null);
      }

      // Release station label drag
      if (labelDragRef.current) {
        labelDragRef.current = null;
        setDraggingLabelStationId(null);
      }

      // Release waypoint drag
      if (waypointDragRef.current) {
        waypointDragRef.current = null;
        setDraggingWaypointInfo(null);
      }

      // Release station drag
      if (dragInfoRef.current) {
        dragInfoRef.current = null;
        setDraggingStationId(null);
        setActiveAlignmentGuides([]);
        activeEqualDistanceGuideRef.current = null;
        setActiveEqualDistanceGuide(null);
      }

      // Release canvas slide
      if (canvasPointerDownRef.current) {
        const downInfo = canvasPointerDownRef.current;
        const didDrag = hasDraggedCanvasRef.current;

        canvasPointerDownRef.current = null;
        hasDraggedCanvasRef.current = false;
        setIsPanning(false);

        // If it was a clean click without dragging (moved <= 3px)
        if (!didDrag) {
          if (toolMode === 'add_station') {
            const pos = screenToWorld(downInfo.clientX, downInfo.clientY);
            const regularCount = stations.filter((s) => !s.isVirtual).length;
            const newStationIndex = regularCount + 1;
            const newStation: Station = {
              id: `st-${Date.now()}`,
              name: `${t('app.defaultStationPrefix')} ${newStationIndex}`,
              code: `S${newStationIndex}`,
              x: pos.x,
              y: pos.y,
              type: 'regular',
              labelPosition: 'top',
              isVirtual: false,
            };
            onAddStation(newStation);
            onSelectStation(newStation.id);

            // 創造節點創造一次就會自動跳回選取，除非按著 Shift
            if (!e.shiftKey) {
              onSetToolMode('select');
            }
          } else if (toolMode === 'add_virtual_node') {
            const pos = screenToWorld(downInfo.clientX, downInfo.clientY);
            const newVirtualNode: Station = {
              id: `vn-${Date.now()}`,
              name: '',
              x: pos.x,
              y: pos.y,
              type: 'regular',
              isVirtual: true,
            };
            onAddStation(newVirtualNode);
            onSelectStation(newVirtualNode.id);

            // 虛擬節點創造一次就會自動跳回選取，除非按著 Shift
            if (!e.shiftKey) {
              onSetToolMode('select');
            }
          } else if (toolMode === 'connect') {
            const eqGuide = activeEqualDistanceGuideRef.current;
            if (eqGuide && connectSourceStationId) {
              // 處於等距對齊吸附狀態時點擊畫布：自動建立或連接等距節點
              if (eqGuide.targetStation) {
                onAddConnection(
                  connectSourceStationId,
                  eqGuide.targetStation.id,
                  activeColor,
                  activeRouteType
                );
                onSelectStation(eqGuide.targetStation.id);
                if (!e.shiftKey) {
                  setConnectSourceStationId(null);
                  onSetToolMode('select');
                } else {
                  setConnectSourceStationId(eqGuide.targetStation.id);
                }
              } else {
                const regularCount = stations.filter((s) => !s.isVirtual).length;
                const newStationIndex = regularCount + 1;
                const newStation: Station = {
                  id: `st-${Date.now()}`,
                  name: `${t('app.defaultStationPrefix')} ${newStationIndex}`,
                  code: `S${newStationIndex}`,
                  x: eqGuide.targetPos.x,
                  y: eqGuide.targetPos.y,
                  type: 'regular',
                  labelPosition: 'top',
                  isVirtual: false,
                };
                onAddStation(newStation);
                onAddConnection(
                  connectSourceStationId,
                  newStation.id,
                  activeColor,
                  activeRouteType
                );
                onSelectStation(newStation.id);
                if (!e.shiftKey) {
                  setConnectSourceStationId(null);
                  onSetToolMode('select');
                } else {
                  setConnectSourceStationId(newStation.id);
                }
              }
              activeEqualDistanceGuideRef.current = null;
              setActiveEqualDistanceGuide(null);
            } else {
              setConnectSourceStationId(null);
              freeDrawingPointsRef.current = [];
              setFreeDrawingPoints([]);
              onSetToolMode('select');
            }
          } else if (toolMode === 'select' || toolMode === 'marquee_select') {
            onSelectStation(null);
            onSelectStationIds?.([]);
            onSelectConnection(null);
            onSelectImage?.(null);
            onSelectText?.(null);
          }
        }

      }
    };

    const handleBlur = () => {
      touchPointsRef.current.clear();
      pinchStartRef.current = null;
      labelDragRef.current = null;
      setDraggingLabelStationId(null);
      imageDragRef.current = null;
      setDraggingImageId(null);
      textDragRef.current = null;
      setDraggingTextId(null);
      imageTransformRef.current = null;
      textTransformRef.current = null;
      waypointDragRef.current = null;
      setDraggingWaypointInfo(null);
      dragInfoRef.current = null;
      setDraggingStationId(null);
      setActiveAlignmentGuides([]);
      activeEqualDistanceGuideRef.current = null;
      setActiveEqualDistanceGuide(null);
      stationTransformRef.current = null;
      groupTransformRef.current = null;
      setTransformHudText(null);
      marqueeRef.current = null;
      setMarqueeBox(null);
      canvasPointerDownRef.current = null;
      hasDraggedCanvasRef.current = false;
      setIsPanning(false);
      isSpacePressedRef.current = false;
      setIsSpaceDown(false);
      isShiftPressedRef.current = false;
      setIsShiftDown(false);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    screenToWorld, 
    onUpdateStationPos, 
    onUpdateStationsPos,
    onBatchUpdateStations,
    onAddStation, 
    onSelectStation, 
    onSelectStationIds,
    onSelectConnection,
    onSelectImage,
    onSelectText,
    onUpdateConnectionWaypoints,
    onSetToolMode,
    onAddConnection,
    gridSnap, 
    gridSize, 
    nodeAlign,
    toolMode, 
    activeRouteType,
    activeColor,
    connectSourceStationId,
    connections,
    stations,
    svgImages,
    svgTexts,
    onUpdateStation,
    onUpdateImage,
    onUpdateText,
    onRecordHistory,
    viewTransform.scale
  ]);

  // Pointer Down on canvas background
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) {
      document.activeElement.blur();
    }
    if (editingStationId) {
      isComposingInlineNameRef.current = false;
      const val = inlineNameInputRef.current?.value ?? editingStationName;
      applyInlineStationName(val, true);
    }
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;

    if (e.pointerType === 'touch') {
      touchPointsRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

      // Multi-touch: if 2 touches are active, start pinch mode and cancel single finger drag
      if (touchPointsRef.current.size >= 2) {
        canvasPointerDownRef.current = null;
        hasDraggedCanvasRef.current = false;
        setIsPanning(false);
        dragInfoRef.current = null;
        setDraggingStationId(null);
        imageDragRef.current = null;
        setDraggingImageId(null);
        textDragRef.current = null;
        setDraggingTextId(null);
        waypointDragRef.current = null;
        setDraggingWaypointInfo(null);
        labelDragRef.current = null;
        setDraggingLabelStationId(null);

        const pts = Array.from(touchPointsRef.current.values());
        const p1 = pts[0];
        const p2 = pts[1];
        const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
        pinchStartRef.current = {
          dist: Math.max(dist, 10),
          scale: viewTransform.scale,
          centerX: (p1.clientX + p2.clientX) / 2,
          centerY: (p1.clientY + p2.clientY) / 2,
          viewX: viewTransform.x,
          viewY: viewTransform.y,
        };
        return;
      }
    }

    // Space key held OR Middle mouse button (button 1) OR pan tool mode => Pan Infinite Canvas
    const isPanAction = isSpacePressedRef.current || e.button === 1 || toolMode === 'pan';

    if (isPanAction) {
      canvasPointerDownRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
      };
      hasDraggedCanvasRef.current = false;
      panStartRef.current = {
        x: e.clientX - viewTransform.x,
        y: e.clientY - viewTransform.y,
      };
      return;
    }

    // Only initiate marquee box selection in 'marquee_select' mode (select mode pans on empty canvas drag)
    if (toolMode === 'marquee_select' && e.button === 0) {
      const worldPos = screenToWorld(e.clientX, e.clientY, false);
      const isAdditive = e.shiftKey && currentSelectedStationIds.length > 0;
      marqueeRef.current = {
        startWorldX: worldPos.rawX,
        startWorldY: worldPos.rawY,
        startClientX: e.clientX,
        startClientY: e.clientY,
        hasDragged: false,
        initialSelectedIds: isAdditive ? [...currentSelectedStationIds] : [],
        isAdditive,
      };
      return;
    }

    // For other modes ('add_station', 'add_virtual_node', 'connect'):
    canvasPointerDownRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
    };
    hasDraggedCanvasRef.current = false;
    panStartRef.current = {
      x: e.clientX - viewTransform.x,
      y: e.clientY - viewTransform.y,
    };
  };

  // Complete connection between connectSourceStationId and targetStation
  const completeConnection = useCallback(
    (targetStation: Station, shiftKey: boolean = false) => {
      if (!connectSourceStationId || connectSourceStationId === targetStation.id) return;

      const fromSt = stations.find((s) => s.id === connectSourceStationId);
      if (!fromSt) return;

      if (activeRouteType === 'free_curve') {
        const rawPoints = freeDrawingPointsRef.current;
        let finalWaypoints: Point[] = [];
        if (rawPoints.length > 2) {
          const fullPath: Point[] = [
            { x: fromSt.x, y: fromSt.y },
            ...rawPoints,
            { x: targetStation.x, y: targetStation.y },
          ];
          // Simplify mouse trajectory to extract inflection turn points
          const simplified = simplifyPoints(fullPath, 16);
          // Waypoints are the intermediate inflection points between endpoints
          finalWaypoints = simplified.slice(1, -1);
        }
        onAddConnection(connectSourceStationId, targetStation.id, activeColor, 'free_curve', finalWaypoints);
      } else {
        onAddConnection(connectSourceStationId, targetStation.id, activeColor, activeRouteType);
      }

      freeDrawingPointsRef.current = [];
      setFreeDrawingPoints([]);

      // 節點連接也是一樣的道理：連完一條自動跳回選取，除非按著 Shift 連續連線
      if (shiftKey) {
        setConnectSourceStationId(targetStation.id);
        onSelectStation(targetStation.id);
      } else {
        setConnectSourceStationId(null);
        onSelectStation(targetStation.id);
        onSetToolMode('select');
      }
    },
    [
      connectSourceStationId,
      stations,
      activeRouteType,
      activeColor,
      onAddConnection,
      onSelectStation,
      onSetToolMode,
    ]
  );

  // Handle Station Label Pointer Down: 自由站名直接在畫布上按住拖曳
  const handleLabelPointerDown = (e: React.PointerEvent, station: Station) => {
    if (station.isVirtual) return;
    e.stopPropagation();
    if (e.pointerType === 'touch') {
      touchPointsRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (touchPointsRef.current.size >= 2) return;
    }

    canvasPointerDownRef.current = null;
    hasDraggedCanvasRef.current = false;
    setIsPanning(false);

    onSelectStation(station.id);
    onSelectConnection(null);
    onSelectImage?.(null);
    onSelectText?.(null);

    let curDx = 0;
    let curDy = -18;
    if (station.labelPosition === 'custom' && station.labelOffset) {
      curDx = station.labelOffset.x;
      curDy = station.labelOffset.y;
    } else {
      const presetKey = (station.labelPosition || 'top') as keyof typeof LABEL_POSITION_PRESETS;
      const preset = LABEL_POSITION_PRESETS[presetKey];
      if (preset) {
        curDx = preset.dx;
        curDy = preset.dy;
      }
    }

    setDraggingLabelStationId(station.id);
    labelDragRef.current = {
      stationId: station.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origDx: curDx,
      origDy: curDy,
    };
  };

  // SVG Image Pointer Down: select & drag
  const handleImagePointerDown = (e: React.PointerEvent, img: CanvasImage) => {
    if (toolMode === 'connect' || toolMode === 'add_station' || toolMode === 'add_virtual_node' || toolMode === 'pan') {
      return;
    }
    e.stopPropagation();
    if (e.pointerType === 'touch') {
      touchPointsRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (touchPointsRef.current.size >= 2) return;
    }

    canvasPointerDownRef.current = null;
    hasDraggedCanvasRef.current = false;
    setIsPanning(false);

    onSelectStation(null);
    onSelectStationIds?.([]);
    onSelectConnection(null);
    onSelectText?.(null);
    onSelectImage?.(img.id);

    const worldPos = screenToWorld(e.clientX, e.clientY, false);
    setDraggingImageId(img.id);
    imageDragRef.current = {
      imageId: img.id,
      startWorldX: worldPos.rawX,
      startWorldY: worldPos.rawY,
      origX: img.x,
      origY: img.y,
    };
  };

  // SVG Text Pointer Down: select & drag
  const handleTextPointerDown = (e: React.PointerEvent, txt: CanvasText) => {
    if (toolMode === 'connect' || toolMode === 'add_station' || toolMode === 'add_virtual_node' || toolMode === 'pan') {
      return;
    }
    e.stopPropagation();
    if (e.pointerType === 'touch') {
      touchPointsRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (touchPointsRef.current.size >= 2) return;
    }

    canvasPointerDownRef.current = null;
    hasDraggedCanvasRef.current = false;
    setIsPanning(false);

    onSelectStation(null);
    onSelectStationIds?.([]);
    onSelectConnection(null);
    onSelectImage?.(null);
    onSelectText?.(txt.id);

    const worldPos = screenToWorld(e.clientX, e.clientY, false);
    setDraggingTextId(txt.id);
    textDragRef.current = {
      textId: txt.id,
      startWorldX: worldPos.rawX,
      startWorldY: worldPos.rawY,
      origX: txt.x,
      origY: txt.y,
    };
  };

  // Station Pointer Down: connect or move
  const handleStationPointerDown = (e: React.PointerEvent, station: Station) => {
    e.stopPropagation();
    if (e.pointerType === 'touch') {
      touchPointsRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (touchPointsRef.current.size >= 2) return;
    }

    canvasPointerDownRef.current = null;
    hasDraggedCanvasRef.current = false;
    setIsPanning(false);

    if (toolMode === 'connect') {
      if (!connectSourceStationId) {
        justCompletedConnectRef.current = false;
        setConnectSourceStationId(station.id);
        freeDrawingPointsRef.current = [];
        setFreeDrawingPoints([]);
        onSelectStation(station.id);
      } else if (connectSourceStationId !== station.id) {
        justCompletedConnectRef.current = true;
        completeConnection(station, e.shiftKey);
      }
      return;
    }

    onSelectConnection(null);
    onSelectImage?.(null);
    onSelectText?.(null);

    let nextBatchIds: string[];
    if (e.shiftKey) {
      // Shift+Click: Toggle this station in or out of selection
      if (currentSelectedStationIds.includes(station.id)) {
        nextBatchIds = currentSelectedStationIds.filter((id) => id !== station.id);
      } else {
        nextBatchIds = [...currentSelectedStationIds, station.id];
      }
      onSelectStationIds?.(nextBatchIds);
      onSelectStation(nextBatchIds.length > 0 ? station.id : null);
    } else {
      // Normal click: If this station is already part of a multi-selection group, keep the group!
      if (currentSelectedStationIds.includes(station.id) && currentSelectedStationIds.length > 1) {
        nextBatchIds = currentSelectedStationIds;
        onSelectStation(station.id);
      } else {
        nextBatchIds = [station.id];
        onSelectStationIds?.([station.id]);
        onSelectStation(station.id);
      }
    }

    const worldPos = screenToWorld(e.clientX, e.clientY, false);
    setDraggingStationId(station.id);

    const initialPositions: Record<string, { x: number; y: number }> = {};
    stations.forEach((s) => {
      if (nextBatchIds.includes(s.id)) {
        initialPositions[s.id] = { x: s.x, y: s.y };
      }
    });

    dragInfoRef.current = {
      stationId: station.id,
      startWorldX: worldPos.rawX,
      startWorldY: worldPos.rawY,
      startStationX: station.x,
      startStationY: station.y,
      batchStationIds: nextBatchIds,
      initialPositions,
    };
  };

  // Station Pointer Up: complete drag-to-connect if user dragged from source station
  const handleStationPointerUp = (e: React.PointerEvent, station: Station) => {
    if (justCompletedConnectRef.current) {
      justCompletedConnectRef.current = false;
      return;
    }
    if (
      toolMode === 'connect' &&
      connectSourceStationId &&
      connectSourceStationId !== station.id
    ) {
      e.stopPropagation();
      completeConnection(station, e.shiftKey);
    }
  };

  // Delete waypoint (by right-click or double-click)
  const handleDeleteWaypoint = (connId: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const targetConn = connections.find((c) => c.id === connId);
    if (targetConn && targetConn.waypoints) {
      const nextWaypoints = targetConn.waypoints.filter((_, i) => i !== index);
      onUpdateConnectionWaypoints(connId, nextWaypoints);
    }
  };

  // Double click on freehand connection line to insert a new waypoint node
  const handleLineDoubleClick = (conn: Connection, e: React.MouseEvent) => {
    if (conn.routeType !== 'free_curve') return;
    e.stopPropagation();
    e.preventDefault();

    onSelectConnection(conn.id);
    onSelectStation(null);

    const fromSt = stations.find((s) => s.id === conn.fromStationId);
    const toSt = stations.find((s) => s.id === conn.toStationId);
    if (!fromSt || !toSt) return;

    const worldPos = screenToWorld(e.clientX, e.clientY, false);
    const newPt: Point = {
      x: gridSnap ? snapToGrid(worldPos.rawX, gridSize) : Math.round(worldPos.rawX),
      y: gridSnap ? snapToGrid(worldPos.rawY, gridSize) : Math.round(worldPos.rawY),
    };

    const currentWaypoints = conn.waypoints ? [...conn.waypoints] : [];
    const pointsSeq: Point[] = [
      { x: fromSt.x, y: fromSt.y },
      ...currentWaypoints,
      { x: toSt.x, y: toSt.y },
    ];

    // Find the segment [pointsSeq[i], pointsSeq[i+1]] that is closest to clicked position
    let minDistance = Infinity;
    let insertIndex = 0;

    for (let i = 0; i < pointsSeq.length - 1; i++) {
      const a = pointsSeq[i];
      const b = pointsSeq[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      let d = 0;
      if (lenSq === 0) {
        d = Math.hypot(newPt.x - a.x, newPt.y - a.y);
      } else {
        let t = ((newPt.x - a.x) * dx + (newPt.y - a.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = a.x + t * dx;
        const projY = a.y + t * dy;
        d = Math.hypot(newPt.x - projX, newPt.y - projY);
      }

      if (d < minDistance) {
        minDistance = d;
        insertIndex = i;
      }
    }

    currentWaypoints.splice(insertIndex, 0, newPt);
    onUpdateConnectionWaypoints(conn.id, currentWaypoints);
  };

  const sourceStation = stations.find((s) => s.id === connectSourceStationId);
  const selectedConn = connections.find((c) => c.id === selectedConnectionId);
  const selectedSingleStation =
    currentSelectedStationIds.length <= 1 && selectedStationId
      ? stations.find((s) => s.id === selectedStationId) || null
      : null;
  const selectedImage = selectedImageId ? svgImages.find((i) => i.id === selectedImageId) || null : null;
  const selectedText = selectedTextId ? svgTexts.find((t) => t.id === selectedTextId) || null : null;

  const getTextBoxDimensions = (txt: CanvasText) => {
    const lines = (txt.content || 'T').split('\n');
    const maxUnits = Math.max(
      ...lines.map((line) => {
        let u = 0;
        for (const ch of line) {
          u += ch.charCodeAt(0) > 255 ? 1 : 0.6;
        }
        return u;
      }),
      1.5
    );
    const spacing = txt.letterSpacing ?? 0;
    const maxChars = Math.max(...lines.map((l) => l.length), 1);
    const baseW = Math.max(36, maxUnits * txt.fontSize + Math.max(0, maxChars - 1) * spacing + 16);
    const lineHeight = txt.fontSize * 1.28;
    const baseH = Math.max(24, lines.length * lineHeight + 10);
    return { baseW, baseH, lines, lineHeight };
  };

  // Unified SVG render list sorted by zIndex (-10 ~ 10) across Images, Connections, Stations, and Texts
  type RenderLayerItem =
    | { kind: 'image'; zIndex: number; kindOrder: 0; item: CanvasImage }
    | { kind: 'connection'; zIndex: number; kindOrder: 1; item: Connection }
    | { kind: 'station'; zIndex: number; kindOrder: 2; item: Station }
    | { kind: 'text'; zIndex: number; kindOrder: 3; item: CanvasText };

  const sortedRenderItems = React.useMemo(() => {
    const list: RenderLayerItem[] = [
      ...svgImages.map((item) => ({
        kind: 'image' as const,
        zIndex: item.zIndex ?? -1,
        kindOrder: 0 as const,
        item,
      })),
      ...connections.map((item) => ({
        kind: 'connection' as const,
        zIndex: item.zIndex ?? 0,
        kindOrder: 1 as const,
        item,
      })),
      ...stations.map((item) => ({
        kind: 'station' as const,
        zIndex: item.zIndex ?? 0,
        kindOrder: 2 as const,
        item,
      })),
      ...svgTexts.map((item) => ({
        kind: 'text' as const,
        zIndex: item.zIndex ?? 1,
        kindOrder: 3 as const,
        item,
      })),
    ];
    return list.sort((a, b) => {
      if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
      return a.kindOrder - b.kindOrder;
    });
  }, [svgImages, connections, stations, svgTexts]);

  const hasActiveNetworkPath = Boolean(
    showShortestPathPreview &&
      shortestPathResult &&
      shortestPathResult.isReachable &&
      shortestPathResult.connectionIds.length > 0
  );

  const highlightedConnectionIdSet = React.useMemo(
    () =>
      new Set<string>(
        showShortestPathPreview && shortestPathResult ? shortestPathResult.connectionIds : []
      ),
    [showShortestPathPreview, shortestPathResult]
  );

  const highlightedStationIdSet = React.useMemo(
    () =>
      new Set<string>(
        showShortestPathPreview && shortestPathResult ? shortestPathResult.stationIds : []
      ),
    [showShortestPathPreview, shortestPathResult]
  );

  // Dynamic cursor
  const getCursorClass = () => {
    if (isPanning) return 'cursor-grabbing';
    if (isSpaceDown) return 'cursor-grab';
    if (marqueeBox) return 'cursor-crosshair';
    if (toolMode === 'add_station' || toolMode === 'add_virtual_node') return 'cursor-crosshair';
    if (toolMode === 'marquee_select') return 'cursor-crosshair';
    if (toolMode === 'connect') return 'cursor-pointer';
    if (toolMode === 'pan') return 'cursor-grab';
    return 'cursor-default';
  };


  return (
    <div
      ref={containerRef}
      translate="no"
      className={`notranslate relative flex-1 h-full overflow-hidden select-none transition-colors touch-none ${
        isLight ? 'bg-[#FAFAFA]' : 'bg-[#09090B]'
      } ${getCursorClass()}`}
      style={{ touchAction: 'none' }}
      onWheel={handleWheel}
      onPointerDown={handleCanvasPointerDown}
    >
      {/* Top-Left Minimal Status Readout */}
      <div
        className={`absolute top-3 left-3 z-10 flex items-center gap-2 text-[11px] font-mono tabular-nums rounded-md px-2.5 py-1 border pointer-events-none transition-colors ${
          isLight
            ? 'bg-white/90 border-zinc-200 text-zinc-600'
            : 'bg-[#111113]/90 border-zinc-800 text-zinc-400'
        }`}
      >
        <span>{Math.round(viewTransform.scale * 100)}%</span>
        <span className="opacity-40">·</span>
        <span className="hidden sm:inline">
          {mouseCanvasPos ? `(${mouseCanvasPos.x}, ${mouseCanvasPos.y})` : '(0, 0)'}
        </span>
        <span className="hidden sm:inline opacity-40">·</span>
        <span className="font-sans">
          {!gridSnap
            ? isCtrlDown || nodeAlign
              ? t('canvas.aligning')
              : t('canvas.smooth')
            : t('canvas.snapGrid', { size: gridSize })}
        </span>
      </div>

      {/* Floating Canvas Navigation HUD (Bottom-Right) */}
      <div
        className={`absolute bottom-4 right-4 z-10 flex flex-col items-center p-1 gap-0.5 rounded-lg border transition-colors ${
          isLight
            ? 'bg-white/95 border-zinc-200'
            : 'bg-[#111113]/95 border-zinc-800'
        }`}
      >
        <button
          onClick={() => handleZoom('in')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isLight
              ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
          title={t('canvas.zoomIn')}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isLight
              ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
          title={t('canvas.zoomOut')}
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className={`w-5 h-px my-0.5 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
        <button
          onClick={handleFitView}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isLight
              ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
          title={t('canvas.fitView')}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetToOrigin}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            isLight
              ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
          title={t('canvas.originReset')}
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Main SVG Infinite World */}
      <svg
        ref={svgRef}
        id="metro-canvas-svg"
        className="notranslate w-full h-full block"
        style={{ touchAction: 'none' }}
      >
        <defs>
          <pattern
            id="infinite-grid-dots"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}
          >
            <circle
              cx={gridSize / 2}
              cy={gridSize / 2}
              r={1.0 / Math.max(viewTransform.scale, 0.4)}
              fill={isLight ? '#D4D4D8' : '#3F3F46'}
              fillOpacity={isLight ? 0.65 : 0.4}
            />
          </pattern>

          <pattern
            id="infinite-grid-major"
            width={gridSize * 10}
            height={gridSize * 10}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}
          >
            <path
              d={`M ${gridSize * 10} 0 L 0 0 0 ${gridSize * 10}`}
              fill="none"
              stroke={isLight ? '#E4E4E7' : '#27272A'}
              strokeWidth={0.7 / Math.max(viewTransform.scale, 0.4)}
              strokeOpacity={isLight ? 0.7 : 0.35}
            />
          </pattern>
        </defs>

        {/* Infinite Grid Backgrounds */}
        <rect width="100%" height="100%" fill="url(#infinite-grid-dots)" pointerEvents="none" />
        <rect width="100%" height="100%" fill="url(#infinite-grid-major)" pointerEvents="none" />

        <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
          {/* Origin Marker */}
          <g opacity={isLight ? 0.6 : 0.35} pointerEvents="none">
            <line x1={-30} y1={0} x2={30} y2={0} stroke={isLight ? '#64748B' : '#64748B'} strokeWidth={1.5} />
            <line x1={0} y1={-30} x2={0} y2={30} stroke={isLight ? '#64748B' : '#64748B'} strokeWidth={1.5} />
            <circle r={4} fill="none" stroke={isLight ? '#64748B' : '#64748B'} strokeWidth={1} />
            <text x={8} y={-8} className={`${isLight ? 'fill-slate-600' : 'fill-slate-500'} font-mono text-[9px] notranslate`}>
              {t('canvas.originLabel')}
            </text>
          </g>

          {/* Unified SVG Render Loop sorted by zIndex (-10 ~ 10) across Images, Connections, Stations, and Texts */}
          {sortedRenderItems.map((entry) => {
            if (entry.kind === 'image') {
              const img = entry.item;
              const isSelected = selectedImageId === img.id;
              const isDraggingThis = draggingImageId === img.id;
              const iScale = img.scale ?? 1;
              const sx = iScale * (img.scaleX ?? 1);
              const sy = iScale * (img.scaleY ?? 1);
              const rot = img.rotation ?? 0;
              const opacity = img.opacity ?? 1;

              return (
                <g
                  key={img.id}
                  transform={`translate(${img.x}, ${img.y}) rotate(${rot}) scale(${sx}, ${sy})`}
                  opacity={opacity}
                  className={`cursor-move ${isDraggingThis ? 'opacity-90' : ''}`}
                  onPointerDown={(e) => handleImagePointerDown(e, img)}
                >
                  <rect
                    x={-img.width / 2}
                    y={-img.height / 2}
                    width={img.width}
                    height={img.height}
                    fill="transparent"
                  />
                  <image
                    href={img.src}
                    x={-img.width / 2}
                    y={-img.height / 2}
                    width={img.width}
                    height={img.height}
                    preserveAspectRatio={img.preserveAspectRatio === false ? 'none' : 'xMidYMid meet'}
                    pointerEvents="none"
                  />
                  {isSelected && (
                    <rect
                      x={-img.width / 2}
                      y={-img.height / 2}
                      width={img.width}
                      height={img.height}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={1.5 / Math.max(0.25, Math.max(sx, sy))}
                      pointerEvents="none"
                      className="export-ignore"
                    />
                  )}
                </g>
              );
            }

            if (entry.kind === 'connection') {
              const conn = entry.item;
              const fromSt = stations.find((s) => s.id === conn.fromStationId);
              const toSt = stations.find((s) => s.id === conn.toStationId);
              if (!fromSt || !toSt) return null;

              const lineColor = conn.color || activeColor;
              const isSelected = selectedConnectionId === conn.id;
              const isPathHighlighted = hasActiveNetworkPath && highlightedConnectionIdSet.has(conn.id);
              const lineWidth = normalizeStrokeWidth(conn.strokeWidth ?? 6);
              const cornerR = conn.cornerRadius ?? 14;
              const lineCap = conn.lineCap ?? 'round';
              const baseOpacity = conn.opacity ?? 1;
              const lineOpacity = hasActiveNetworkPath
                ? isPathHighlighted
                  ? Math.max(0.95, baseOpacity)
                  : baseOpacity * 0.22
                : baseOpacity;
              const strokeStyle = conn.strokeStyle ?? 'solid';
              const strokeDasharray =
                strokeStyle === 'dashed'
                  ? `${Math.max(6, lineWidth * 2)} ${Math.max(4, lineWidth * 1.3)}`
                  : strokeStyle === 'dotted'
                  ? `0.1 ${Math.max(6, lineWidth * 1.8)}`
                  : undefined;

              const pathData = getMetroPath(
                fromSt.x,
                fromSt.y,
                toSt.x,
                toSt.y,
                conn.routeType || '135_bend',
                cornerR,
                conn.waypoints,
                conn.isFlipped,
                conn.angleA,
                conn.angleB,
                conn.offset ?? 0
              );

              return (
                <g
                  key={conn.id}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConnection(conn.id);
                    onSelectStation(null);
                    onSelectImage?.(null);
                    onSelectText?.(null);
                  }}
                  onDoubleClick={(e) => handleLineDoubleClick(conn, e)}
                >
                  {/* Generous transparent hit area */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={Math.max(22, lineWidth + 16)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Pathfinding highlight aura under shortest-path connections */}
                  {isPathHighlighted && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#FACC15"
                      strokeWidth={lineWidth + 10}
                      strokeLinecap={strokeStyle === 'dotted' ? 'round' : lineCap}
                      strokeLinejoin="round"
                      opacity={0.45}
                      className="export-ignore"
                    />
                  )}
                  {/* Highlight outline when selected */}
                  {isSelected && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isLight ? '#0F172A' : '#ffffff'}
                      strokeWidth={lineWidth + 6}
                      strokeLinecap={strokeStyle === 'dotted' ? 'round' : lineCap}
                      strokeLinejoin="round"
                      opacity={isLight ? 0.25 : 0.8}
                      className="export-ignore"
                    />
                  )}
                  {/* Main line body */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth={lineWidth}
                    strokeLinecap={strokeStyle === 'dotted' ? 'round' : lineCap}
                    strokeLinejoin="round"
                    strokeDasharray={strokeDasharray}
                    opacity={lineOpacity}
                  />
                  {/* Inner cutout for double-track style */}
                  {strokeStyle === 'double' && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isLight ? '#F8FAFC' : '#020617'}
                      strokeWidth={Math.max(1.5, lineWidth * 0.36)}
                      strokeLinecap={lineCap}
                      strokeLinejoin="round"
                      opacity={lineOpacity}
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            }

            if (entry.kind === 'station') {
              const st = entry.item;
              const isSelected = selectedStationId === st.id;
              const isConnectSource = connectSourceStationId === st.id;
              const isDraggingThis = draggingStationId === st.id;

              const stConns = connections.filter(
                (c) => c.fromStationId === st.id || c.toStationId === st.id
              );
              const distinctColors = Array.from(
                new Set(stConns.map((c) => (c.color || activeColor).toUpperCase()))
              );
              const primaryColor = stConns.length > 0 ? (stConns[0].color || activeColor) : activeColor;

              let labelDx = 0;
              let labelDy = -18;
              let textAnchor: 'middle' | 'start' | 'end' = 'middle';

              if (st.labelPosition === 'custom' && st.labelOffset) {
                labelDx = st.labelOffset.x;
                labelDy = st.labelOffset.y;
                if (labelDx > 10) textAnchor = 'start';
                else if (labelDx < -10) textAnchor = 'end';
                else textAnchor = 'middle';
              } else {
                const presetKey = (st.labelPosition || 'top') as keyof typeof LABEL_POSITION_PRESETS;
                const preset = LABEL_POSITION_PRESETS[presetKey];
                if (preset) {
                  labelDx = preset.dx;
                  labelDy = preset.dy;
                  textAnchor = preset.textAnchor;
                }
              }

              const stScale = st.scale ?? 1;
              const sx = stScale * (st.scaleX ?? 1);
              const sy = stScale * (st.scaleY ?? 1);
              const stRot = st.rotation ?? 0;
              const baseStOpacity = st.opacity ?? 1;
              const isStationOnPath = hasActiveNetworkPath && highlightedStationIdSet.has(st.id);
              const stOpacity = hasActiveNetworkPath
                ? isStationOnPath
                  ? Math.max(0.95, baseStOpacity)
                  : baseStOpacity * 0.42
                : baseStOpacity;
              const maxScale = Math.max(sx, sy);
              const lblScale = st.labelScale ?? 1;
              const lblRot = st.labelRotation ?? 0;

              return (
                <g
                  key={st.id}
                  transform={`translate(${st.x}, ${st.y})`}
                  className={`cursor-pointer ${isDraggingThis ? 'opacity-95' : ''}`}
                  onPointerDown={(e) => handleStationPointerDown(e, st)}
                  onPointerUp={(e) => handleStationPointerUp(e, st)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startInlineEditStation(st);
                  }}
                >
                  {/* Generous transparent hit area scaled proportionally to marker size */}
                  <circle r={Math.max(26, 20 * maxScale)} fill="transparent" className="cursor-pointer" />

                  {/* Multi-selection outer glowing indicator */}
                  {currentSelectedStationIds.includes(st.id) && (
                    <circle
                      r={(st.isVirtual ? 16 : 21) * maxScale}
                      fill="rgba(99, 102, 241, 0.18)"
                      stroke="#6366F1"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      pointerEvents="none"
                      className="export-ignore"
                    />
                  )}

                  {(isSelected || isConnectSource) && !currentSelectedStationIds.includes(st.id) && (
                    <circle
                      r={18 * maxScale}
                      fill="none"
                      stroke={isConnectSource ? activeColor : '#38BDF8'}
                      strokeWidth={2.5}
                      strokeDasharray={isConnectSource ? '4 3' : undefined}
                      pointerEvents="none"
                      className="export-ignore"
                    />
                  )}

                  {/* Stage 3 Free SVG Transform Group for Station Marker */}
                  <g
                    transform={`rotate(${stRot}) scale(${sx}, ${sy})`}
                    opacity={stOpacity}
                    pointerEvents="none"
                  >
                    {st.isVirtual ? (
                      <g pointerEvents="none">
                        <circle
                          r={8}
                          fill="#000000"
                          stroke={isSelected ? '#38BDF8' : '#FFFFFF'}
                          strokeWidth={1.8}
                        />
                        <line
                          x1={-3.5}
                          y1={-3.5}
                          x2={3.5}
                          y2={3.5}
                          stroke={isSelected ? '#38BDF8' : '#FFFFFF'}
                          strokeWidth={1.8}
                          strokeLinecap="round"
                        />
                        <line
                          x1={3.5}
                          y1={-3.5}
                          x2={-3.5}
                          y2={3.5}
                          stroke={isSelected ? '#38BDF8' : '#FFFFFF'}
                          strokeWidth={1.8}
                          strokeLinecap="round"
                        />
                      </g>
                    ) : (st.type === 'interchange' || st.type === 'interchange_3line' || distinctColors.length >= 2) ? (
                      (() => {
                        const PALETTE = [
                          '#E11D48', '#2563EB', '#16A34A', '#EA580C', '#854D0E',
                          '#CA8A04', '#9333EA', '#06B6D4', '#EC4899', '#10B981',
                          '#6366F1', '#F59E0B', '#14B8A6', '#8B5CF6', '#F43F5E'
                        ];

                        let colors = [...distinctColors];
                        if (colors.length === 0) {
                          colors = [primaryColor, '#2563EB'];
                        } else if (colors.length === 1 && (st.type === 'interchange' || st.type === 'interchange_3line')) {
                          const fallback = PALETTE.find((c) => c.toUpperCase() !== colors[0].toUpperCase()) || '#2563EB';
                          colors.push(fallback);
                        }

                        const targetCount = st.interchangeLinesCount ?? (st.type === 'interchange_3line' ? Math.max(3, colors.length) : colors.length);
                        if (targetCount > colors.length) {
                          for (let i = 0; colors.length < targetCount; i++) {
                            const fallbackColor = PALETTE[i % PALETTE.length];
                            if (!colors.includes(fallbackColor)) {
                              colors.push(fallbackColor);
                            } else {
                              colors.push(PALETTE[(i + 3) % PALETTE.length]);
                            }
                          }
                        } else if (st.interchangeLinesCount && targetCount < colors.length) {
                          colors = colors.slice(0, targetCount);
                        }

                        const N = Math.max(2, colors.length);
                        const iStyle = st.interchangeStyle || 'dots';

                        if (iStyle === 'pie') {
                          const rOuter = Math.max(13, 11 + Math.min(N, 12) * 0.7);
                          const rPie = rOuter - 4;
                          const rHub = Math.max(2, 2.8 - N * 0.08);

                          return (
                            <g pointerEvents="none">
                              <circle r={rOuter} fill="#ffffff" stroke="#0f172a" strokeWidth={3.5} />
                              {colors.map((c, idx) => {
                                const degStart = -90 + (idx * 360) / N;
                                const degEnd = -90 + ((idx + 1) * 360) / N;
                                const radStart = (degStart * Math.PI) / 180;
                                const radEnd = (degEnd * Math.PI) / 180;
                                const x1 = Math.round(Math.cos(radStart) * rPie * 100) / 100;
                                const y1 = Math.round(Math.sin(radStart) * rPie * 100) / 100;
                                const x2 = Math.round(Math.cos(radEnd) * rPie * 100) / 100;
                                const y2 = Math.round(Math.sin(radEnd) * rPie * 100) / 100;
                                const largeArc = 360 / N > 180 ? 1 : 0;
                                const pathData = `M 0 0 L ${x1} ${y1} A ${rPie} ${rPie} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                                return (
                                  <g key={idx}>
                                    <path d={pathData} fill={c} />
                                    <line x1={0} y1={0} x2={x1} y2={y1} stroke="#ffffff" strokeWidth={1.2} />
                                  </g>
                                );
                              })}
                              <circle r={rHub} fill="#ffffff" stroke="#0f172a" strokeWidth={1.2} />
                            </g>
                          );
                        }

                        if (iStyle === 'capsule') {
                          const nodeSpacing = Math.max(7, Math.min(10, 36 / (N - 1 || 1)));
                          const halfSpan = ((N - 1) * nodeSpacing) / 2;
                          const capWidth = halfSpan * 2 + 20;
                          const capHeight = 18;
                          const nodeRadius = Math.max(2.8, Math.min(4, 14 / Math.sqrt(N)));

                          return (
                            <g pointerEvents="none">
                              <rect
                                x={-capWidth / 2}
                                y={-capHeight / 2}
                                width={capWidth}
                                height={capHeight}
                                rx={capHeight / 2}
                                fill="#ffffff"
                                stroke="#0f172a"
                                strokeWidth={3.5}
                              />
                              <line
                                x1={-halfSpan}
                                y1={0}
                                x2={halfSpan}
                                y2={0}
                                stroke="#0f172a"
                                strokeWidth={2}
                              />
                              {colors.map((c, idx) => {
                                const cx = -halfSpan + idx * nodeSpacing;
                                return (
                                  <circle
                                    key={idx}
                                    cx={cx}
                                    cy={0}
                                    r={nodeRadius}
                                    fill={c}
                                    stroke="#ffffff"
                                    strokeWidth={1}
                                  />
                                );
                              })}
                            </g>
                          );
                        }

                        if (N === 2) {
                          return (
                            <g pointerEvents="none">
                              <circle r={12} fill="#ffffff" stroke="#0f172a" strokeWidth={3.5} />
                              <circle cx={-3.8} cy={0} r={3.2} fill={colors[0]} />
                              <circle cx={3.8} cy={0} r={3.2} fill={colors[1]} />
                            </g>
                          );
                        }

                        if (N === 3) {
                          return (
                            <g pointerEvents="none">
                              <circle r={14} fill="#ffffff" stroke="#0f172a" strokeWidth={3.5} />
                              <circle cx={0} cy={-5} r={3.2} fill={colors[0]} />
                              <circle cx={-4.5} cy={3.2} r={3.2} fill={colors[1]} />
                              <circle cx={4.5} cy={3.2} r={3.2} fill={colors[2]} />
                              <circle r={1.2} fill="#0f172a" />
                            </g>
                          );
                        }

                        const rHub = Math.max(14, 11 + N * 0.9);
                        const rOrbit = rHub - 6.5;
                        const rDot = Math.max(2.2, Math.min(3.2, 22 / N));

                        return (
                          <g pointerEvents="none">
                            <circle r={rHub} fill="#ffffff" stroke="#0f172a" strokeWidth={3.5} />
                            {colors.map((c, idx) => {
                              const deg = -90 + (idx * 360) / N;
                              const rad = (deg * Math.PI) / 180;
                              const cx = Math.round(Math.cos(rad) * rOrbit * 100) / 100;
                              const cy = Math.round(Math.sin(rad) * rOrbit * 100) / 100;
                              return (
                                <circle
                                  key={idx}
                                  cx={cx}
                                  cy={cy}
                                  r={rDot}
                                  fill={c}
                                />
                              );
                            })}
                            <circle r={1.4} fill="#0f172a" />
                          </g>
                        );
                      })()
                    ) : st.type === 'terminal' ? (
                      <g pointerEvents="none">
                        <rect
                          x={-8}
                          y={-8}
                          width={16}
                          height={16}
                          rx={3}
                          fill="#ffffff"
                          stroke="#0f172a"
                          strokeWidth={3}
                        />
                        <circle r={3} fill={primaryColor} />
                      </g>
                    ) : (
                      <circle
                        r={7}
                        fill="#ffffff"
                        stroke="#0f172a"
                        strokeWidth={2.5}
                      />
                    )}
                  </g>

                  {/* Upright Virtual Node indicator badge when selected */}
                  {st.isVirtual && isSelected && (
                    <g transform={`translate(0, ${-15 * sy - 4})`} pointerEvents="none" className="export-ignore">
                      <rect
                        x={-28}
                        y={-8}
                        width={56}
                        height={16}
                        rx={4}
                        fill={isLight ? '#FFFFFF' : '#0F172A'}
                        stroke="#38BDF8"
                        strokeWidth={1}
                        opacity={0.95}
                      />
                      <text
                        textAnchor="middle"
                        y={3.5}
                        className={`notranslate font-sans text-[9px] font-bold select-none ${
                          isLight ? 'fill-sky-700' : 'fill-sky-300'
                        }`}
                      >
                        {t('canvas.virtualNode')}
                      </text>
                    </g>
                  )}

                  {/* Passenger Station Labels */}
                  {!st.isVirtual && (
                    <g
                      transform={`translate(${labelDx}, ${labelDy})`}
                      className="cursor-grab active:cursor-grabbing select-none notranslate"
                      onPointerDown={(e) => handleLabelPointerDown(e, st)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startInlineEditStation(st);
                      }}
                    >
                      {(st.labelPosition === 'custom' || draggingLabelStationId === st.id) && (
                        <line
                          x1={-labelDx}
                          y1={-labelDy}
                          x2={0}
                          y2={0}
                          stroke={isSelected ? '#38BDF8' : '#94A3B8'}
                          strokeWidth={1.2}
                          strokeDasharray="3 3"
                          opacity={draggingLabelStationId === st.id ? 0.9 : 0.45}
                          pointerEvents="none"
                        />
                      )}

                      <g transform={`rotate(${lblRot}) scale(${lblScale})`} opacity={stOpacity}>
                        {(draggingLabelStationId === st.id || (isSelected && st.labelPosition === 'custom')) && (
                          <rect
                            x={textAnchor === 'middle' ? -38 : textAnchor === 'end' ? -76 : -6}
                            y={-14}
                            width={78}
                            height={19}
                            rx={4}
                            fill={isLight ? '#E0F2FE' : '#082F49'}
                            stroke="#38BDF8"
                            strokeWidth={1}
                            strokeDasharray={draggingLabelStationId === st.id ? '3 2' : undefined}
                            opacity={0.85}
                            pointerEvents="none"
                            className="export-ignore"
                          />
                        )}

                        <rect
                          x={textAnchor === 'middle' ? -48 : textAnchor === 'end' ? -96 : -8}
                          y={-15}
                          width={96}
                          height={22}
                          fill="transparent"
                          className="cursor-grab active:cursor-grabbing"
                        />

                        <text
                          key={`label-halo-${st.id}-${st.name}-${st.code || ''}`}
                          textAnchor={textAnchor}
                          className={`notranslate font-sans font-bold text-xs select-none stroke-[3.5px] paint-order-stroke pointer-events-none ${
                            isLight
                              ? 'fill-white stroke-white'
                              : 'fill-slate-950 stroke-slate-950'
                          }`}
                          strokeLinejoin="round"
                        >
                          {st.name}
                          {st.code ? (
                            <tspan className={`font-mono text-[10px] ${isLight ? 'fill-white' : 'fill-slate-400'}`}>
                              {` (${st.code})`}
                            </tspan>
                          ) : null}
                        </text>

                        <text
                          key={`label-text-${st.id}-${st.name}-${st.code || ''}`}
                          textAnchor={textAnchor}
                          className={`notranslate font-sans font-semibold text-xs select-none pointer-events-none ${
                            isLight ? 'fill-slate-900' : 'fill-slate-100'
                          }`}
                        >
                          {st.name}
                          {st.code ? (
                            <tspan className={`font-mono text-[10px] ${isLight ? 'fill-slate-500' : 'fill-slate-300'}`}>
                              {` (${st.code})`}
                            </tspan>
                          ) : null}
                        </text>
                      </g>

                      {draggingLabelStationId === st.id && (
                        <g transform={`translate(${textAnchor === 'middle' ? 0 : textAnchor === 'end' ? -35 : 35}, -20)`} pointerEvents="none" className="export-ignore">
                          <rect
                            x={-34}
                            y={-8}
                            width={68}
                            height={16}
                            rx={3}
                            fill="#0284c7"
                            opacity={0.96}
                          />
                          <text
                            textAnchor="middle"
                            y={3.5}
                            className="notranslate font-mono text-[9px] fill-white font-bold select-none"
                          >
                            Δ{labelDx}, {labelDy}
                          </text>
                        </g>
                      )}
                    </g>
                  )}
                </g>
              );
            }

            // entry.kind === 'text'
            const txt = entry.item;
            const isSelected = selectedTextId === txt.id;
            const isDraggingThis = draggingTextId === txt.id;
            const { baseW, baseH, lines, lineHeight } = getTextBoxDimensions(txt);
            const tScale = txt.scale ?? 1;
            const sx = tScale * (txt.scaleX ?? 1);
            const sy = tScale * (txt.scaleY ?? 1);
            const rot = txt.rotation ?? 0;
            const opacity = txt.opacity ?? 1;
            const anchor = txt.textAnchor ?? 'middle';
            const weightMap = { normal: 400, medium: 500, semibold: 600, bold: 700 } as const;
            const fontWeight = weightMap[txt.fontWeight ?? 'semibold'];
            const textX = anchor === 'start' ? -baseW / 2 + 8 : anchor === 'end' ? baseW / 2 - 8 : 0;
            const firstY = -((lines.length - 1) * lineHeight) / 2 + txt.fontSize * 0.35;
            const letterSpacing = txt.letterSpacing ?? 0;
            const haloColor = isLight ? '#FFFFFF' : '#09090B';

            return (
              <g
                key={txt.id}
                transform={`translate(${txt.x}, ${txt.y}) rotate(${rot}) scale(${sx}, ${sy})`}
                opacity={opacity}
                className={`cursor-move ${isDraggingThis ? 'opacity-90' : ''}`}
                onPointerDown={(e) => handleTextPointerDown(e, txt)}
              >
                <rect
                  x={-baseW / 2}
                  y={-baseH / 2}
                  width={baseW}
                  height={baseH}
                  fill="transparent"
                />
                {isSelected && (
                  <rect
                    x={-baseW / 2}
                    y={-baseH / 2}
                    width={baseW}
                    height={baseH}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth={1.2 / Math.max(0.25, Math.max(sx, sy))}
                    strokeDasharray="3 2"
                    pointerEvents="none"
                    className="export-ignore"
                  />
                )}
                {txt.hasHalo && (
                  <text
                    key={`txt-halo-${txt.id}-${txt.content}`}
                    x={textX}
                    y={firstY}
                    textAnchor={anchor}
                    fontSize={txt.fontSize}
                    fontWeight={fontWeight}
                    letterSpacing={letterSpacing !== 0 ? letterSpacing : undefined}
                    fill={haloColor}
                    stroke={haloColor}
                    strokeWidth={Math.max(3, txt.fontSize * 0.22)}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    className="notranslate font-sans select-none pointer-events-none"
                  >
                    {lines.map((line, idx) => (
                      <tspan key={idx} x={textX} dy={idx === 0 ? 0 : lineHeight}>
                        {line.length > 0 ? line : ' '}
                      </tspan>
                    ))}
                  </text>
                )}
                <text
                  key={`txt-main-${txt.id}-${txt.content}`}
                  x={textX}
                  y={firstY}
                  textAnchor={anchor}
                  fontSize={txt.fontSize}
                  fontWeight={fontWeight}
                  letterSpacing={letterSpacing !== 0 ? letterSpacing : undefined}
                  fill={txt.color || (isLight ? '#18181B' : '#F4F4F5')}
                  className="notranslate font-sans select-none pointer-events-none"
                >
                  {lines.map((line, idx) => (
                    <tspan key={idx} x={textX} dy={idx === 0 ? 0 : lineHeight}>
                      {line.length > 0 ? line : ' '}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}

          {/* Shortest Path Preview Animated Highlight Layer */}
          {showShortestPathPreview && shortestPathResult && shortestPathResult.stationIds.length >= 2 && (
            <g className="pointer-events-none shortest-path-preview-layer export-ignore">
              {shortestPathResult.stationIds.slice(0, -1).map((fromId, idx) => {
                const toId = shortestPathResult.stationIds[idx + 1];
                const st1 = stations.find((s) => s.id === fromId);
                const st2 = stations.find((s) => s.id === toId);
                if (!st1 || !st2) return null;

                const connId = shortestPathResult.connectionIds[idx];
                const conn = connId ? connections.find((c) => c.id === connId) : undefined;
                const segWidth = conn ? normalizeStrokeWidth(conn.strokeWidth ?? 6) : 6;

                let pathD = '';
                if (conn) {
                  const connFrom = stations.find((s) => s.id === conn.fromStationId) || st1;
                  const connTo = stations.find((s) => s.id === conn.toStationId) || st2;
                  pathD = getMetroPath(
                    connFrom.x,
                    connFrom.y,
                    connTo.x,
                    connTo.y,
                    conn.routeType || '135_bend',
                    conn.cornerRadius ?? 14,
                    conn.waypoints,
                    conn.isFlipped,
                    conn.angleA,
                    conn.angleB,
                    conn.offset ?? 0
                  );
                } else {
                  pathD = getMetroPath(st1.x, st1.y, st2.x, st2.y, activeRouteType || '135_bend', 14);
                }

                return (
                  <g key={`sp-seg-${fromId}-${toId}-${idx}`}>
                    {/* Outer broad neon halo glow */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={conn ? '#FACC15' : '#06B6D4'}
                      strokeWidth={Math.max(14, segWidth + 8)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.35}
                    />
                    {/* Secondary crisp cyan glow */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={Math.max(8, segWidth + 2)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.7}
                    />
                    {/* Inner high-contrast animated dashed line with marching ants */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={Math.max(3, Math.min(8, segWidth * 0.55))}
                      strokeDasharray="9 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.98}
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="32"
                        to="0"
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                    </path>
                  </g>
                );
              })}
            </g>
          )}

          {/* Waypoint draggable control handles for selected freehand line */}
          {selectedConn && selectedConn.routeType === 'free_curve' && selectedConn.waypoints && (
            <g className="waypoint-handles">
              {selectedConn.waypoints.map((wp, idx) => {
                const isDraggingThis =
                  draggingWaypointInfo?.connId === selectedConn.id &&
                  draggingWaypointInfo?.index === idx;

                return (
                  <g
                    key={`wp-${selectedConn.id}-${idx}`}
                    transform={`translate(${wp.x}, ${wp.y})`}
                    className="cursor-move group"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteWaypoint(selectedConn.id, idx, e);
                    }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      canvasPointerDownRef.current = null;
                      hasDraggedCanvasRef.current = false;
                      setIsPanning(false);

                      const worldPos = screenToWorld(e.clientX, e.clientY, false);
                      waypointDragRef.current = {
                        connId: selectedConn.id,
                        index: idx,
                        startWorldX: worldPos.rawX,
                        startWorldY: worldPos.rawY,
                        origPoint: { ...wp },
                      };
                      setDraggingWaypointInfo({ connId: selectedConn.id, index: idx });
                    }}
                    onDoubleClick={(e) => handleDeleteWaypoint(selectedConn.id, idx, e)}
                  >
                    <title>{t('canvas.waypointTip')}</title>
                    {/* Generous hit area for easy grabbing */}
                    <circle r={14} fill="transparent" />

                    {/* Outer glow ring when dragging or hovering */}
                    {isDraggingThis && (
                      <circle r={11} fill="none" stroke="#6366F1" strokeWidth={2} opacity={0.7} />
                    )}

                    {/* Control node dot */}
                    <circle
                      r={isDraggingThis ? 7 : 5.5}
                      fill="#ffffff"
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      className="transition-transform group-hover:scale-125"
                    />

                    {/* Waypoint index indicator */}
                    <text
                      y={-9}
                      textAnchor="middle"
                      className="fill-indigo-300 font-mono text-[9px] font-bold select-none pointer-events-none drop-shadow"
                    >
                      {idx + 1}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Connection Preview Line (Rubber Band) */}
          {toolMode === 'connect' && sourceStation && mouseCanvasPos && (
            <g className="pointer-events-none">
              {activeRouteType === 'free_curve' && freeDrawingPoints.length > 0 ? (
                <>
                  {/* Smooth curved trail following mouse */}
                  <path
                    d={getSmoothCatmullRomPath([
                      { x: sourceStation.x, y: sourceStation.y },
                      ...freeDrawingPoints,
                      mouseCanvasPos,
                    ])}
                    fill="none"
                    stroke={activeColor}
                    strokeWidth={6}
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                  />
                  {/* Live waypoint trail dots */}
                  {freeDrawingPoints.filter((_, idx) => idx % 3 === 0).map((pt, idx) => (
                    <circle
                      key={`traj-${idx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={2.5}
                      fill={activeColor}
                      opacity={0.5}
                    />
                  ))}
                </>
              ) : (
                <path
                  d={getMetroPath(
                    sourceStation.x,
                    sourceStation.y,
                    mouseCanvasPos.x,
                    mouseCanvasPos.y,
                    activeRouteType,
                    14
                  )}
                  fill="none"
                  stroke={activeColor}
                  strokeWidth={6}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
              )}
            </g>
          )}

          {/* Active Equal Distance Red Dashed Guides (開啟對齊模式，已有線段時，另一節點連線產生紅色虛線讓線段距離一樣) */}
          {activeEqualDistanceGuide && (() => {
            const guide = activeEqualDistanceGuide;
            const src = guide.sourceStation;
            const ref = guide.refStation;
            const tgt = guide.targetPos;

            // Compute midpoint and CAD ticks for reference segment (src -> ref)
            const refMidX = (src.x + ref.x) / 2;
            const refMidY = (src.y + ref.y) / 2;
            const refAngle = Math.atan2(ref.y - src.y, ref.x - src.x);
            const refNormX = -Math.sin(refAngle);
            const refNormY = Math.cos(refAngle);
            const refDirX = Math.cos(refAngle);
            const refDirY = Math.sin(refAngle);

            // Compute midpoint and CAD ticks for target segment (src -> tgt)
            const tgtMidX = (src.x + tgt.x) / 2;
            const tgtMidY = (src.y + tgt.y) / 2;
            const tgtAngle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
            const tgtNormX = -Math.sin(tgtAngle);
            const tgtNormY = Math.cos(tgtAngle);
            const tgtDirX = Math.cos(tgtAngle);
            const tgtDirY = Math.sin(tgtAngle);

            const tickLen = 7;
            const tickSpacing = 3;

            return (
              <g key={guide.id} className="pointer-events-none">
                {/* 1. Reference Segment Red Dashed Indicator with soft glow */}
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={ref.x}
                  y2={ref.y}
                  stroke="#ef4444"
                  strokeWidth={5}
                  opacity={0.3}
                  strokeLinecap="round"
                />
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={ref.x}
                  y2={ref.y}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  strokeLinecap="round"
                  opacity={0.85}
                />

                {/* 2. New Connecting Segment Red Dashed Line (讓線段距離一樣) */}
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="#ef4444"
                  strokeWidth={6}
                  opacity={0.35}
                  strokeLinecap="round"
                />
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />

                {/* 3. Faint Equal-Distance Radius Arc / Circle */}
                <circle
                  cx={src.x}
                  cy={src.y}
                  r={guide.distance}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={1.2}
                  strokeDasharray="4 6"
                  opacity={0.3}
                />

                {/* 4. CAD Equal-Length Double Ticks (||) on Reference Segment */}
                <line
                  x1={refMidX - refDirX * tickSpacing - refNormX * tickLen}
                  y1={refMidY - refDirY * tickSpacing - refNormY * tickLen}
                  x2={refMidX - refDirX * tickSpacing + refNormX * tickLen}
                  y2={refMidY - refDirY * tickSpacing + refNormY * tickLen}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <line
                  x1={refMidX + refDirX * tickSpacing - refNormX * tickLen}
                  y1={refMidY + refDirY * tickSpacing - refNormY * tickLen}
                  x2={refMidX + refDirX * tickSpacing + refNormX * tickLen}
                  y2={refMidY + refDirY * tickSpacing + refNormY * tickLen}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeLinecap="round"
                />

                {/* 5. CAD Equal-Length Double Ticks (||) on New Connecting Segment */}
                <line
                  x1={tgtMidX - tgtDirX * tickSpacing - tgtNormX * tickLen}
                  y1={tgtMidY - tgtDirY * tickSpacing - tgtNormY * tickLen}
                  x2={tgtMidX - tgtDirX * tickSpacing + tgtNormX * tickLen}
                  y2={tgtMidY - tgtDirY * tickSpacing + tgtNormY * tickLen}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <line
                  x1={tgtMidX + tgtDirX * tickSpacing - tgtNormX * tickLen}
                  y1={tgtMidY + tgtDirY * tickSpacing - tgtNormY * tickLen}
                  x2={tgtMidX + tgtDirX * tickSpacing + tgtNormX * tickLen}
                  y2={tgtMidY + tgtDirY * tickSpacing + tgtNormY * tickLen}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeLinecap="round"
                />

                {/* 6. Rings around stations */}
                <circle
                  cx={ref.x}
                  cy={ref.y}
                  r={14}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={1.8}
                  strokeDasharray="3 3"
                  opacity={0.8}
                />
                <circle
                  cx={tgt.x}
                  cy={tgt.y}
                  r={16}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={2.2}
                  strokeDasharray="4 3"
                  className="animate-pulse"
                />
                <circle
                  cx={tgt.x}
                  cy={tgt.y}
                  r={4.5}
                  fill="#ef4444"
                />

                {/* 7. Equal Distance Floating Badge */}
                <g transform={`translate(${tgtMidX}, ${tgtMidY - 16})`}>
                  <rect
                    x={-48}
                    y={-10}
                    width={96}
                    height={20}
                    rx={5}
                    fill="#450a0a"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    opacity={0.96}
                  />
                  <text
                    textAnchor="middle"
                    y={4}
                    className="font-mono text-[10px] fill-red-200 font-bold select-none"
                  >
                    {guide.label}
                  </text>
                </g>
              </g>
            );
          })()}

          {/* Active 8-Direction Dashed Alignment Guides when moving station with Ctrl */}
          {activeAlignmentGuides.map((guide) => {
            const draggingStation = dragInfoRef.current
              ? stations.find((s) => s.id === dragInfoRef.current?.stationId)
              : null;
            const currentX = draggingStation ? draggingStation.x : guide.targetStation.x;
            const currentY = draggingStation ? draggingStation.y : guide.targetStation.y;
            const badgeX = (guide.targetStation.x + currentX) / 2;
            const badgeY = (guide.targetStation.y + currentY) / 2 - 14;

            return (
              <g key={guide.id} className="pointer-events-none">
                {/* Soft glow background */}
                <line
                  x1={guide.x1}
                  y1={guide.y1}
                  x2={guide.x2}
                  y2={guide.y2}
                  stroke="#0284c7"
                  strokeWidth={5}
                  opacity={0.35}
                  strokeLinecap="round"
                />
                {/* Sharp dashed alignment ray */}
                <line
                  x1={guide.x1}
                  y1={guide.y1}
                  x2={guide.x2}
                  y2={guide.y2}
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
                {/* Highlight circle on aligned target station */}
                <circle
                  cx={guide.targetStation.x}
                  cy={guide.targetStation.y}
                  r={16}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  opacity={0.9}
                  className="animate-pulse"
                />
                <circle
                  cx={guide.targetStation.x}
                  cy={guide.targetStation.y}
                  r={4}
                  fill="#38bdf8"
                />
                {/* Direction label tag */}
                <g transform={`translate(${badgeX}, ${badgeY})`}>
                  <rect
                    x={-44}
                    y={-9}
                    width={88}
                    height={18}
                    rx={4}
                    fill="#082f49"
                    stroke="#38bdf8"
                    strokeWidth={1.2}
                    opacity={0.95}
                  />
                  <text
                    textAnchor="middle"
                    y={3.5}
                    className="font-mono text-[9px] fill-sky-200 font-bold select-none"
                  >
                    {guide.angleLabel}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Stations now rendered inside unified sortedRenderItems loop above */}

          {/* Stage 3: Interactive SVG Image Free Transform Gizmo */}
          {selectedImage &&
            !draggingImageId &&
            toolMode !== 'connect' &&
            onUpdateImage && (() => {
              const img = selectedImage;
              const baseHalfW = img.width / 2;
              const baseHalfH = img.height / 2;
              const iScale = img.scale ?? 1;
              const iScaleX = img.scaleX ?? 1;
              const iScaleY = img.scaleY ?? 1;
              const iRot = img.rotation ?? 0;
              const halfW = Math.max(12, baseHalfW * iScale * iScaleX);
              const halfH = Math.max(12, baseHalfH * iScale * iScaleY);
              const invScale = 1 / Math.max(0.25, Math.min(2.5, viewTransform.scale));
              const handleR = 4.5 * invScale;
              const rotStem = 22 * invScale;

              const beginImageTransform = (
                handle: TransformHandleKind,
                e: React.PointerEvent
              ) => {
                e.stopPropagation();
                e.preventDefault();
                const curWorld = screenToWorld(e.clientX, e.clientY, false);
                const dx = curWorld.rawX - img.x;
                const dy = curWorld.rawY - img.y;
                imageTransformRef.current = {
                  imageId: img.id,
                  handle,
                  centerX: img.x,
                  centerY: img.y,
                  baseHalfW,
                  baseHalfH,
                  startDist: Math.max(8, Math.hypot(dx, dy)),
                  startAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
                  origScale: iScale,
                  origScaleX: iScaleX,
                  origScaleY: iScaleY,
                  origRotation: iRot,
                };
              };

              const corners: Array<{ kind: TransformHandleKind; x: number; y: number; cursor: string }> = [
                { kind: 'nw', x: -halfW, y: -halfH, cursor: 'nwse-resize' },
                { kind: 'ne', x: halfW, y: -halfH, cursor: 'nesw-resize' },
                { kind: 'se', x: halfW, y: halfH, cursor: 'nwse-resize' },
                { kind: 'sw', x: -halfW, y: halfH, cursor: 'nesw-resize' },
              ];
              const edges: Array<{ kind: TransformHandleKind; x: number; y: number; cursor: string }> = [
                { kind: 'n', x: 0, y: -halfH, cursor: 'ns-resize' },
                { kind: 'e', x: halfW, y: 0, cursor: 'ew-resize' },
                { kind: 's', x: 0, y: halfH, cursor: 'ns-resize' },
                { kind: 'w', x: -halfW, y: 0, cursor: 'ew-resize' },
              ];

              return (
                <g className="export-ignore" transform={`translate(${img.x}, ${img.y})`}>
                  <g transform={`rotate(${iRot})`}>
                    <rect
                      x={-halfW}
                      y={-halfH}
                      width={halfW * 2}
                      height={halfH * 2}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={1.4 * invScale}
                      strokeDasharray={`${4 * invScale} ${3 * invScale}`}
                      pointerEvents="none"
                    />
                    <line
                      x1={0}
                      y1={-halfH}
                      x2={0}
                      y2={-halfH - rotStem}
                      stroke="#38BDF8"
                      strokeWidth={1.4 * invScale}
                      pointerEvents="none"
                    />
                    <circle
                      cx={0}
                      cy={-halfH - rotStem}
                      r={handleR * 1.15}
                      fill="#0284C7"
                      stroke="#FFFFFF"
                      strokeWidth={1.5 * invScale}
                      style={{ cursor: 'grab' }}
                      onPointerDown={(e) => beginImageTransform('rotate', e)}
                    />
                    {edges.map((h) => (
                      <rect
                        key={h.kind}
                        x={h.x - handleR * 0.78}
                        y={h.y - handleR * 0.78}
                        width={handleR * 1.56}
                        height={handleR * 1.56}
                        rx={1.5 * invScale}
                        fill="#FFFFFF"
                        stroke="#0284C7"
                        strokeWidth={1.4 * invScale}
                        style={{ cursor: h.cursor }}
                        onPointerDown={(e) => beginImageTransform(h.kind, e)}
                      />
                    ))}
                    {corners.map((h) => (
                      <circle
                        key={h.kind}
                        cx={h.x}
                        cy={h.y}
                        r={handleR}
                        fill="#38BDF8"
                        stroke="#FFFFFF"
                        strokeWidth={1.5 * invScale}
                        style={{ cursor: h.cursor }}
                        onPointerDown={(e) => beginImageTransform(h.kind, e)}
                      />
                    ))}
                  </g>
                  {transformHudText && imageTransformRef.current?.imageId === img.id && (
                    <g transform={`translate(0, ${halfH + 22 * invScale})`} pointerEvents="none">
                      <rect
                        x={-48 * invScale}
                        y={-10 * invScale}
                        width={96 * invScale}
                        height={20 * invScale}
                        rx={6 * invScale}
                        fill="#0F172A"
                        stroke="#38BDF8"
                        strokeWidth={1.2 * invScale}
                        opacity={0.96}
                      />
                      <text
                        textAnchor="middle"
                        y={3.5 * invScale}
                        fill="#FFFFFF"
                        fontSize={10 * invScale}
                        fontWeight="700"
                        fontFamily="ui-monospace, monospace"
                      >
                        {transformHudText}
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

          {/* Stage 3: Interactive SVG Text Free Transform Gizmo */}
          {selectedText &&
            !draggingTextId &&
            toolMode !== 'connect' &&
            onUpdateText && (() => {
              const txt = selectedText;
              const { baseW, baseH } = getTextBoxDimensions(txt);
              const baseHalfW = baseW / 2;
              const baseHalfH = baseH / 2;
              const tScale = txt.scale ?? 1;
              const tScaleX = txt.scaleX ?? 1;
              const tScaleY = txt.scaleY ?? 1;
              const tRot = txt.rotation ?? 0;
              const halfW = Math.max(12, baseHalfW * tScale * tScaleX);
              const halfH = Math.max(10, baseHalfH * tScale * tScaleY);
              const invScale = 1 / Math.max(0.25, Math.min(2.5, viewTransform.scale));
              const handleR = 4.5 * invScale;
              const rotStem = 22 * invScale;

              const beginTextTransform = (
                handle: TransformHandleKind,
                e: React.PointerEvent
              ) => {
                e.stopPropagation();
                e.preventDefault();
                const curWorld = screenToWorld(e.clientX, e.clientY, false);
                const dx = curWorld.rawX - txt.x;
                const dy = curWorld.rawY - txt.y;
                textTransformRef.current = {
                  textId: txt.id,
                  handle,
                  centerX: txt.x,
                  centerY: txt.y,
                  baseHalfW,
                  baseHalfH,
                  startDist: Math.max(8, Math.hypot(dx, dy)),
                  startAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
                  origScale: tScale,
                  origScaleX: tScaleX,
                  origScaleY: tScaleY,
                  origRotation: tRot,
                };
              };

              const corners: Array<{ kind: TransformHandleKind; x: number; y: number; cursor: string }> = [
                { kind: 'nw', x: -halfW, y: -halfH, cursor: 'nwse-resize' },
                { kind: 'ne', x: halfW, y: -halfH, cursor: 'nesw-resize' },
                { kind: 'se', x: halfW, y: halfH, cursor: 'nwse-resize' },
                { kind: 'sw', x: -halfW, y: halfH, cursor: 'nesw-resize' },
              ];
              const edges: Array<{ kind: TransformHandleKind; x: number; y: number; cursor: string }> = [
                { kind: 'n', x: 0, y: -halfH, cursor: 'ns-resize' },
                { kind: 'e', x: halfW, y: 0, cursor: 'ew-resize' },
                { kind: 's', x: 0, y: halfH, cursor: 'ns-resize' },
                { kind: 'w', x: -halfW, y: 0, cursor: 'ew-resize' },
              ];

              return (
                <g className="export-ignore" transform={`translate(${txt.x}, ${txt.y})`}>
                  <g transform={`rotate(${tRot})`}>
                    <rect
                      x={-halfW}
                      y={-halfH}
                      width={halfW * 2}
                      height={halfH * 2}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={1.4 * invScale}
                      strokeDasharray={`${4 * invScale} ${3 * invScale}`}
                      pointerEvents="none"
                    />
                    <line
                      x1={0}
                      y1={-halfH}
                      x2={0}
                      y2={-halfH - rotStem}
                      stroke="#38BDF8"
                      strokeWidth={1.4 * invScale}
                      pointerEvents="none"
                    />
                    <circle
                      cx={0}
                      cy={-halfH - rotStem}
                      r={handleR * 1.15}
                      fill="#0284C7"
                      stroke="#FFFFFF"
                      strokeWidth={1.5 * invScale}
                      style={{ cursor: 'grab' }}
                      onPointerDown={(e) => beginTextTransform('rotate', e)}
                    />
                    {edges.map((h) => (
                      <rect
                        key={h.kind}
                        x={h.x - handleR * 0.78}
                        y={h.y - handleR * 0.78}
                        width={handleR * 1.56}
                        height={handleR * 1.56}
                        rx={1.5 * invScale}
                        fill="#FFFFFF"
                        stroke="#0284C7"
                        strokeWidth={1.4 * invScale}
                        style={{ cursor: h.cursor }}
                        onPointerDown={(e) => beginTextTransform(h.kind, e)}
                      />
                    ))}
                    {corners.map((h) => (
                      <circle
                        key={h.kind}
                        cx={h.x}
                        cy={h.y}
                        r={handleR}
                        fill="#38BDF8"
                        stroke="#FFFFFF"
                        strokeWidth={1.5 * invScale}
                        style={{ cursor: h.cursor }}
                        onPointerDown={(e) => beginTextTransform(h.kind, e)}
                      />
                    ))}
                  </g>
                  {transformHudText && textTransformRef.current?.textId === txt.id && (
                    <g transform={`translate(0, ${halfH + 22 * invScale})`} pointerEvents="none">
                      <rect
                        x={-48 * invScale}
                        y={-10 * invScale}
                        width={96 * invScale}
                        height={20 * invScale}
                        rx={6 * invScale}
                        fill="#0F172A"
                        stroke="#38BDF8"
                        strokeWidth={1.2 * invScale}
                        opacity={0.96}
                      />
                      <text
                        textAnchor="middle"
                        y={3.5 * invScale}
                        fill="#FFFFFF"
                        fontSize={10 * invScale}
                        fontWeight="700"
                        fontFamily="ui-monospace, monospace"
                      >
                        {transformHudText}
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

          {/* Stage 3: Interactive Single-Station SVG Free Transform Gizmo */}
          {selectedSingleStation &&
            !draggingStationId &&
            !draggingLabelStationId &&
            toolMode !== 'connect' &&
            onUpdateStation && (() => {
              const st = selectedSingleStation;
              const baseHalf = st.isVirtual ? 13 : 16;
              const stScale = st.scale ?? 1;
              const stScaleX = st.scaleX ?? 1;
              const stScaleY = st.scaleY ?? 1;
              const stRot = st.rotation ?? 0;
              const halfW = Math.max(10, baseHalf * stScale * stScaleX);
              const halfH = Math.max(10, baseHalf * stScale * stScaleY);
              const invScale = 1 / Math.max(0.25, Math.min(2.5, viewTransform.scale));
              const handleR = 4.5 * invScale;
              const rotStem = 22 * invScale;

              const beginSingleTransform = (
                handle: TransformHandleKind,
                e: React.PointerEvent
              ) => {
                e.stopPropagation();
                e.preventDefault();
                const curWorld = screenToWorld(e.clientX, e.clientY, false);
                const dx = curWorld.rawX - st.x;
                const dy = curWorld.rawY - st.y;
                stationTransformRef.current = {
                  stationId: st.id,
                  handle,
                  centerX: st.x,
                  centerY: st.y,
                  baseHalf,
                  startDist: Math.max(4, Math.hypot(dx, dy)),
                  startAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
                  origScale: stScale,
                  origScaleX: stScaleX,
                  origScaleY: stScaleY,
                  origRotation: stRot,
                };
              };

              const corners: Array<{ kind: TransformHandleKind; x: number; y: number; cursor: string }> = [
                { kind: 'nw', x: -halfW, y: -halfH, cursor: 'nwse-resize' },
                { kind: 'ne', x: halfW, y: -halfH, cursor: 'nesw-resize' },
                { kind: 'se', x: halfW, y: halfH, cursor: 'nwse-resize' },
                { kind: 'sw', x: -halfW, y: halfH, cursor: 'nesw-resize' },
              ];
              const edges: Array<{ kind: TransformHandleKind; x: number; y: number; cursor: string }> = [
                { kind: 'n', x: 0, y: -halfH, cursor: 'ns-resize' },
                { kind: 'e', x: halfW, y: 0, cursor: 'ew-resize' },
                { kind: 's', x: 0, y: halfH, cursor: 'ns-resize' },
                { kind: 'w', x: -halfW, y: 0, cursor: 'ew-resize' },
              ];

              return (
                <g className="export-ignore" transform={`translate(${st.x}, ${st.y})`}>
                  <g transform={`rotate(${stRot})`}>
                    {/* Transform Bounding Box */}
                    <rect
                      x={-halfW}
                      y={-halfH}
                      width={halfW * 2}
                      height={halfH * 2}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={1.4 * invScale}
                      strokeDasharray={`${4 * invScale} ${3 * invScale}`}
                      pointerEvents="none"
                    />

                    {/* Top Rotation Lollipop */}
                    <line
                      x1={0}
                      y1={-halfH}
                      x2={0}
                      y2={-halfH - rotStem}
                      stroke="#38BDF8"
                      strokeWidth={1.4 * invScale}
                      pointerEvents="none"
                    />
                    <circle
                      cx={0}
                      cy={-halfH - rotStem}
                      r={handleR * 1.15}
                      fill="#0284C7"
                      stroke="#FFFFFF"
                      strokeWidth={1.5 * invScale}
                      style={{ cursor: 'grab' }}
                      onPointerDown={(e) => beginSingleTransform('rotate', e)}
                    />

                    {/* Edge Stretch Handles (X / Y independent stretch) */}
                    {edges.map((h) => (
                      <rect
                        key={h.kind}
                        x={h.x - handleR * 0.78}
                        y={h.y - handleR * 0.78}
                        width={handleR * 1.56}
                        height={handleR * 1.56}
                        rx={1.5 * invScale}
                        fill="#FFFFFF"
                        stroke="#0284C7"
                        strokeWidth={1.4 * invScale}
                        style={{ cursor: h.cursor }}
                        onPointerDown={(e) => beginSingleTransform(h.kind, e)}
                      />
                    ))}

                    {/* Corner Scale Handles (Uniform scale, Shift for free stretch) */}
                    {corners.map((h) => (
                      <circle
                        key={h.kind}
                        cx={h.x}
                        cy={h.y}
                        r={handleR}
                        fill="#38BDF8"
                        stroke="#FFFFFF"
                        strokeWidth={1.5 * invScale}
                        style={{ cursor: h.cursor }}
                        onPointerDown={(e) => beginSingleTransform(h.kind, e)}
                      />
                    ))}
                  </g>

                  {/* Live Numeric HUD Pill during drag */}
                  {transformHudText && stationTransformRef.current?.stationId === st.id && (
                    <g transform={`translate(0, ${halfH + 22 * invScale})`} pointerEvents="none">
                      <rect
                        x={-48 * invScale}
                        y={-10 * invScale}
                        width={96 * invScale}
                        height={20 * invScale}
                        rx={6 * invScale}
                        fill="#0F172A"
                        stroke="#38BDF8"
                        strokeWidth={1.2 * invScale}
                        opacity={0.96}
                      />
                      <text
                        textAnchor="middle"
                        y={3.5 * invScale}
                        fill="#FFFFFF"
                        fontSize={10 * invScale}
                        fontWeight="700"
                        fontFamily="ui-monospace, monospace"
                      >
                        {transformHudText}
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

          {/* Stage 3: Multi-Station Group SVG Free Transform Gizmo */}
          {currentSelectedStationIds.length > 1 &&
            !draggingStationId &&
            toolMode !== 'connect' &&
            (onBatchUpdateStations || onUpdateStationsPos) && (() => {
              const selectedSts = stations.filter((s) => currentSelectedStationIds.includes(s.id));
              if (selectedSts.length < 2) return null;

              let minX = Infinity;
              let maxX = -Infinity;
              let minY = Infinity;
              let maxY = -Infinity;
              selectedSts.forEach((s) => {
                minX = Math.min(minX, s.x);
                maxX = Math.max(maxX, s.x);
                minY = Math.min(minY, s.y);
                maxY = Math.max(maxY, s.y);
              });

              const pad = 26;
              const cx = (minX + maxX) / 2;
              const cy = (minY + maxY) / 2;
              const halfW = Math.max(28, (maxX - minX) / 2 + pad);
              const halfH = Math.max(28, (maxY - minY) / 2 + pad);
              const invScale = 1 / Math.max(0.25, Math.min(2.5, viewTransform.scale));
              const handleR = 5 * invScale;
              const rotStem = 26 * invScale;

              const beginGroupTransform = (
                handle: TransformHandleKind,
                e: React.PointerEvent
              ) => {
                e.stopPropagation();
                e.preventDefault();
                const curWorld = screenToWorld(e.clientX, e.clientY, false);
                const dx = curWorld.rawX - cx;
                const dy = curWorld.rawY - cy;
                groupTransformRef.current = {
                  handle,
                  cx,
                  cy,
                  halfW,
                  halfH,
                  startAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
                  startDist: Math.max(8, Math.hypot(dx, dy)),
                  initialStations: selectedSts.map((s) => ({
                    id: s.id,
                    x: s.x,
                    y: s.y,
                    scale: s.scale ?? 1,
                  })),
                };
              };

              const corners: Array<{ kind: TransformHandleKind; x: number; y: number; cursor: string }> = [
                { kind: 'nw', x: -halfW, y: -halfH, cursor: 'nwse-resize' },
                { kind: 'ne', x: halfW, y: -halfH, cursor: 'nesw-resize' },
                { kind: 'se', x: halfW, y: halfH, cursor: 'nwse-resize' },
                { kind: 'sw', x: -halfW, y: halfH, cursor: 'nesw-resize' },
              ];
              const edges: Array<{ kind: TransformHandleKind; x: number; y: number; cursor: string }> = [
                { kind: 'n', x: 0, y: -halfH, cursor: 'ns-resize' },
                { kind: 'e', x: halfW, y: 0, cursor: 'ew-resize' },
                { kind: 's', x: 0, y: halfH, cursor: 'ns-resize' },
                { kind: 'w', x: -halfW, y: 0, cursor: 'ew-resize' },
              ];

              return (
                <g className="export-ignore" transform={`translate(${cx}, ${cy})`}>
                  <rect
                    x={-halfW}
                    y={-halfH}
                    width={halfW * 2}
                    height={halfH * 2}
                    fill="rgba(99, 102, 241, 0.04)"
                    stroke="#818CF8"
                    strokeWidth={1.6 * invScale}
                    strokeDasharray={`${5 * invScale} ${3 * invScale}`}
                    rx={4 * invScale}
                    pointerEvents="none"
                  />

                  {/* Top Group Rotation Handle */}
                  <line
                    x1={0}
                    y1={-halfH}
                    x2={0}
                    y2={-halfH - rotStem}
                    stroke="#818CF8"
                    strokeWidth={1.6 * invScale}
                    pointerEvents="none"
                  />
                  <circle
                    cx={0}
                    cy={-halfH - rotStem}
                    r={handleR * 1.15}
                    fill="#4F46E5"
                    stroke="#FFFFFF"
                    strokeWidth={1.5 * invScale}
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => beginGroupTransform('rotate', e)}
                  />

                  {/* Edge Stretch Handles */}
                  {edges.map((h) => (
                    <rect
                      key={h.kind}
                      x={h.x - handleR * 0.8}
                      y={h.y - handleR * 0.8}
                      width={handleR * 1.6}
                      height={handleR * 1.6}
                      rx={1.5 * invScale}
                      fill="#FFFFFF"
                      stroke="#4F46E5"
                      strokeWidth={1.5 * invScale}
                      style={{ cursor: h.cursor }}
                      onPointerDown={(e) => beginGroupTransform(h.kind, e)}
                    />
                  ))}

                  {/* Corner Group Scale Handles */}
                  {corners.map((h) => (
                    <circle
                      key={h.kind}
                      cx={h.x}
                      cy={h.y}
                      r={handleR}
                      fill="#6366F1"
                      stroke="#FFFFFF"
                      strokeWidth={1.5 * invScale}
                      style={{ cursor: h.cursor }}
                      onPointerDown={(e) => beginGroupTransform(h.kind, e)}
                    />
                  ))}

                  {/* Group Transform Live HUD Pill */}
                  {transformHudText && groupTransformRef.current && (
                    <g transform={`translate(0, ${halfH + 22 * invScale})`} pointerEvents="none">
                      <rect
                        x={-56 * invScale}
                        y={-10 * invScale}
                        width={112 * invScale}
                        height={20 * invScale}
                        rx={6 * invScale}
                        fill="#1E1B4B"
                        stroke="#818CF8"
                        strokeWidth={1.2 * invScale}
                        opacity={0.96}
                      />
                      <text
                        textAnchor="middle"
                        y={3.5 * invScale}
                        fill="#FFFFFF"
                        fontSize={10 * invScale}
                        fontWeight="700"
                        fontFamily="ui-monospace, monospace"
                      >
                        {transformHudText}
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

          {/* Shortest Path Sequential Station Markers & Badges */}
          {showShortestPathPreview && shortestPathResult && shortestPathResult.stationIds.length >= 2 && (
            <g className="pointer-events-none shortest-path-badges-layer export-ignore">
              {shortestPathResult.stationIds.map((stId, idx) => {
                const st = stations.find((s) => s.id === stId);
                if (!st) return null;
                const isStart = idx === 0;
                const isEnd = idx === shortestPathResult.stationIds.length - 1;

                return (
                  <g
                    key={`sp-badge-${st.id}`}
                    transform={`translate(${st.x}, ${st.y})`}
                    className="pointer-events-none"
                  >
                    {/* Glowing highlight ring around station */}
                    <circle
                      r={st.isVirtual ? 16 : 22}
                      fill="none"
                      stroke={isStart ? '#10B981' : isEnd ? '#F43F5E' : '#38BDF8'}
                      strokeWidth={2.5}
                      strokeDasharray={isStart || isEnd ? '4 3' : undefined}
                      opacity={0.9}
                      className={isStart || isEnd ? 'animate-spin' : ''}
                      style={{ animationDuration: '6s' }}
                    />

                    {/* Sequential badge pin floating above the station */}
                    <g transform="translate(0, -28)">
                      <rect
                        x={isStart ? -26 : isEnd ? -26 : -14}
                        y={-12}
                        width={isStart ? 52 : isEnd ? 52 : 28}
                        height={22}
                        rx={11}
                        fill={isStart ? '#065F46' : isEnd ? '#881337' : '#0F172A'}
                        stroke={isStart ? '#34D399' : isEnd ? '#FB7185' : '#38BDF8'}
                        strokeWidth={1.8}
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
                      />
                      <text
                        y={3.5}
                        textAnchor="middle"
                        className="font-sans text-[11px] font-extrabold fill-white select-none"
                      >
                        {isStart ? t('canvas.pathStart') : isEnd ? t('canvas.pathEnd') : `${idx + 1}`}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Marquee Selection Rectangle */}
          {marqueeBox && (() => {
            const bx = Math.min(marqueeBox.startX, marqueeBox.endX);
            const by = Math.min(marqueeBox.startY, marqueeBox.endY);
            const bw = Math.max(Math.abs(marqueeBox.endX - marqueeBox.startX), 1);
            const bh = Math.max(Math.abs(marqueeBox.endY - marqueeBox.startY), 1);
            const count = currentSelectedStationIds.length;

            return (
              <g className="pointer-events-none select-none">
                <rect
                  x={bx}
                  y={by}
                  width={bw}
                  height={bh}
                  fill="rgba(99, 102, 241, 0.15)"
                  stroke="#6366F1"
                  strokeWidth={1.5 / viewTransform.scale}
                  strokeDasharray={`${6 / viewTransform.scale} ${3 / viewTransform.scale}`}
                  rx={3 / viewTransform.scale}
                />
                {bw > 35 && bh > 25 && count > 0 && (
                  <g transform={`translate(${bx + bw - (66 / viewTransform.scale)}, ${by + bh + (4 / viewTransform.scale)})`}>
                    <rect
                      x={0}
                      y={0}
                      width={66 / viewTransform.scale}
                      height={18 / viewTransform.scale}
                      rx={4 / viewTransform.scale}
                      fill="#4F46E5"
                      fillOpacity={0.92}
                    />
                    <text
                      x={33 / viewTransform.scale}
                      y={12.5 / viewTransform.scale}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize={10 / viewTransform.scale}
                      fontWeight="600"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {t('canvas.nodeCountBadge', { count })}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

        </g>
      </svg>

      {/* Floating Batch Selection Control Bar */}
      {currentSelectedStationIds.length > 1 && (
        <div
          className={`absolute top-12 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-lg border select-none max-w-[95vw] ${
            isLight
              ? 'bg-white/95 border-zinc-200 text-zinc-800'
              : 'bg-[#111113]/95 border-zinc-800 text-zinc-100'
          }`}
        >
          <span
            className={`text-xs font-mono tabular-nums pr-2 border-r ${
              isLight ? 'border-zinc-200 text-zinc-700' : 'border-zinc-800 text-zinc-300'
            }`}
          >
            {t('canvas.batchSelected', { count: currentSelectedStationIds.length })}
          </span>

          <button
            onClick={handleBatchAlignY}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-200'
            }`}
            title={t('canvas.alignHTip')}
          >
            {t('canvas.alignH')}
          </button>

          <button
            onClick={handleBatchAlignX}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-200'
            }`}
            title={t('canvas.alignVTip')}
          >
            {t('canvas.alignV')}
          </button>

          {currentSelectedStationIds.length >= 3 && (
            <button
              onClick={handleBatchDistributeH}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer hidden sm:inline-flex ${
                isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-200'
              }`}
              title={t('canvas.distributeHTip')}
            >
              {t('canvas.distributeH')}
            </button>
          )}

          {onBatchUpdateStationsZIndex && (
            <div className={`flex items-center gap-1 pl-1.5 border-l ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <button
                type="button"
                onClick={() => onBatchUpdateStationsZIndex(currentSelectedStationIds, -1)}
                className={`flex items-center gap-0.5 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-200'
                }`}
                title={t('canvas.layerDownTip')}
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('canvas.layerDown')}</span>
              </button>
              <button
                type="button"
                onClick={() => onBatchUpdateStationsZIndex(currentSelectedStationIds, 1)}
                className={`flex items-center gap-0.5 px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  isLight ? 'hover:bg-zinc-100 text-zinc-700' : 'hover:bg-zinc-800 text-zinc-200'
                }`}
                title={t('canvas.layerUpTip')}
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('canvas.layerUp')}</span>
              </button>
            </div>
          )}

          <button
            onClick={() => {
              if (onBatchDeleteStations) {
                onBatchDeleteStations(currentSelectedStationIds);
              } else {
                onDeleteSelected();
              }
            }}
            className="px-2 py-1 text-xs font-medium rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title={t('canvas.deleteTip')}
          >
            {t('canvas.deleteBtn', { count: currentSelectedStationIds.length })}
          </button>

          <button
            onClick={() => {
              onSelectStationIds?.([]);
              onSelectStation(null);
            }}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isLight ? 'text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
            title={t('canvas.clearSelection')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Single Element Quick Controls */}
      {((selectedConn && onUpdateConnectionZIndex) ||
        (selectedSingleStation && onUpdateStationZIndex) ||
        (selectedImage && onUpdateImageZIndex) ||
        (selectedText && onUpdateTextZIndex)) && (() => {
        const isConn = Boolean(selectedConn);
        const isImg = Boolean(!isConn && selectedImage);
        const isTxt = Boolean(!isConn && !isImg && selectedText);
        const currentZ = clampZOrder(
          isConn
            ? selectedConn?.zIndex ?? 0
            : isImg
            ? selectedImage?.zIndex ?? -1
            : isTxt
            ? selectedText?.zIndex ?? 1
            : selectedSingleStation?.zIndex ?? 0
        );
        const setZ = (next: number) => {
          const clamped = clampZOrder(next);
          if (isConn && selectedConn && onUpdateConnectionZIndex) {
            onUpdateConnectionZIndex(selectedConn.id, clamped);
          } else if (isImg && selectedImage && onUpdateImageZIndex) {
            onUpdateImageZIndex(selectedImage.id, clamped);
          } else if (isTxt && selectedText && onUpdateTextZIndex) {
            onUpdateTextZIndex(selectedText.id, clamped);
          } else if (selectedSingleStation && onUpdateStationZIndex) {
            onUpdateStationZIndex(selectedSingleStation.id, clamped);
          }
        };
        const labelText = isConn
          ? t('canvas.lineSegment')
          : isImg
          ? selectedImage?.name || t('canvas.defaultImageName')
          : isTxt
          ? selectedText?.content?.split('\n')[0] || t('canvas.defaultTextName')
          : selectedSingleStation?.isVirtual
          ? t('canvas.virtualNode')
          : selectedSingleStation?.name || t('canvas.defaultStationName');

        const btnClass = `px-1.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
          isLight
            ? 'text-zinc-700 hover:bg-zinc-100'
            : 'text-zinc-300 hover:bg-zinc-800'
        }`;

        return (
          <div
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-lg shadow-lg border select-none transition-colors max-w-[92vw] ${
              isLight
                ? 'bg-white/95 border-zinc-200 text-zinc-800'
                : 'bg-[#111113]/95 border-zinc-800 text-zinc-100'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 pr-2 border-r text-xs ${
                isLight ? 'border-zinc-200' : 'border-zinc-800'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <span className="font-medium truncate max-w-[90px] hidden sm:inline">
                {labelText}
              </span>
              <span className="font-mono text-[11px] font-semibold tabular-nums">
                {currentZ > 0 ? `+${currentZ}` : currentZ}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setZ(MIN_Z_ORDER)}
              disabled={currentZ <= MIN_Z_ORDER}
              className={btnClass}
              title={t('canvas.toBottomTip')}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setZ(currentZ - 1)}
              disabled={currentZ <= MIN_Z_ORDER}
              className={`flex items-center gap-0.5 ${btnClass}`}
              title={t('canvas.layerDownTip')}
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>{t('canvas.layerDown')}</span>
            </button>

            <button
              type="button"
              onClick={() => setZ(currentZ + 1)}
              disabled={currentZ >= MAX_Z_ORDER}
              className={`flex items-center gap-0.5 ${btnClass}`}
              title={t('canvas.layerUpTip')}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>{t('canvas.layerUp')}</span>
            </button>

            <button
              type="button"
              onClick={() => setZ(MAX_Z_ORDER)}
              disabled={currentZ >= MAX_Z_ORDER}
              className={btnClass}
              title={t('canvas.toTopTip')}
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>

            {currentZ !== 0 && (
              <button
                type="button"
                onClick={() => setZ(0)}
                className={btnClass}
                title={t('canvas.resetLayerTip')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick Parallel Offset & Stroke Width Controls */}
            {isConn && selectedConn && (onUpdateConnectionOffset || onUpdateConnectionStyle) && (
              <div
                className={`flex items-center gap-1 pl-2 ml-0.5 border-l ${
                  isLight ? 'border-zinc-200' : 'border-zinc-800'
                }`}
              >
                {onUpdateConnectionOffset && (() => {
                  const curOffset = clampLineOffset(selectedConn.offset ?? 0);
                  return (
                    <div className="flex items-center gap-0.5">
                      <span className={`text-[11px] hidden md:inline mr-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {t('canvas.offset')}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateConnectionOffset(selectedConn.id, clampLineOffset(curOffset - 1))}
                        className={`${btnClass} font-mono`}
                        title={t('canvas.offsetMinusTip')}
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateConnectionOffset(selectedConn.id, 0)}
                        className={`${btnClass} font-mono tabular-nums font-semibold`}
                        title={t('canvas.offsetResetTip')}
                      >
                        {curOffset > 0 ? `+${curOffset}` : curOffset}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateConnectionOffset(selectedConn.id, clampLineOffset(curOffset + 1))}
                        className={`${btnClass} font-mono`}
                        title={t('canvas.offsetPlusTip')}
                      >
                        +1
                      </button>
                    </div>
                  );
                })()}

                {onUpdateConnectionStyle && (() => {
                  const curWidth = normalizeStrokeWidth(selectedConn.strokeWidth ?? 6);
                  return (
                    <div
                      className={`flex items-center gap-0.5 pl-1.5 border-l ${
                        isLight ? 'border-zinc-200' : 'border-zinc-800'
                      }`}
                    >
                      <span className={`text-[11px] hidden md:inline mr-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {t('canvas.strokeWidth')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onRecordHistory?.();
                          onUpdateConnectionStyle(selectedConn.id, {
                            strokeWidth: normalizeStrokeWidth(curWidth - 1),
                          });
                        }}
                        className={`${btnClass} font-mono`}
                        title={t('canvas.widthMinusTip')}
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRecordHistory?.();
                          onUpdateConnectionStyle(selectedConn.id, { strokeWidth: 6 });
                        }}
                        className={`${btnClass} font-mono tabular-nums font-semibold`}
                        title={t('canvas.widthResetTip')}
                      >
                        {curWidth}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRecordHistory?.();
                          onUpdateConnectionStyle(selectedConn.id, {
                            strokeWidth: normalizeStrokeWidth(curWidth + 1),
                          });
                        }}
                        className={`${btnClass} font-mono`}
                        title={t('canvas.widthPlusTip')}
                      >
                        +1
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Quick Station SVG Scale Controls */}
            {!isConn && !isImg && !isTxt && selectedSingleStation && onUpdateStation && (() => {
              const curScale = normalizeSvgScale(selectedSingleStation.scale ?? 1);
              return (
                <div
                  className={`flex items-center gap-0.5 pl-2 ml-0.5 border-l ${
                    isLight ? 'border-zinc-200' : 'border-zinc-800'
                  }`}
                >
                  <span className={`text-[11px] hidden md:inline mr-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {t('canvas.scale')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onRecordHistory?.();
                      onUpdateStation({
                        ...selectedSingleStation,
                        scale: normalizeSvgScale(curScale - 0.2),
                      });
                    }}
                    className={`${btnClass} font-mono`}
                    title={t('canvas.scaleMinusTip')}
                  >
                    -0.2
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRecordHistory?.();
                      onUpdateStation({
                        ...selectedSingleStation,
                        scale: 1,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                      });
                    }}
                    className={`${btnClass} font-mono tabular-nums font-semibold`}
                    title={t('canvas.scaleResetTip')}
                  >
                    {curScale}×
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRecordHistory?.();
                      onUpdateStation({
                        ...selectedSingleStation,
                        scale: normalizeSvgScale(curScale + 0.2),
                      });
                    }}
                    className={`${btnClass} font-mono`}
                    title={t('canvas.scalePlusTip')}
                  >
                    +0.2
                  </button>
                </div>
              );
            })()}

            {/* Quick Image SVG Scale Controls */}
            {isImg && selectedImage && onUpdateImage && (() => {
              const curScale = normalizeSvgScale(selectedImage.scale ?? 1);
              return (
                <div
                  className={`flex items-center gap-0.5 pl-2 ml-0.5 border-l ${
                    isLight ? 'border-zinc-200' : 'border-zinc-800'
                  }`}
                >
                  <span className={`text-[11px] hidden md:inline mr-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {t('canvas.scale')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onRecordHistory?.();
                      onUpdateImage({
                        ...selectedImage,
                        scale: normalizeSvgScale(curScale - 0.2, 0.08),
                      });
                    }}
                    className={`${btnClass} font-mono`}
                    title={t('canvas.scaleMinusTip')}
                  >
                    -0.2
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRecordHistory?.();
                      onUpdateImage({
                        ...selectedImage,
                        scale: 1,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                      });
                    }}
                    className={`${btnClass} font-mono tabular-nums font-semibold`}
                    title={t('canvas.scaleResetTip')}
                  >
                    {curScale}×
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRecordHistory?.();
                      onUpdateImage({
                        ...selectedImage,
                        scale: normalizeSvgScale(curScale + 0.2, 0.08),
                      });
                    }}
                    className={`${btnClass} font-mono`}
                    title={t('canvas.scalePlusTip')}
                  >
                    +0.2
                  </button>
                </div>
              );
            })()}

            {/* Quick Text SVG Font Size & Scale Controls */}
            {isTxt && selectedText && onUpdateText && (() => {
              const curScale = normalizeSvgScale(selectedText.scale ?? 1);
              return (
                <div
                  className={`flex items-center gap-0.5 pl-2 ml-0.5 border-l ${
                    isLight ? 'border-zinc-200' : 'border-zinc-800'
                  }`}
                >
                  <span className={`text-[11px] hidden md:inline mr-1 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {t('canvas.fontSize')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onRecordHistory?.();
                      onUpdateText({
                        ...selectedText,
                        fontSize: Math.max(4, selectedText.fontSize - 2),
                      });
                    }}
                    className={`${btnClass} font-mono`}
                    title={t('canvas.fontMinusTip')}
                  >
                    -2
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRecordHistory?.();
                      onUpdateText({
                        ...selectedText,
                        scale: 1,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                      });
                    }}
                    className={`${btnClass} font-mono tabular-nums font-semibold`}
                    title={t('canvas.fontResetTip')}
                  >
                    {selectedText.fontSize}{curScale !== 1 ? ` · ${curScale}×` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRecordHistory?.();
                      onUpdateText({
                        ...selectedText,
                        fontSize: selectedText.fontSize + 2,
                      });
                    }}
                    className={`${btnClass} font-mono`}
                    title={t('canvas.fontPlusTip')}
                  >
                    +2
                  </button>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* Floating Inline Station Rename Editor (Double-click station or label) */}
      {editingStationId && (() => {
        const editingStation = stations.find((s) => s.id === editingStationId);
        if (!editingStation || editingStation.isVirtual) return null;

        let labelDx = 0;
        let labelDy = -18;
        if (editingStation.labelPosition === 'custom' && editingStation.labelOffset) {
          labelDx = editingStation.labelOffset.x;
          labelDy = editingStation.labelOffset.y;
        } else {
          const presetKey = (editingStation.labelPosition || 'top') as keyof typeof LABEL_POSITION_PRESETS;
          const preset = LABEL_POSITION_PRESETS[presetKey];
          if (preset) {
            labelDx = preset.dx;
            labelDy = preset.dy;
          }
        }

        const rawLeft = (editingStation.x + labelDx) * viewTransform.scale + viewTransform.x;
        const rawTop = (editingStation.y + labelDy) * viewTransform.scale + viewTransform.y - 38;
        const containerW = containerRef.current?.clientWidth || 800;
        const containerH = containerRef.current?.clientHeight || 600;
        const clampedLeft = Math.max(120, Math.min(containerW - 120, rawLeft));
        const clampedTop = Math.max(16, Math.min(containerH - 64, rawTop));

        return (
          <div
            translate="no"
            style={{
              left: `${clampedLeft}px`,
              top: `${clampedTop}px`,
              transform: 'translate(-50%, -100%)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className={`notranslate absolute z-30 flex items-center gap-1.5 p-1.5 rounded-lg border shadow-xl ${
              isLight
                ? 'bg-white border-zinc-300 text-zinc-900'
                : 'bg-[#18181B] border-zinc-700 text-zinc-100'
            }`}
          >
            <input
              ref={inlineNameInputRef}
              type="text"
              value={editingStationName}
              onCompositionStart={() => {
                isComposingInlineNameRef.current = true;
              }}
              onCompositionEnd={(e) => {
                isComposingInlineNameRef.current = false;
                const finalVal = e.currentTarget.value;
                setEditingStationName(finalVal);
                applyInlineStationName(finalVal, false);
              }}
              onChange={(e) => {
                const val = e.target.value;
                setEditingStationName(val);
                if (!isComposingInlineNameRef.current && !(e.nativeEvent as InputEvent)?.isComposing) {
                  applyInlineStationName(val, false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (isComposingInlineNameRef.current || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  applyInlineStationName(e.currentTarget.value, true);
                } else if (e.key === 'Escape') {
                  if (isComposingInlineNameRef.current || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  cancelInlineEditStation();
                }
              }}
              onBlur={(e) => {
                isComposingInlineNameRef.current = false;
                applyInlineStationName(e.currentTarget.value, true);
              }}
              placeholder={t('canvas.inlinePlaceholder')}
              className={`w-40 px-2.5 py-1 text-xs rounded border focus:outline-none ${
                isLight
                  ? 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:bg-white focus:border-zinc-900'
                  : 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-zinc-400'
              }`}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                isComposingInlineNameRef.current = false;
                const val = inlineNameInputRef.current?.value ?? editingStationName;
                applyInlineStationName(val, true);
              }}
              className={`px-2 py-1 text-xs font-medium rounded inline-flex items-center gap-1 cursor-pointer transition-colors ${
                isLight
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                  : 'bg-zinc-100 hover:bg-white text-zinc-900'
              }`}
              title={t('canvas.confirmTip')}
            >
              <Check className="w-3 h-3" />
              <span>{t('canvas.confirm')}</span>
            </button>
          </div>
        );
      })()}
    </div>
  );
};
