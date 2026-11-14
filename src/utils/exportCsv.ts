/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Station, Connection } from '../types/metro';

export type CsvExportScope = 'all' | 'stations' | 'connections';

export interface CsvBuildResult {
  headers: string[];
  rows: string[][];
  csvText: string;
  stationCount: number;
  connectionCount: number;
}

const escapeCsvField = (value: string | number | boolean | undefined | null): string => {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsvLine = (fields: Array<string | number | boolean | undefined | null>): string =>
  fields.map(escapeCsvField).join(',');

const formatWaypoints = (conn: Connection): string => {
  if (!conn.waypoints || conn.waypoints.length === 0) return '';
  return conn.waypoints.map((pt) => `${pt.x}:${pt.y}`).join(';');
};

const computeConnectionLength = (
  conn: Connection,
  stationMap: Map<string, Station>
): number => {
  const from = stationMap.get(conn.fromStationId);
  const to = stationMap.get(conn.toStationId);
  if (!from || !to) return 0;

  if (conn.waypoints && conn.waypoints.length > 0) {
    const pts = [{ x: from.x, y: from.y }, ...conn.waypoints, { x: to.x, y: to.y }];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    }
    return Math.round(total * 100) / 100;
  }

  return Math.round(Math.hypot(to.x - from.x, to.y - from.y) * 100) / 100;
};

