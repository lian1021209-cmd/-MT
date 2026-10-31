import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Station, 
  MetroLine, 
  Connection, 
  ToolMode, 
  RouteType, 
  Point, 
  EffectiveTheme,
  LabelPosition,
  LABEL_POSITION_PRESETS
} from '../types/metro';
import { 
  snapToGrid, 
  getMetroPath, 
  getSmoothCatmullRomPath,
  simplifyPoints
} from '../utils/geometry';
import { 
  Plus, 
  Minus, 
  Maximize2, 
  Crosshair, 
  Compass
} from 'lucide-react';

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
  activeColor: string;
  toolMode: ToolMode;
  onSetToolMode: (mode: ToolMode) => void;
  selectedStationId: string | null;
  selectedConnectionId: string | null;
  gridSnap: boolean;
  gridSize: number;
  nodeAlign?: boolean;
  activeRouteType: RouteType;
  onSelectStation: (id: string | null) => void;
  onSelectConnection: (id: string | null) => void;
  onAddStation: (station: Station) => void;
  onUpdateStationPos: (id: string, x: number, y: number) => void;
  onUpdateStation?: (updated: Station) => void;
  onAddConnection: (
    fromId: string, 
    toId: string, 
    color: string, 
    routeType: RouteType, 
    waypoints?: Point[]
  ) => void;
  onUpdateConnectionWaypoints: (connId: string, waypoints: Point[]) => void;
  onDeleteSelected: () => void;
  theme?: EffectiveTheme;
}

