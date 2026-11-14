export type StationType = 'regular' | 'interchange' | 'interchange_3line' | 'terminal';

export type InterchangeStyle = 'dots' | 'pie' | 'capsule';

export interface Point {
  x: number;
  y: number;
}

export type LabelPosition = 
  | 'top' 
  | 'top_right' 
  | 'right' 
  | 'bottom_right' 
  | 'bottom' 
  | 'bottom_left' 
  | 'left' 
  | 'top_left' 
  | 'custom'; // 自由站名 (可任意拖動)

export interface LabelPositionPreset {
  label: string;
  short: string;
  dx: number;
  dy: number;
  textAnchor: 'middle' | 'start' | 'end';
}

export const LABEL_POSITION_PRESETS: Record<Exclude<LabelPosition, 'custom'>, LabelPositionPreset> = {
  top_left: { label: '左上', short: '↖', dx: -15, dy: -15, textAnchor: 'end' },
  top: { label: '正上', short: '↑', dx: 0, dy: -18, textAnchor: 'middle' },
  top_right: { label: '右上', short: '↗', dx: 15, dy: -15, textAnchor: 'start' },
  left: { label: '正左', short: '←', dx: -18, dy: 4, textAnchor: 'end' },
  right: { label: '正右', short: '→', dx: 18, dy: 4, textAnchor: 'start' },
  bottom_left: { label: '左下', short: '↙', dx: -15, dy: 20, textAnchor: 'end' },
  bottom: { label: '正下', short: '↓', dx: 0, dy: 24, textAnchor: 'middle' },
  bottom_right: { label: '右下', short: '↘', dx: 15, dy: 20, textAnchor: 'start' },
};

export const MIN_Z_ORDER = -10;
export const MAX_Z_ORDER = 10;

export function clampZOrder(z: number): number {
  if (!Number.isFinite(z)) return 0;
  return Math.max(MIN_Z_ORDER, Math.min(MAX_Z_ORDER, Math.round(z)));
}

export function clampLineOffset(offset: number): number {
  if (!Number.isFinite(offset)) return 0;
  const rounded = Math.round(offset * 2) / 2; // 0.5 precision, unlimited range
  return rounded === 0 ? 0 : rounded;
}

export function normalizeSvgScale(val: number, min: number = 0.1): number {
  if (!Number.isFinite(val)) return 1;
  const rounded = Math.round(val * 100) / 100;
  return Math.max(min, rounded);
}

export function normalizeSvgAngle(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  const wrapped = ((Math.round(deg * 10) / 10) % 360 + 360) % 360;
  return wrapped === 360 ? 0 : wrapped;
}

export function normalizeStrokeWidth(val: number): number {
  if (!Number.isFinite(val)) return 6;
  return Math.max(0.5, Math.round(val * 2) / 2);
}

export function normalizeCornerRadius(val: number): number {
  if (!Number.isFinite(val)) return 14;
  return Math.max(0, Math.round(val * 2) / 2);
}

export function normalizeOpacity(val: number): number {
  if (!Number.isFinite(val)) return 1;
  return Math.max(0.05, Math.min(1, Math.round(val * 100) / 100));
}

export function normalizeFontSize(val: number): number {
  if (!Number.isFinite(val)) return 18;
  return Math.max(4, Math.round(val));
}

export type StationStyle = 'default' | 'beijing' | 'shanghai' | 'guangzhou';

export type StationVariant =
  | 'auto'
  | 'shanghai_basic'
  | 'shanghai_2020'
  | 'shanghai_interchange'
  | 'shanghai_suburban'
  | 'guangzhou_basic'
  | 'guangzhou_interchange'
  | 'guangzhou_interchange_2024'
  | 'beijing_basic'
  | 'beijing_interchange';

export interface GuangzhouBadgeItem {
  line: string;
  number: string;
  color?: string;
}

export type StrokeStyle =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'double'
  | 'beijing_cased'
  | 'beijing_rail'
  | 'shanghai_metro'
  | 'shanghai_maglev'
  | 'guangzhou_metro'
  | 'guangzhou_intercity';

export type LineCapStyle = 'round' | 'butt' | 'square';

