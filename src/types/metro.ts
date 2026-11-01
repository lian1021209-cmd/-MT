export type StationType = 'regular' | 'interchange' | 'terminal';

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

export interface Station {
  id: string;
  name: string;
  code?: string;
  x: number;
  y: number;
  type: StationType;
  labelPosition?: LabelPosition;
  labelOffset?: Point; // 自由站名拖動時的相對位移 (dx, dy)
  isVirtual?: boolean; // 虛擬節點：非站點，用於線路轉折、分岔與連線
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
}

export type ToolMode = 'select' | 'marquee_select' | 'pan' | 'add_station' | 'add_virtual_node' | 'connect';

export type ThemeMode = 'dark' | 'light' | 'auto';
export type EffectiveTheme = 'dark' | 'light';