export const MetroCanvas: React.FC<MetroCanvasProps> = ({
  stations,
  lines: _lines,
  connections,
  activeColor,
  toolMode,
  onSetToolMode,
  selectedStationId,
  selectedConnectionId,
  gridSnap,
  gridSize,
  nodeAlign,
  activeRouteType,
  onSelectStation,
  onSelectConnection,
  onAddStation,
  onUpdateStationPos,
  onUpdateStation,
  onAddConnection,
  onUpdateConnectionWaypoints,
  onDeleteSelected,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Infinite Canvas Viewport State: X, Y offset in pixels, and scale factor
  const [viewTransform, setViewTransform] = useState({ x: 120, y: 100, scale: 1 });
  
  // Pan interaction states
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const canvasPointerDownRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const hasDraggedCanvasRef = useRef(false);

  // Station drag tracking
  const [draggingStationId, setDraggingStationId] = useState<string | null>(null);
  const dragInfoRef = useRef<{
    stationId: string;
    startWorldX: number;
    startWorldY: number;
    startStationX: number;
    startStationY: number;
  } | null>(null);

  // Draggable Station Name tracking (自由站名可拖動)
  const [draggingLabelStationId, setDraggingLabelStationId] = useState<string | null>(null);
  const labelDragRef = useRef<{
    stationId: string;
    startClientX: number;
    startClientY: number;
    origDx: number;
    origDy: number;
  } | null>(null);

  // Active 8-direction alignment guides during station dragging
  const [activeAlignmentGuides, setActiveAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const isCtrlPressedRef = useRef(false);
  const [isCtrlDown, setIsCtrlDown] = useState(false);

  // Active equal-distance red dashed guides (已有線段時，另一節點連線產生紅色虛線讓線段等距)
  const [activeEqualDistanceGuide, setActiveEqualDistanceGuide] = useState<EqualDistanceGuide | null>(null);
  const activeEqualDistanceGuideRef = useRef<EqualDistanceGuide | null>(null);

  // Connection source state
  const [connectSourceStationId, setConnectSourceStationId] = useState<string | null>(null);
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
  } | null>(null);
  const [draggingWaypointInfo, setDraggingWaypointInfo] = useState<{
    connId: string;
    index: number;
  } | null>(null);

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

  // Track Ctrl / Meta key state for 8-direction node alignment
  useEffect(() => {
    const handleKeyChange = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      isCtrlPressedRef.current = isCtrl;
      setIsCtrlDown(isCtrl);
    };

    window.addEventListener('keydown', handleKeyChange);
    window.addEventListener('keyup', handleKeyChange);
    return () => {
      window.removeEventListener('keydown', handleKeyChange);
      window.removeEventListener('keyup', handleKeyChange);
    };
  }, []);

  // Keyboard events: Delete to remove, Esc to cancel, V/A/X/C shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
        onSelectConnection(null);
        onSetToolMode('select');
      } else if (e.key === 'v' || e.key === 'V') {
        onSetToolMode('select');
      } else if (e.key === 'a' || e.key === 'A') {
        onSetToolMode('add_station');
      } else if (e.key === 'x' || e.key === 'X') {
        onSetToolMode('add_virtual_node');
      } else if (e.key === 'c' || e.key === 'C') {
        onSetToolMode('connect');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDeleteSelected, onSelectStation, onSelectConnection, onSetToolMode]);


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

  // Fit all stations into view
  const handleFitView = () => {
    if (!containerRef.current || stations.length === 0) {
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

      // 自由站名拖動處理 (Draggable station name)
      if (labelDragRef.current) {
        const { stationId, startClientX, startClientY, origDx, origDy } = labelDragRef.current;
        const deltaX = (e.clientX - startClientX) / viewTransform.scale;
        const deltaY = (e.clientY - startClientY) / viewTransform.scale;
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
                  label: `等距: ${Math.round(targetDist)}px`,
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

      // Station Drag: lock-step with lines
      if (dragInfoRef.current) {
        const { stationId, startWorldX, startWorldY, startStationX, startStationY } = dragInfoRef.current;
        const deltaX = worldPos.rawX - startWorldX;
        const deltaY = worldPos.rawY - startWorldY;
        const candX = Math.round(startStationX + deltaX);
        const candY = Math.round(startStationY + deltaY);

        // 平滑移動模式：按住 Ctrl 或開啟對齊模式觸發八方虛線與等距紅色虛線對齊
        const isCtrlActive = e.ctrlKey || e.metaKey || isCtrlPressedRef.current || !!nodeAlign;

        if (gridSnap && !isCtrlActive) {
          setActiveAlignmentGuides([]);
          activeEqualDistanceGuideRef.current = null;
          setActiveEqualDistanceGuide(null);
          onUpdateStationPos(
            stationId,
            snapToGrid(candX, gridSize),
            snapToGrid(candY, gridSize)
          );
          return;
        }

        if (!isCtrlActive) {
          setActiveAlignmentGuides([]);
          activeEqualDistanceGuideRef.current = null;
          setActiveEqualDistanceGuide(null);
          onUpdateStationPos(stationId, candX, candY);
          return;
        }

        // 觸發 Ctrl：計算與其他節點的八方 (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°) 軸向對齊與虛線
        const candidateStations = stations.filter((s) => s.id !== stationId);
        if (candidateStations.length === 0) {
          setActiveAlignmentGuides([]);
          onUpdateStationPos(stationId, candX, candY);
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
          angleLabel: target.x < x ? '0° 水平對齊' : '180° 水平對齊',
        });

        const createVGuide = (target: Station, x: number, y: number): AlignmentGuide => ({
          id: `guide-v-${target.id}`,
          type: 'vertical',
          targetStation: target,
          x1: target.x,
          y1: Math.min(target.y, y) - 220,
          x2: target.x,
          y2: Math.max(target.y, y) + 220,
          angleLabel: target.y < y ? '90° 垂直對齊' : '270° 垂直對齊',
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
            angleLabel: x >= target.x ? '45° 斜向對齊' : '225° 斜向對齊',
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
            angleLabel: x >= target.x ? '315° 斜向對齊' : '135° 斜向對齊',
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
                  label: `等距: ${Math.round(refDist)}px`,
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
        onUpdateStationPos(stationId, finalX, finalY);
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
              name: `車站 ${newStationIndex}`,
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
                  name: `車站 ${newStationIndex}`,
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
          } else if (toolMode === 'select') {
            onSelectStation(null);
            onSelectConnection(null);
          }
        }

      }
    };

    const handleBlur = () => {
      touchPointsRef.current.clear();
      pinchStartRef.current = null;
      labelDragRef.current = null;
      setDraggingLabelStationId(null);
      waypointDragRef.current = null;
      setDraggingWaypointInfo(null);
      dragInfoRef.current = null;
      setDraggingStationId(null);
      setActiveAlignmentGuides([]);
      activeEqualDistanceGuideRef.current = null;
      setActiveEqualDistanceGuide(null);
      canvasPointerDownRef.current = null;
      hasDraggedCanvasRef.current = false;
      setIsPanning(false);
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
    onAddStation, 
    onSelectStation, 
    onSelectConnection, 
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
    onUpdateStation,
    viewTransform.scale
  ]);

  // Pointer Down on canvas background
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
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
        setConnectSourceStationId(station.id);
        freeDrawingPointsRef.current = [];
        setFreeDrawingPoints([]);
        onSelectStation(station.id);
      } else if (connectSourceStationId !== station.id) {
        completeConnection(station, e.shiftKey);
      }
      return;
    }

    onSelectStation(station.id);
    onSelectConnection(null);

    const worldPos = screenToWorld(e.clientX, e.clientY, false);
    setDraggingStationId(station.id);
    dragInfoRef.current = {
      stationId: station.id,
      startWorldX: worldPos.rawX,
      startWorldY: worldPos.rawY,
      startStationX: station.x,
      startStationY: station.y,
    };
  };

  // Station Pointer Up: complete drag-to-connect if user dragged from source station
  const handleStationPointerUp = (e: React.PointerEvent, station: Station) => {
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

  // Dynamic cursor
  const getCursorClass = () => {
    if (isPanning) return 'cursor-grabbing';
    if (toolMode === 'add_station' || toolMode === 'add_virtual_node') return 'cursor-crosshair';
    if (toolMode === 'connect') return 'cursor-pointer';
    return 'cursor-grab';
  };


  return (
    <div
      ref={containerRef}
      className={`relative flex-1 h-full overflow-hidden select-none transition-colors touch-none ${
        isLight ? 'bg-[#F8FAFC]' : 'bg-slate-950'
      } ${getCursorClass()}`}
      style={{ touchAction: 'none' }}
      onWheel={handleWheel}
      onPointerDown={handleCanvasPointerDown}
    >
      {/* Top Floating Status (Responsive for Mobile / Tablet) */}
      <div
        className={`absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono rounded-lg px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-md backdrop-blur border pointer-events-none transition-colors ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-200/50'
            : 'bg-slate-900/90 border-slate-800 text-slate-300'
        }`}
      >
        <span className="flex items-center gap-1 text-indigo-500 font-semibold">
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">無限畫布</span>
        </span>
        <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>·</span>
        <span>{Math.round(viewTransform.scale * 100)}%</span>
        <span className={`hidden sm:inline ${isLight ? 'text-slate-300' : 'text-slate-600'}`}>·</span>
        <span className="hidden sm:inline">
          {mouseCanvasPos ? `(${mouseCanvasPos.x}, ${mouseCanvasPos.y})` : '(0, 0)'}
        </span>
        <span className={isLight ? 'text-slate-300' : 'text-slate-600'}>·</span>
        {!gridSnap ? (
          <span className="flex items-center gap-1 text-sky-500 font-sans font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            <span>平滑</span>
            <span
              className={`px-1 py-0.2 rounded text-[9px] font-mono border transition-all hidden sm:inline ${
                isCtrlDown || nodeAlign
                  ? 'bg-sky-500 text-white border-sky-400 font-bold'
                  : isLight
                  ? 'bg-sky-50 border-sky-200 text-sky-800'
                  : 'bg-sky-950/80 border-sky-800 text-sky-300'
              }`}
            >
              {isCtrlDown || nodeAlign ? '八方對齊中' : 'Ctrl 對齊'}
            </span>
          </span>
        ) : (
          <span className="text-indigo-500 font-sans font-medium">
            吸附 ({gridSize})
          </span>
        )}
        <span className={`hidden lg:inline ${isLight ? 'text-slate-300' : 'text-slate-600'}`}>·</span>
        <span className={`hidden lg:inline ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          {toolMode === 'add_station' && '點擊畫布放置車站 · 雙指滑動縮放'}
          {toolMode === 'connect' &&
            (connectSourceStationId
              ? '點選目標車站完成連線（Esc 取消）'
              : '點選起點車站以開始連線')}
          {toolMode === 'select' && '滑動移動畫布 · 拖曳車站移動 · 雙指縮放視角'}
        </span>
      </div>

      {/* Floating Canvas Navigation HUD (Bottom-Right) */}
      <div
        className={`absolute bottom-4 right-4 z-10 flex flex-col items-center gap-1.5 p-1 rounded-xl shadow-lg backdrop-blur border transition-colors ${
          isLight
            ? 'bg-white/95 border-slate-200 shadow-slate-200/60'
            : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        <button
          onClick={() => handleZoom('in')}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isLight
              ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="放大視角 (+)"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isLight
              ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="縮小視角 (-)"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className={`w-full h-px my-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
        <button
          onClick={handleFitView}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isLight
              ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="聚焦完整路網 (Fit View)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetToOrigin}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isLight
              ? 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="回到坐標原點 (0, 0)"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Main SVG Infinite World */}
      <svg
        ref={svgRef}
        className="w-full h-full block"
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
              r={1.1 / Math.max(viewTransform.scale, 0.4)}
              fill={isLight ? '#94A3B8' : '#475569'}
              fillOpacity={isLight ? 0.6 : 0.45}
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
              stroke={isLight ? '#CBD5E1' : '#334155'}
              strokeWidth={0.7 / Math.max(viewTransform.scale, 0.4)}
              strokeOpacity={isLight ? 0.65 : 0.25}
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
            <text x={8} y={-8} className={`${isLight ? 'fill-slate-600' : 'fill-slate-500'} font-mono text-[9px]`}>
              (0, 0) 原點
            </text>
          </g>

          {/* Render Connections with waypoints and diamond 90° corner */}
          {connections.map((conn) => {
            const fromSt = stations.find((s) => s.id === conn.fromStationId);
            const toSt = stations.find((s) => s.id === conn.toStationId);
            if (!fromSt || !toSt) return null;

            const lineColor = conn.color || activeColor;
            const isSelected = selectedConnectionId === conn.id;
            const pathData = getMetroPath(
              fromSt.x,
              fromSt.y,
              toSt.x,
              toSt.y,
              conn.routeType || '135_bend',
              14,
              conn.waypoints,
              conn.isFlipped,
              conn.angleA,
              conn.angleB
            );

            return (
              <g
                key={conn.id}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectConnection(conn.id);
                  onSelectStation(null);
                }}
                onDoubleClick={(e) => handleLineDoubleClick(conn, e)}
              >
                {/* Generous transparent hit area */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={22}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Highlight outline when selected */}
                {isSelected && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isLight ? '#0F172A' : '#ffffff'}
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isLight ? 0.25 : 0.8}
                  />
                )}
                {/* Main line body */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

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
                    <title>右鍵點擊可刪除此節點 · 拖曳以改變軌跡</title>
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

          {/* Render Stations */}
          {stations.map((st) => {
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

            return (
              <g
                key={st.id}
                transform={`translate(${st.x}, ${st.y})`}
                className={`cursor-pointer ${isDraggingThis ? 'opacity-95' : ''}`}
                onPointerDown={(e) => handleStationPointerDown(e, st)}
                onPointerUp={(e) => handleStationPointerUp(e, st)}
              >
                {/* Generous transparent hit area so all stations can be clicked and dragged effortlessly on mobile / desktop */}
                <circle r={26} fill="transparent" className="cursor-pointer" />

                {(isSelected || isConnectSource) && (
                  <circle
                    r={18}
                    fill="none"
                    stroke={isConnectSource ? activeColor : '#38BDF8'}
                    strokeWidth={2.5}
                    strokeDasharray={isConnectSource ? '4 3' : undefined}
                    pointerEvents="none"
                  />
                )}

                {/* Virtual Node vs Passenger Station Display */}
                {st.isVirtual ? (
                  <g pointerEvents="none">
                    {/* Black circle with cross (X / 叉叉) in center */}
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

                    {/* Faint indicator badge when selected */}
                    {isSelected && (
                      <g transform="translate(0, -15)">
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
                          className={`font-sans text-[9px] font-bold select-none ${
                            isLight ? 'fill-sky-700' : 'fill-sky-300'
                          }`}
                        >
                          虛擬節點
                        </text>
                      </g>
                    )}
                  </g>
                ) : st.type === 'interchange' ? (
                  <g pointerEvents="none">
                    <circle r={12} fill="#ffffff" stroke="#0f172a" strokeWidth={3.5} />
                    {distinctColors.length >= 2 ? (
                      <g>
                        <circle cx={-3.5} cy={0} r={3} fill={distinctColors[0]} />
                        <circle cx={3.5} cy={0} r={3} fill={distinctColors[1]} />
                      </g>
                    ) : (
                      <circle r={5} fill={primaryColor} />
                    )}
                  </g>
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

                {/* Passenger Station Labels (Only for non-virtual stations) - 支援 8 方位與直接拖曳自由站名 */}
                {!st.isVirtual && (
                  <g
                    transform={`translate(${labelDx}, ${labelDy})`}
                    className="cursor-grab active:cursor-grabbing select-none"
                    onPointerDown={(e) => handleLabelPointerDown(e, st)}
                  >
                    {/* Visual dashed tether leader line connecting station center to custom / dragged label */}
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

                    {/* Subtle pill highlight when dragging or when selected in custom mode */}
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
                      />
                    )}

                    {/* Generous hit box for effortless clicking & dragging of station name label */}
                    <rect
                      x={textAnchor === 'middle' ? -48 : textAnchor === 'end' ? -96 : -8}
                      y={-15}
                      width={96}
                      height={22}
                      fill="transparent"
                      className="cursor-grab active:cursor-grabbing"
                    />

                    {/* Stroke halo outline for clean readability across metro lines */}
                    <text
                      textAnchor={textAnchor}
                      className={`font-sans font-bold text-xs select-none stroke-[3.5px] paint-order-stroke pointer-events-none ${
                        isLight
                          ? 'fill-white stroke-white'
                          : 'fill-slate-950 stroke-slate-950'
                      }`}
                      strokeLinejoin="round"
                    >
                      {st.name}{' '}
                      {st.code && (
                        <tspan className={`font-mono text-[10px] ${isLight ? 'fill-white' : 'fill-slate-400'}`}>
                          ({st.code})
                        </tspan>
                      )}
                    </text>

                    {/* Foreground station name text */}
                    <text
                      textAnchor={textAnchor}
                      className={`font-sans font-semibold text-xs select-none pointer-events-none ${
                        isLight ? 'fill-slate-900' : 'fill-slate-100'
                      }`}
                    >
                      {st.name}{' '}
                      {st.code && (
                        <tspan className={`font-mono text-[10px] ${isLight ? 'fill-slate-500' : 'fill-slate-300'}`}>
                          ({st.code})
                        </tspan>
                      )}
                    </text>

                    {/* Live Dragging Offset Tooltip HUD Badge */}
                    {draggingLabelStationId === st.id && (
                      <g transform={`translate(${textAnchor === 'middle' ? 0 : textAnchor === 'end' ? -35 : 35}, -20)`} pointerEvents="none">
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
                          className="font-mono text-[9px] fill-white font-bold select-none"
                        >
                          Δ{labelDx}, {labelDy}
                        </text>
                      </g>
                    )}
                  </g>
                )}
              </g>
            );
          })}

        </g>
      </svg>
    </div>
  );
};