export interface Station {
  id: string;
  name: string;
  code?: string;
  x: number;
  y: number;
  type: StationType;
  stationStyle?: StationStyle; // 站點城市樣式：'default' | 'beijing' | 'shanghai' | 'guangzhou'
  stationVariant?: StationVariant; // 指定精確地鐵公司站點圖示樣式
  stationColor?: string; // 站點 SVG 自訂顏色
  gzBadges?: GuangzhouBadgeItem[]; // 廣州站點內嵌可編輯路線與車站編號及顏色
  interchangeStyle?: InterchangeStyle; // 換乘站風格：'dots' (色點陣列) | 'pie' (輪盤扇形) | 'capsule' (連鎖膠囊)
  interchangeLinesCount?: number; // 自訂換乘路線數量 (無限制，留空則自動偵測交會線路數)
  labelPosition?: LabelPosition;
  labelOffset?: Point; // 自由站名拖動時的相對位移 (dx, dy)
  isVirtual?: boolean; // 虛擬節點：非站點，用於線路轉折、分岔與連線
  zIndex?: number; // SVG 重疊層級 (-10 ~ 10，預設 0，數值越大越在上層)
  scale?: number; // 階段三 SVG 自由變換：整體縮放倍率 (預設 1，無上限)
  scaleX?: number; // 階段三 SVG 自由變換：水平獨立拉伸倍率 (預設 1)
  scaleY?: number; // 階段三 SVG 自由變換：垂直獨立拉伸倍率 (預設 1)
  rotation?: number; // 階段三 SVG 自由變換：自由旋轉角度 (0 ~ 359°)
  labelScale?: number; // 階段三 SVG 自由變換：站名標籤字級縮放倍率 (預設 1)
  labelRotation?: number; // 階段三 SVG 自由變換：站名標籤旋轉角度 (0 ~ 359°)
  opacity?: number; // 階段三 SVG 自由變換：不透明度 (0.05 ~ 1，預設 1)
}

export interface MetroLine {
  id: string;
  name: string;
  code: string;
  color: string;
  width?: number;
}

export type RouteType = 
  | '135_bend'      // 135度折線段 (經典八向 45°/135° 倒角)
  | '90_ortho'      // 90垂直線段 (先水平後垂直 / 先垂直後水平)
  | '90_rotated'    // 90度旋轉垂直線段 (菱形旁 90° 角，45度斜向直角)
  | 'straight'      // 直線線段 (兩點筆直直連線)
  | 'any_angle'     // 任意角度線段 (任意角度折角線段)
  | 'free_curve';   // 自由繪製線段 (自繪軌跡，支援小節點拖曳調整)

export interface Connection {
  id: string;
  fromStationId: string;
  toStationId: string;
  color: string;
  routeType?: RouteType;
  waypoints?: Point[]; // Editable control nodes for freehand paths
  isFlipped?: boolean; // 內外翻轉：135度/90度/90旋轉/任意角度走線翻轉
  angleA?: number;     // 任意角度線段：線段 A 360° 旋轉角度 (0 ~ 359°)
  angleB?: number;     // 任意角度線段：線段 B 360° 旋轉角度 (0 ~ 359°)
  lineId?: string;
  zIndex?: number;     // SVG 重疊層級 (-10 ~ 10，預設 0，數值越大越在上層)
  offset?: number;     // 線段平行偏移量 (無限制，達成並線效果)
  strokeWidth?: number; // 階段三 SVG 自由變換：線條粗細 (預設 6，無上限)
  cornerRadius?: number; // 階段三 SVG 自由變換：轉角圓角半徑 (預設 14，無上限)
  strokeStyle?: StrokeStyle; // 階段三 SVG 自由變換：實線 / 虛線 / 點線 / 雙軌
  lineCap?: LineCapStyle; // 階段三 SVG 自由變換：端點樣式
  opacity?: number; // 階段三 SVG 自由變換：不透明度 (0.05 ~ 1，預設 1)
}

export interface CanvasImage {
  id: string;
  name: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  preserveAspectRatio?: boolean;
}

export interface CanvasText {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  textAnchor?: 'start' | 'middle' | 'end';
  letterSpacing?: number;
  hasHalo?: boolean;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
}

export type ToolMode = 'select' | 'marquee_select' | 'pan' | 'add_station' | 'add_virtual_node' | 'connect';

export type ThemeMode = 'dark' | 'light' | 'auto';
export type EffectiveTheme = 'dark' | 'light';


