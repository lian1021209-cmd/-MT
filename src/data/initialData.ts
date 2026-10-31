import { MetroLine, Station, Connection } from '../types/metro';

export const INITIAL_RECENT_COLORS: string[] = [];

export const DEFAULT_LINES: MetroLine[] = [
  { id: 'line-r', name: '淡水信義線 (紅線)', code: 'R', color: '#E11D48', width: 6 },
  { id: 'line-bl', name: '板南線 (藍線)', code: 'BL', color: '#2563EB', width: 6 },
  { id: 'line-g', name: '松山新店線 (綠線)', code: 'G', color: '#16A34A', width: 6 },
  { id: 'line-o', name: '中和新蘆線 (橘線)', code: 'O', color: '#EA580C', width: 6 },
  { id: 'line-br', name: '文湖線 (棕線)', code: 'BR', color: '#854D0E', width: 6 },
  { id: 'line-y', name: '環狀線 (黃線)', code: 'Y', color: '#CA8A04', width: 6 },
];

export const DEMO_STATIONS: Station[] = [
  { id: 'st-1', name: '台北車站', code: 'R10', x: 400, y: 300, type: 'interchange', labelPosition: 'top' },
  { id: 'st-2', name: '中山', code: 'R11', x: 400, y: 220, type: 'interchange', labelPosition: 'right' },
  { id: 'st-3', name: '雙連', code: 'R12', x: 400, y: 140, type: 'regular', labelPosition: 'right' },
  { id: 'st-4', name: '善導寺', code: 'BL13', x: 500, y: 300, type: 'regular', labelPosition: 'bottom' },
  { id: 'st-5', name: '忠孝新生', code: 'BL14', x: 600, y: 300, type: 'interchange', labelPosition: 'bottom' },
  { id: 'st-6', name: '西門', code: 'BL11', x: 300, y: 300, type: 'interchange', labelPosition: 'bottom' },
  { id: 'st-7', name: '北門', code: 'G13', x: 300, y: 220, type: 'regular', labelPosition: 'left' },
];

export const DEMO_CONNECTIONS: Connection[] = [
  { id: 'conn-1', fromStationId: 'st-1', toStationId: 'st-2', color: '#E11D48', routeType: '135_bend', lineId: 'line-r' },
  { id: 'conn-2', fromStationId: 'st-2', toStationId: 'st-3', color: '#E11D48', routeType: '135_bend', lineId: 'line-r' },
  { id: 'conn-3', fromStationId: 'st-6', toStationId: 'st-1', color: '#2563EB', routeType: '135_bend', lineId: 'line-bl' },
  { id: 'conn-4', fromStationId: 'st-1', toStationId: 'st-4', color: '#2563EB', routeType: '135_bend', lineId: 'line-bl' },
  { id: 'conn-5', fromStationId: 'st-4', toStationId: 'st-5', color: '#2563EB', routeType: '135_bend', lineId: 'line-bl' },
  { id: 'conn-6', fromStationId: 'st-6', toStationId: 'st-7', color: '#16A34A', routeType: '135_bend', lineId: 'line-g' },
  { id: 'conn-7', fromStationId: 'st-7', toStationId: 'st-2', color: '#16A34A', routeType: '135_bend', lineId: 'line-g' },
];