export function buildMetroNetworkCsv(
  stations: Station[],
  connections: Connection[],
  csvScope: CsvExportScope = 'all'
): CsvBuildResult {
  const stationMap = new Map<string, Station>(stations.map((s) => [s.id, s]));

  // Precompute distinct line colors connected to each station for Excel/GIS stats
  const stationColorsMap = new Map<string, Set<string>>();
  const stationConnCountMap = new Map<string, number>();

  for (const conn of connections) {
    stationConnCountMap.set(conn.fromStationId, (stationConnCountMap.get(conn.fromStationId) ?? 0) + 1);
    stationConnCountMap.set(conn.toStationId, (stationConnCountMap.get(conn.toStationId) ?? 0) + 1);

    const color = (conn.color || '').toUpperCase();
    if (color) {
      if (!stationColorsMap.has(conn.fromStationId)) {
        stationColorsMap.set(conn.fromStationId, new Set());
      }
      if (!stationColorsMap.has(conn.toStationId)) {
        stationColorsMap.set(conn.toStationId, new Set());
      }
      stationColorsMap.get(conn.fromStationId)!.add(color);
      stationColorsMap.get(conn.toStationId)!.add(color);
    }
  }

  let headers: string[] = [];
  let rows: string[][] = [];

  if (csvScope === 'stations') {
    headers = [
      'id',
      'name',
      'code',
      'type',
      'is_virtual',
      'x',
      'y',
      'degree',
      'line_colors',
      'interchange_style',
      'interchange_lines_count',
      'label_position',
      'z_index',
      'scale',
      'scale_x',
      'scale_y',
      'rotation',
      'opacity',
    ];

    rows = stations.map((st) => {
      const colors = Array.from(stationColorsMap.get(st.id) ?? []).join(';');
      const degree = stationConnCountMap.get(st.id) ?? 0;
      return [
        st.id,
        st.isVirtual ? `虛擬節點 (${st.x}, ${st.y})` : st.name,
        st.code ?? '',
        st.isVirtual ? 'virtual' : st.type,
        st.isVirtual ? 'true' : 'false',
        st.x,
        st.y,
        degree,
        colors,
        st.interchangeStyle ?? '',
        st.interchangeLinesCount ?? '',
        st.labelPosition ?? 'top',
        st.zIndex ?? 0,
        st.scale ?? 1,
        st.scaleX ?? 1,
        st.scaleY ?? 1,
        st.rotation ?? 0,
        st.opacity ?? 1,
      ].map((v) => String(v));
    });
  } else if (csvScope === 'connections') {
    headers = [
      'id',
      'from_station_id',
      'from_station_name',
      'from_x',
      'from_y',
      'to_station_id',
      'to_station_name',
      'to_x',
      'to_y',
      'segment_length',
      'color',
      'route_type',
      'offset',
      'is_flipped',
      'angle_a',
      'angle_b',
      'stroke_width',
      'stroke_style',
      'corner_radius',
      'line_cap',
      'z_index',
      'opacity',
      'waypoints',
    ];

    rows = connections.map((conn) => {
      const from = stationMap.get(conn.fromStationId);
      const to = stationMap.get(conn.toStationId);
      const fromName = from ? (from.isVirtual ? `虛擬節點 (${from.x}, ${from.y})` : from.name) : '';
      const toName = to ? (to.isVirtual ? `虛擬節點 (${to.x}, ${to.y})` : to.name) : '';
      return [
        conn.id,
        conn.fromStationId,
        fromName,
        from?.x ?? '',
        from?.y ?? '',
        conn.toStationId,
        toName,
        to?.x ?? '',
        to?.y ?? '',
        computeConnectionLength(conn, stationMap),
        (conn.color || '').toUpperCase(),
        conn.routeType ?? '135_bend',
        conn.offset ?? 0,
        conn.isFlipped ? 'true' : 'false',
        conn.angleA ?? '',
        conn.angleB ?? '',
        conn.strokeWidth ?? 6,
        conn.strokeStyle ?? 'solid',
        conn.cornerRadius ?? 14,
        conn.lineCap ?? 'round',
        conn.zIndex ?? 0,
        conn.opacity ?? 1,
        formatWaypoints(conn),
      ].map((v) => String(v));
    });
  } else {
    headers = [
      'record_type',
      'id',
      'name',
      'code',
      'station_type',
      'is_virtual',
      'x',
      'y',
      'degree',
      'from_station_id',
      'from_station_name',
      'from_x',
      'from_y',
      'to_station_id',
      'to_station_name',
      'to_x',
      'to_y',
      'segment_length',
      'color',
      'route_type',
      'offset',
      'z_index',
      'stroke_width',
      'stroke_style',
      'corner_radius',
      'scale',
      'rotation',
      'opacity',
      'waypoints',
    ];

    const stationRows = stations.map((st) => {
      const colors = Array.from(stationColorsMap.get(st.id) ?? []).join(';');
      const degree = stationConnCountMap.get(st.id) ?? 0;
      return [
        'station',
        st.id,
        st.isVirtual ? `虛擬節點 (${st.x}, ${st.y})` : st.name,
        st.code ?? '',
        st.isVirtual ? 'virtual' : st.type,
        st.isVirtual ? 'true' : 'false',
        st.x,
        st.y,
        degree,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        colors,
        '',
        '',
        st.zIndex ?? 0,
        '',
        '',
        '',
        st.scale ?? 1,
        st.rotation ?? 0,
        st.opacity ?? 1,
        '',
      ].map((v) => String(v));
    });

    const connRows = connections.map((conn) => {
      const from = stationMap.get(conn.fromStationId);
      const to = stationMap.get(conn.toStationId);
      const fromName = from ? (from.isVirtual ? `虛擬節點 (${from.x}, ${from.y})` : from.name) : '';
      const toName = to ? (to.isVirtual ? `虛擬節點 (${to.x}, ${to.y})` : to.name) : '';
      return [
        'connection',
        conn.id,
        `${fromName || conn.fromStationId} -> ${toName || conn.toStationId}`,
        '',
        '',
        '',
        '',
        '',
        '',
        conn.fromStationId,
        fromName,
        from?.x ?? '',
        from?.y ?? '',
        conn.toStationId,
        toName,
        to?.x ?? '',
        to?.y ?? '',
        computeConnectionLength(conn, stationMap),
        (conn.color || '').toUpperCase(),
        conn.routeType ?? '135_bend',
        conn.offset ?? 0,
        conn.zIndex ?? 0,
        conn.strokeWidth ?? 6,
        conn.strokeStyle ?? 'solid',
        conn.cornerRadius ?? 14,
        '',
        '',
        conn.opacity ?? 1,
        formatWaypoints(conn),
      ].map((v) => String(v));
    });

    rows = [...stationRows, ...connRows];
  }

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens Traditional Chinese characters without encoding issues
  const csvBody = [toCsvLine(headers), ...rows.map((r) => toCsvLine(r))].join('\r\n');
  const csvText = `\uFEFF${csvBody}`;

  return {
    headers,
    rows,
    csvText,
    stationCount: stations.length,
    connectionCount: connections.length,
  };
}

export function triggerCsvDownload(csvText: string, filename: string): void {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
