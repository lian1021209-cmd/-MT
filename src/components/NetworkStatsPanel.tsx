import React, { useState, useMemo } from 'react';
import {
  Station,
  MetroLine,
  Connection,
  EffectiveTheme,
  Point,
} from '../types/metro';
import {
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';

export interface NetworkStatsPanelProps {
  stations: Station[];
  connections: Connection[];
  lines: MetroLine[];
  theme: EffectiveTheme;
  onSelectStation?: (stationId: string) => void;
}

export interface RouteColorStat {
  color: string;
  name: string;
  count: number;
  length: number;
  lengthPercentage: number;
  countPercentage: number;
}

export const calculateConnectionLength = (
  conn: Connection,
  stationsMap: Map<string, Station>
): number => {
  const fromSt = stationsMap.get(conn.fromStationId);
  const toSt = stationsMap.get(conn.toStationId);
  if (!fromSt || !toSt) return 0;

  if (conn.waypoints && conn.waypoints.length > 0) {
    let total = 0;
    let prev: Point = { x: fromSt.x, y: fromSt.y };
    for (const wp of conn.waypoints) {
      total += Math.hypot(wp.x - prev.x, wp.y - prev.y);
      prev = wp;
    }
    total += Math.hypot(toSt.x - prev.x, toSt.y - prev.y);
    return Math.round(total);
  }

  const dx = toSt.x - fromSt.x;
  const dy = toSt.y - fromSt.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  switch (conn.routeType) {
    case 'straight':
      return Math.round(Math.hypot(dx, dy));
    case '90_ortho':
      return Math.round(absDx + absDy);
    case '135_bend':
    case '90_rotated': {
      const minD = Math.min(absDx, absDy);
      const diffD = Math.abs(absDx - absDy);
      return Math.round(minD * Math.SQRT2 + diffD);
    }
    case 'any_angle': {
      const straight = Math.hypot(dx, dy);
      return Math.round(straight * 1.08);
    }
    default:
      return Math.round(Math.hypot(dx, dy));
  }
};

const KNOWN_COLOR_NAMES: Record<string, string> = {
  '#E11D48': '淡水信義線',
  '#2563EB': '板南線',
  '#10B981': '松山新店線',
  '#F59E0B': '中和新蘆線',
  '#C084FC': '文湖線',
  '#EAB308': '環狀線',
  '#8B5CF6': '桃園捷運',
  '#06B6D4': '淡海輕軌',
  '#6366F1': '安坑輕軌',
  '#EC4899': '萬大中和線',
};

export interface CriticalTransferHub {
  station: Station;
  connectionCount: number;
  lineCount: number;
  distinctColors: string[];
  hasOverThreeLines: boolean;
  isHighestDegree: boolean;
}

export const NetworkStatsPanel: React.FC<NetworkStatsPanelProps> = ({
  stations,
  connections,
  lines,
  theme,
  onSelectStation,
}) => {
  const isLight = theme === 'light';
  const [metricMode, setMetricMode] = useState<'length' | 'count'>('length');
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  const stationStats = useMemo(() => {
    const total = stations.length;
    const regular = stations.filter((s) => !s.isVirtual && s.type !== 'interchange').length;
    const interchange = stations.filter((s) => !s.isVirtual && s.type === 'interchange').length;
    const virtual = stations.filter((s) => s.isVirtual).length;

    const connectedIds = new Set<string>();
    connections.forEach((c) => {
      connectedIds.add(c.fromStationId);
      connectedIds.add(c.toStationId);
    });
    const isolated = stations.filter((s) => !connectedIds.has(s.id)).length;

    return {
      total,
      regular,
      interchange,
      virtual,
      isolated,
      operational: total - virtual,
    };
  }, [stations, connections]);

  const { totalLength, colorStats, longestSegment, avgSegmentLength } = useMemo(() => {
    const stationsMap = new Map<string, Station>(stations.map((s) => [s.id, s]));
    const lengthsMap = new Map<string, number>();

    let total = 0;
    let maxLen = -Infinity;

    connections.forEach((c) => {
      const len = calculateConnectionLength(c, stationsMap);
      lengthsMap.set(c.id, len);
      total += len;
      if (len > maxLen) maxLen = len;
    });

    if (connections.length === 0) {
      maxLen = 0;
    }

    const colorGroups = new Map<string, { count: number; length: number }>();
    connections.forEach((c) => {
      const col = (c.color || '#E11D48').toUpperCase();
      const current = colorGroups.get(col) || { count: 0, length: 0 };
      const len = lengthsMap.get(c.id) || 0;
      colorGroups.set(col, {
        count: current.count + 1,
        length: current.length + len,
      });
    });

    const stats: RouteColorStat[] = Array.from(colorGroups.entries()).map(([col, data]) => {
      const foundLine = lines.find((l) => l.color.toUpperCase() === col);
      const name = foundLine?.name || KNOWN_COLOR_NAMES[col] || col;
      const lengthPercentage = total > 0 ? (data.length / total) * 100 : 0;
      const countPercentage = connections.length > 0 ? (data.count / connections.length) * 100 : 0;

      return {
        color: col,
        name,
        count: data.count,
        length: data.length,
        lengthPercentage,
        countPercentage,
      };
    });

    stats.sort((a, b) => b.length - a.length);

    return {
      totalLength: total,
      colorStats: stats,
      longestSegment: maxLen > 0 ? maxLen : 0,
      avgSegmentLength: connections.length > 0 ? Math.round(total / connections.length) : 0,
    };
  }, [stations, connections, lines]);

  // 建議關鍵轉乘站分析指標（連接超過 3 條線路 或 擁有最高節點連接數）
  const { criticalTransferHubs, maxNodeDegree, overThreeLinesCount } = useMemo(() => {
    if (stations.length === 0 || connections.length === 0) {
      return {
        criticalTransferHubs: [] as CriticalTransferHub[],
        maxNodeDegree: 0,
        overThreeLinesCount: 0,
      };
    }

    const perStation = stations.map((st) => {
      const incident = connections.filter(
        (c) => c.fromStationId === st.id || c.toStationId === st.id
      );
      const distinctColors = Array.from(
        new Set(incident.map((c) => (c.color || '#E11D48').toUpperCase()))
      );
      return {
        station: st,
        connectionCount: incident.length,
        lineCount: distinctColors.length,
        distinctColors,
      };
    });

    const maxDegree = Math.max(0, ...perStation.map((item) => item.connectionCount));
    const over3Count = perStation.filter((item) => item.lineCount > 3).length;

    const hubs: CriticalTransferHub[] = perStation
      .filter(
        (item) =>
          item.connectionCount > 0 &&
          (item.lineCount > 3 || (maxDegree > 0 && item.connectionCount === maxDegree))
      )
      .map((item) => ({
        ...item,
        hasOverThreeLines: item.lineCount > 3,
        isHighestDegree: maxDegree > 0 && item.connectionCount === maxDegree,
      }))
      .sort((a, b) => {
        if (a.station.isVirtual !== b.station.isVirtual) {
          return a.station.isVirtual ? 1 : -1;
        }
        if (b.lineCount !== a.lineCount) {
          return b.lineCount - a.lineCount;
        }
        return b.connectionCount - a.connectionCount;
      });

    return {
      criticalTransferHubs: hubs,
      maxNodeDegree: maxDegree,
      overThreeLinesCount: over3Count,
    };
  }, [stations, connections]);

  const donutSlices = useMemo(() => {
    if (colorStats.length === 0) return [];

    const cx = 90;
    const cy = 90;
    const radius = 68;
    const innerRadius = 50;

    let cumulativeAngle = -90;

    return colorStats.map((item) => {
      const percentage = metricMode === 'length' ? item.lengthPercentage : item.countPercentage;
      const angleSpan = Math.max((percentage / 100) * 360, 1.5);

      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angleSpan;
      cumulativeAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const ix1 = cx + innerRadius * Math.cos(startRad);
      const iy1 = cy + innerRadius * Math.sin(startRad);
      const ix2 = cx + innerRadius * Math.cos(endRad);
      const iy2 = cy + innerRadius * Math.sin(endRad);

      const largeArcFlag = angleSpan > 180 ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}`,
        'Z',
      ].join(' ');

      return {
        ...item,
        path: d,
        percentage,
      };
    });
  }, [colorStats, metricMode]);

  const activeHoveredStat = useMemo(() => {
    if (!hoveredColor) return null;
    return colorStats.find((s) => s.color === hoveredColor) || null;
  }, [hoveredColor, colorStats]);

  const borderCol = isLight ? 'border-zinc-200' : 'border-zinc-800';
  const divideCol = isLight ? 'divide-zinc-200' : 'divide-zinc-800';
  const textMuted = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const textHeading = isLight ? 'text-zinc-900' : 'text-zinc-100';

  return (
    <div className="divide-y select-none font-sans text-xs divide-zinc-200 dark:divide-zinc-800">
      {/* 1. Header & Core Metrics */}
      <div className="p-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className={`text-sm font-semibold tracking-tight ${textHeading}`}>
            路網統計
          </h2>
          <span className={`text-[11px] font-mono tabular-nums ${textMuted}`}>
            {colorStats.length} 條路線
          </span>
        </div>

        {/* 3-Column KPI Strip separated by hairlines */}
        <div className={`grid grid-cols-3 divide-x border rounded-lg ${borderCol} ${divideCol}`}>
          <div className="p-2.5">
            <div className={`text-[11px] ${textMuted}`}>站點</div>
            <div className={`text-lg font-semibold font-mono tabular-nums mt-0.5 ${textHeading}`}>
              {stationStats.total}
            </div>
            <div className={`text-[10px] font-mono tabular-nums mt-0.5 ${textMuted}`}>
              營運 {stationStats.operational}
            </div>
          </div>

          <div className="p-2.5">
            <div className={`text-[11px] ${textMuted}`}>連線</div>
            <div className={`text-lg font-semibold font-mono tabular-nums mt-0.5 ${textHeading}`}>
              {connections.length}
            </div>
            <div className={`text-[10px] font-mono tabular-nums mt-0.5 ${textMuted}`}>
              換乘 {stationStats.interchange}
            </div>
          </div>

          <div className="p-2.5">
            <div className={`text-[11px] ${textMuted}`}>總里程</div>
            <div className={`text-lg font-semibold font-mono tabular-nums mt-0.5 ${textHeading}`}>
              {totalLength >= 1000 ? `${(totalLength / 1000).toFixed(1)}k` : totalLength}
            </div>
            <div className={`text-[10px] font-mono tabular-nums mt-0.5 ${textMuted}`}>
              ~{(totalLength / 100).toFixed(1)} km
            </div>
          </div>
        </div>

        {/* Station Distribution Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className={textMuted}>車站組成</span>
            <span className={`font-mono tabular-nums ${textMuted}`}>
              換乘率 {stationStats.operational > 0 ? `${Math.round((stationStats.interchange / stationStats.operational) * 100)}%` : '0%'}
            </span>
          </div>

          <div className={`w-full h-1.5 rounded-full overflow-hidden flex ${isLight ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
            {stationStats.total > 0 && (
              <>
                <div
                  style={{ width: `${(stationStats.regular / stationStats.total) * 100}%` }}
                  className="bg-zinc-900 dark:bg-zinc-200 transition-all"
                  title={`普通站: ${stationStats.regular}`}
                />
                <div
                  style={{ width: `${(stationStats.interchange / stationStats.total) * 100}%` }}
                  className="bg-indigo-500 transition-all"
                  title={`換乘站: ${stationStats.interchange}`}
                />
                <div
                  style={{ width: `${(stationStats.virtual / stationStats.total) * 100}%` }}
                  className="bg-zinc-400 dark:bg-zinc-600 transition-all"
                  title={`虛擬節點: ${stationStats.virtual}`}
                />
              </>
            )}
          </div>

          <div className={`flex items-center gap-3 text-[11px] tabular-nums ${textMuted}`}>
            <span>普通 {stationStats.regular}</span>
            <span aria-hidden="true">·</span>
            <span>換乘 {stationStats.interchange}</span>
            <span aria-hidden="true">·</span>
            <span>轉折 {stationStats.virtual}</span>
          </div>

          {stationStats.isolated > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>有 {stationStats.isolated} 個車站尚未建立任何連線</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Critical Transfer Hubs */}
      <div className="p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className={`text-xs font-semibold ${textHeading}`}>建議關鍵轉乘站</h3>
          <span className={`text-[11px] font-mono tabular-nums ${textMuted}`}>
            {criticalTransferHubs.length} 站入選
          </span>
        </div>

        {/* Summary Strip */}
        <div className={`grid grid-cols-2 divide-x border rounded-lg ${borderCol} ${divideCol}`}>
          <div className="px-2.5 py-2 flex items-center justify-between">
            <span className={`text-[11px] ${textMuted}`}>最高連接數</span>
            <span className={`font-mono font-semibold tabular-nums ${textHeading}`}>
              {maxNodeDegree} 段
            </span>
          </div>
          <div className="px-2.5 py-2 flex items-center justify-between">
            <span className={`text-[11px] ${textMuted}`}>&gt;3 線交會</span>
            <span className={`font-mono font-semibold tabular-nums ${textHeading}`}>
              {overThreeLinesCount} 站
            </span>
          </div>
        </div>

        {criticalTransferHubs.length === 0 ? (
          <p className={`py-4 text-center text-[11px] ${textMuted}`}>
            建立車站連線後將自動識別關鍵轉乘站。
          </p>
        ) : (
          <div className={`divide-y border rounded-lg max-h-56 overflow-y-auto ${borderCol} ${divideCol}`}>
            {criticalTransferHubs.map((hub) => {
              const { station, connectionCount, lineCount, distinctColors, hasOverThreeLines, isHighestDegree } = hub;
              const isMarkedInterchange =
                station.type === 'interchange' || station.type === 'interchange_3line';

              const reasons: string[] = [];
              if (hasOverThreeLines) reasons.push(`超過 3 條線路 (${lineCount})`);
              if (isHighestDegree) reasons.push(`最高連接數 (${connectionCount})`);
              if (!station.isVirtual && !isMarkedInterchange && lineCount >= 2) {
                reasons.push('建議設為換乘站');
              }

              return (
                <button
                  key={`critical-hub-${station.id}`}
                  type="button"
                  onClick={() => onSelectStation?.(station.id)}
                  className={`w-full px-3 py-2.5 text-left transition-colors cursor-pointer group ${
                    isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900'
                  }`}
                  title="點擊選取此站點"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-xs font-medium truncate ${textHeading}`}>
                        {station.isVirtual ? `虛擬節點 (${station.x}, ${station.y})` : station.name}
                      </span>
                      {station.code && !station.isVirtual && (
                        <span className={`text-[10px] font-mono ${textMuted}`}>
                          {station.code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[11px] font-mono tabular-nums ${textMuted}`}>
                        {lineCount} 線 · {connectionCount} 段
                      </span>
                      {onSelectStation && (
                        <ArrowUpRight className={`w-3.5 h-3.5 ${textMuted} group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors`} />
                      )}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className={`text-[10px] truncate ${textMuted}`}>
                      {reasons.join(' · ')}
                    </div>

                    <div className="flex -space-x-1 items-center shrink-0">
                      {distinctColors.slice(0, 6).map((col) => (
                        <span
                          key={col}
                          className="w-2.5 h-2.5 rounded-full border border-white dark:border-zinc-900"
                          style={{ backgroundColor: col }}
                          title={col}
                        />
                      ))}
                      {distinctColors.length > 6 && (
                        <span className={`text-[9px] font-mono pl-1.5 ${textMuted}`}>
                          +{distinctColors.length - 6}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <p className={`text-[10px] leading-relaxed ${textMuted}`}>
          自動列出連接超過 3 條色彩線路，或擁有全網最高節點連接數之樞紐站點。
        </p>
      </div>

      {/* 3. Line Color Share & Donut Chart */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={`text-xs font-semibold ${textHeading}`}>各色路線佔比</h3>

          <div
            className={`flex items-center p-0.5 rounded-md border text-[11px] ${
              isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setMetricMode('length')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                metricMode === 'length'
                  ? isLight
                    ? 'bg-white text-zinc-900 font-medium shadow-2xs'
                    : 'bg-zinc-800 text-zinc-100 font-medium'
                  : textMuted
              }`}
            >
              依長度
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('count')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                metricMode === 'count'
                  ? isLight
                    ? 'bg-white text-zinc-900 font-medium shadow-2xs'
                    : 'bg-zinc-800 text-zinc-100 font-medium'
                  : textMuted
              }`}
            >
              依段數
            </button>
          </div>
        </div>

        {colorStats.length === 0 ? (
          <p className={`py-6 text-center text-[11px] ${textMuted}`}>
            尚未建立路線連線。
          </p>
        ) : (
          <>
            {/* Minimalist Thin-Ring Donut Chart */}
            <div className="flex items-center justify-center py-1">
              <svg viewBox="0 0 180 180" className="w-36 h-36 select-none">
                {donutSlices.map((slice) => {
                  const isHovered = hoveredColor === slice.color;
                  return (
                    <path
                      key={slice.color}
                      d={slice.path}
                      fill={slice.color}
                      stroke={isLight ? '#FFFFFF' : '#111113'}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      className="transition-all duration-150 cursor-pointer"
                      style={{
                        transformOrigin: '90px 90px',
                        transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                        opacity: hoveredColor && !isHovered ? 0.45 : 1,
                      }}
                      onMouseEnter={() => setHoveredColor(slice.color)}
                      onMouseLeave={() => setHoveredColor(null)}
                    />
                  );
                })}

                <g className="pointer-events-none">
                  <circle cx="90" cy="90" r="46" fill={isLight ? '#FFFFFF' : '#111113'} />
                  {activeHoveredStat ? (
                    <>
                      <text
                        x="90"
                        y="85"
                        textAnchor="middle"
                        fill={isLight ? '#18181B' : '#FAFAFA'}
                        fontSize="14"
                        fontWeight="600"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {metricMode === 'length'
                          ? `${activeHoveredStat.lengthPercentage.toFixed(1)}%`
                          : `${activeHoveredStat.countPercentage.toFixed(1)}%`}
                      </text>
                      <text
                        x="90"
                        y="102"
                        textAnchor="middle"
                        fill={isLight ? '#71717A' : '#A1A1AA'}
                        fontSize="9.5"
                      >
                        {activeHoveredStat.name}
                      </text>
                    </>
                  ) : (
                    <>
                      <text
                        x="90"
                        y="85"
                        textAnchor="middle"
                        fill={isLight ? '#18181B' : '#FAFAFA'}
                        fontSize="13"
                        fontWeight="600"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {metricMode === 'length'
                          ? `${(totalLength / 100).toFixed(1)} km`
                          : `${connections.length} 段`}
                      </text>
                      <text
                        x="90"
                        y="102"
                        textAnchor="middle"
                        fill={isLight ? '#71717A' : '#A1A1AA'}
                        fontSize="9.5"
                      >
                        {metricMode === 'length' ? '總估算里程' : '總連線區段'}
                      </text>
                    </>
                  )}
                </g>
              </svg>
            </div>

            {/* Clean Color Breakdown List */}
            <div className={`divide-y border rounded-lg max-h-56 overflow-y-auto ${borderCol} ${divideCol}`}>
              {colorStats.map((item) => {
                const isHovered = hoveredColor === item.color;
                const percentage = metricMode === 'length' ? item.lengthPercentage : item.countPercentage;

                return (
                  <div
                    key={item.color}
                    onMouseEnter={() => setHoveredColor(item.color)}
                    onMouseLeave={() => setHoveredColor(null)}
                    className={`px-3 py-2 transition-colors cursor-pointer ${
                      isHovered ? (isLight ? 'bg-zinc-50' : 'bg-zinc-900') : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className={`text-xs font-medium truncate ${textHeading}`}>
                          {item.name}
                        </span>
                      </div>
                      <span className={`text-xs font-mono font-semibold tabular-nums shrink-0 ${textHeading}`}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className={`flex items-center justify-between text-[10px] font-mono tabular-nums mt-1 ${textMuted}`}>
                      <span>{item.count} 段</span>
                      <span>
                        {item.length} · ~{(item.length / 100).toFixed(1)} km
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 4. Segment Distance Metrics */}
      <div className="p-4 space-y-2.5">
        <h3 className={`text-xs font-semibold ${textHeading}`}>區間站距</h3>
        <div className={`grid grid-cols-2 divide-x border rounded-lg ${borderCol} ${divideCol}`}>
          <div className="p-2.5">
            <div className={`text-[11px] ${textMuted}`}>平均站距</div>
            <div className={`text-sm font-semibold font-mono tabular-nums mt-0.5 ${textHeading}`}>
              {avgSegmentLength}
            </div>
            <div className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
              ~{(avgSegmentLength / 100).toFixed(2)} km
            </div>
          </div>
          <div className="p-2.5">
            <div className={`text-[11px] ${textMuted}`}>最長區間</div>
            <div className={`text-sm font-semibold font-mono tabular-nums mt-0.5 ${textHeading}`}>
              {longestSegment}
            </div>
            <div className={`text-[10px] font-mono tabular-nums ${textMuted}`}>
              ~{(longestSegment / 100).toFixed(2)} km
            </div>
          </div>
        </div>
        <p className={`text-[10px] ${textMuted}`}>
          依畫布幾何路徑計算（100 座標單位約合 1 公里）。
        </p>
      </div>
    </div>
  );
};
