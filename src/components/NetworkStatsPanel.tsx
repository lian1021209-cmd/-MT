import React, { useState, useMemo } from 'react';
import { 
  Station, 
  MetroLine, 
  Connection, 
  EffectiveTheme,
  Point
} from '../types/metro';
import { 
  BarChart3, 
  PieChart, 
  Ruler, 
  GitFork, 
  MapPin, 
  Compass, 
  Layers, 
  TrendingUp, 
  Activity, 
  Hash, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Percent,
  Info
} from 'lucide-react';

export interface NetworkStatsPanelProps {
  stations: Station[];
  connections: Connection[];
  lines: MetroLine[];
  theme: EffectiveTheme;
}

export interface RouteColorStat {
  color: string;
  name: string;
  count: number;
  length: number;
  lengthPercentage: number;
  countPercentage: number;
}

// 根據坐標與走向風格計算線段實際幾何距離 (px)
export const calculateConnectionLength = (
  conn: Connection,
  stationsMap: Map<string, Station>
): number => {
  const fromSt = stationsMap.get(conn.fromStationId);
  const toSt = stationsMap.get(conn.toStationId);
  if (!fromSt || !toSt) return 0;

  // 自繪軌跡或具備中間控制點之線段：計算沿著所有 waypoints 的折線累積歐氏幾何距離
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
      // 直線歐氏距離
      return Math.round(Math.hypot(dx, dy));

    case '90_ortho':
      // 90° 垂直曼哈頓折線距離
      return Math.round(absDx + absDy);

    case '135_bend':
    case '90_rotated': {
      // 45°/135° 標準倒角幾何走勢長度：斜角段 + 水平/垂直延伸段
      const minD = Math.min(absDx, absDy);
      const diffD = Math.abs(absDx - absDy);
      return Math.round(minD * Math.SQRT2 + diffD);
    }

    case 'any_angle': {
      // 任意角度轉折線長度
      const straight = Math.hypot(dx, dy);
      return Math.round(straight * 1.08);
    }

    default:
      return Math.round(Math.hypot(dx, dy));
  }
};

// 預設常見捷運色彩名稱對照表
const KNOWN_COLOR_NAMES: Record<string, string> = {
  '#E11D48': '淡水信義線 (紅線)',
  '#2563EB': '板南線 (藍線)',
  '#10B981': '松山新店線 (綠線)',
  '#F59E0B': '中和新蘆線 (橘線)',
  '#C084FC': '文湖線 (棕線)',
  '#EAB308': '環狀線 (黃線)',
  '#8B5CF6': '桃園捷運 (紫線)',
  '#06B6D4': '淡海輕軌 (水藍線)',
  '#6366F1': '安坑輕軌 (靛青線)',
  '#EC4899': '萬大中和線 (粉紅線)',
};

export const NetworkStatsPanel: React.FC<NetworkStatsPanelProps> = ({
  stations,
  connections,
  lines,
  theme,
}) => {
  const isLight = theme === 'light';
  const [metricMode, setMetricMode] = useState<'length' | 'count'>('length');
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  // 1. 車站統計數據
  const stationStats = useMemo(() => {
    const total = stations.length;
    const regular = stations.filter((s) => !s.isVirtual && s.type !== 'interchange').length;
    const interchange = stations.filter((s) => !s.isVirtual && s.type === 'interchange').length;
    const virtual = stations.filter((s) => s.isVirtual).length;

    // 孤立節點（尚未連線之站點）
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

  // 2. 路線連線與總長度統計
  const { totalLength, lengthsByConnId, colorStats, longestSegment, shortestSegment, avgSegmentLength } = useMemo(() => {
    const stationsMap = new Map<string, Station>(stations.map((s) => [s.id, s]));
    const lengthsMap = new Map<string, number>();

    let total = 0;
    let maxLen = -Infinity;
    let minLen = Infinity;

    connections.forEach((c) => {
      const len = calculateConnectionLength(c, stationsMap);
      lengthsMap.set(c.id, len);
      total += len;
      if (len > maxLen) maxLen = len;
      if (len < minLen) minLen = len;
    });

    if (connections.length === 0) {
      maxLen = 0;
      minLen = 0;
    }

    // 依顏色分組聚合
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

    // 整理成清單並計算佔比
    const stats: RouteColorStat[] = Array.from(colorGroups.entries()).map(([col, data]) => {
      // 尋找名稱
      const foundLine = lines.find((l) => l.color.toUpperCase() === col);
      const name = foundLine?.name || KNOWN_COLOR_NAMES[col] || `${col} 路線`;
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

    // 排序：預設按長度由大至小排列
    stats.sort((a, b) => b.length - a.length);

    return {
      totalLength: total,
      lengthsByConnId: lengthsMap,
      colorStats: stats,
      longestSegment: maxLen > 0 ? maxLen : 0,
      shortestSegment: minLen < Infinity && minLen > 0 ? minLen : 0,
      avgSegmentLength: connections.length > 0 ? Math.round(total / connections.length) : 0,
    };
  }, [stations, connections, lines]);

  // 3. SVG 環形圓餅圖 (Donut Chart) 計算
  const donutSlices = useMemo(() => {
    if (colorStats.length === 0) return [];

    const cx = 90;
    const cy = 90;
    const radius = 68;
    const innerRadius = 45;

    let cumulativeAngle = -90; // 從 12 點鐘方向開始

    return colorStats.map((item) => {
      const percentage = metricMode === 'length' ? item.lengthPercentage : item.countPercentage;
      const angleSpan = Math.max((percentage / 100) * 360, 1.5); // 最少保留 1.5 度避免零長度

      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angleSpan;
      cumulativeAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // 外弧端點
      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      // 內弧端點
      const ix1 = cx + innerRadius * Math.cos(startRad);
      const iy1 = cy + innerRadius * Math.sin(startRad);
      const ix2 = cx + innerRadius * Math.cos(endRad);
      const iy2 = cy + innerRadius * Math.sin(endRad);

      const largeArcFlag = angleSpan > 180 ? 1 : 0;

      // SVG path 構建環形切片
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

  // 主題樣式常數
  const cardBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800';
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';
  const textHeading = isLight ? 'text-slate-900' : 'text-slate-100';

  return (
    <div className="p-3.5 space-y-4 font-sans select-none">
      {/* 頂部面板標題 */}
      <div className={`pb-2.5 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/10 text-indigo-500 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className={`text-sm font-bold tracking-tight ${textHeading}`}>
              路網統計與分析
            </h2>
            <p className={`text-[10px] ${textMuted}`}>
              階段二 · 實時全網里程與線路分佈
            </p>
          </div>
        </div>

        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
          isLight ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
        }`}>
          {colorStats.length} 條色彩路線
        </span>
      </div>

      {/* 核心指標 3 大統計卡片 */}
      <div className="grid grid-cols-3 gap-2">
        {/* 1. 總站點數 */}
        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-medium ${textMuted}`}>總站點數</span>
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-1">
            <span className={`text-xl font-black font-mono tracking-tight ${textHeading}`}>
              {stationStats.total}
            </span>
            <span className={`text-[10px] ml-1 ${textMuted}`}>站</span>
          </div>
          <div className={`text-[9.5px] mt-1 pt-1 border-t truncate ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800/80 text-slate-400'}`}>
            營運 {stationStats.operational} · 轉折 {stationStats.virtual}
          </div>
        </div>

        {/* 2. 總路線連接數 */}
        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-medium ${textMuted}`}>總路線連接</span>
            <GitFork className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1">
            <span className={`text-xl font-black font-mono tracking-tight ${textHeading}`}>
              {connections.length}
            </span>
            <span className={`text-[10px] ml-1 ${textMuted}`}>段</span>
          </div>
          <div className={`text-[9.5px] mt-1 pt-1 border-t truncate ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800/80 text-slate-400'}`}>
            換乘站 {stationStats.interchange} 站
          </div>
        </div>

        {/* 3. 總路線長度 (座標距離) */}
        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-medium ${textMuted}`}>總路線長度</span>
            <Ruler className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="mt-1">
            <span className={`text-base font-black font-mono tracking-tight text-sky-500`}>
              {totalLength >= 1000 ? `${(totalLength / 1000).toFixed(1)}k` : totalLength}
            </span>
            <span className={`text-[9px] font-mono ml-0.5 ${textMuted}`}>px</span>
          </div>
          <div className={`text-[9.5px] mt-1 pt-1 border-t truncate ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800/80 text-slate-400'}`} title={`約 ${(totalLength / 100).toFixed(1)} 公里 (依 100px ≈ 1km 比例)`}>
            ~{(totalLength / 100).toFixed(1)} km
          </div>
        </div>
      </div>

      {/* 車站型態細分進度標籤 */}
      <div className={`p-2.5 rounded-xl border ${cardBg}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold ${textHeading}`}>車站分佈型態</span>
          <span className={`text-[10px] font-mono ${textMuted}`}>
            換乘站比率: {stationStats.operational > 0 ? `${Math.round((stationStats.interchange / stationStats.operational) * 100)}%` : '0%'}
          </span>
        </div>

        {/* 車站比例條 */}
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
          {stationStats.total > 0 && (
            <>
              <div 
                style={{ width: `${(stationStats.regular / stationStats.total) * 100}%` }} 
                className="bg-indigo-500 transition-all" 
                title={`普通站: ${stationStats.regular} (${Math.round((stationStats.regular / stationStats.total) * 100)}%)`}
              />
              <div 
                style={{ width: `${(stationStats.interchange / stationStats.total) * 100}%` }} 
                className="bg-amber-500 transition-all" 
                title={`多線換乘站: ${stationStats.interchange} (${Math.round((stationStats.interchange / stationStats.total) * 100)}%)`}
              />
              <div 
                style={{ width: `${(stationStats.virtual / stationStats.total) * 100}%` }} 
                className="bg-emerald-500 transition-all" 
                title={`轉折虛擬節點: ${stationStats.virtual} (${Math.round((stationStats.virtual / stationStats.total) * 100)}%)`}
              />
            </>
          )}
        </div>

        {/* 標籤圖例 */}
        <div className="grid grid-cols-3 gap-1 mt-2 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className={textMuted}>普通站 ({stationStats.regular})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className={textMuted}>換乘站 ({stationStats.interchange})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className={textMuted}>虛擬節點 ({stationStats.virtual})</span>
          </div>
        </div>

        {stationStats.isolated > 0 && (
          <div className={`mt-2.5 p-1.5 rounded-lg flex items-center gap-1.5 text-[10.5px] ${
            isLight ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-950/40 text-amber-300 border border-amber-800/60'
          }`}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span>提醒：路網中有 {stationStats.isolated} 個車站尚未建立任何連線</span>
          </div>
        )}
      </div>

      {/* 各顏色路線佔比圖表 (Donut Chart & Segmented Progress Bar) */}
      <div className={`p-3 rounded-xl border ${cardBg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-indigo-500" />
            <h3 className={`text-xs font-bold ${textHeading}`}>各顏色路線佔比圖表</h3>
          </div>

          {/* 指標切換：依長度 vs 依連線數 */}
          <div className={`flex items-center p-0.5 rounded-lg border text-[10px] font-medium ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-800'
          }`}>
            <button
              type="button"
              onClick={() => setMetricMode('length')}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                metricMode === 'length'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : textMuted
              }`}
              title="依各色路線實際坐標幾何長度計算佔比"
            >
              依長度
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('count')}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                metricMode === 'count'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : textMuted
              }`}
              title="依各色路線連線段數量計算佔比"
            >
              依段數
            </button>
          </div>
        </div>

        {colorStats.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            尚未建立路線連線，請切換至「節點連接」工具串連車站。
          </div>
        ) : (
          <>
            {/* SVG 環形圖表 (Donut Chart) */}
            <div className="flex items-center justify-center my-2 relative">
              <svg 
                viewBox="0 0 180 180" 
                className="w-40 h-40 filter drop-shadow-sm select-none"
              >
                {donutSlices.map((slice) => {
                  const isHovered = hoveredColor === slice.color;
                  return (
                    <path
                      key={slice.color}
                      d={slice.path}
                      fill={slice.color}
                      stroke={isLight ? '#FFFFFF' : '#0F172A'}
                      strokeWidth={isHovered ? 3 : 1.5}
                      className="transition-all duration-150 cursor-pointer hover:opacity-90"
                      style={{
                        transformOrigin: '90px 90px',
                        transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                      }}
                      onMouseEnter={() => setHoveredColor(slice.color)}
                      onMouseLeave={() => setHoveredColor(null)}
                    />
                  );
                })}

                {/* 圓心文字狀態指示器 */}
                <g className="pointer-events-none">
                  {activeHoveredStat ? (
                    <>
                      <circle cx="90" cy="90" r="42" fill={isLight ? '#FFFFFF' : '#0F172A'} />
                      <text
                        x="90"
                        y="82"
                        textAnchor="middle"
                        fill={activeHoveredStat.color}
                        fontSize="13"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {metricMode === 'length' 
                          ? `${activeHoveredStat.lengthPercentage.toFixed(1)}%` 
                          : `${activeHoveredStat.countPercentage.toFixed(1)}%`}
                      </text>
                      <text
                        x="90"
                        y="98"
                        textAnchor="middle"
                        fill={isLight ? '#64748B' : '#94A3B8'}
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {metricMode === 'length' ? `${activeHoveredStat.length}px` : `${activeHoveredStat.count}段`}
                      </text>
                    </>
                  ) : (
                    <>
                      <circle cx="90" cy="90" r="42" fill={isLight ? '#FFFFFF' : '#0F172A'} />
                      <text
                        x="90"
                        y="82"
                        textAnchor="middle"
                        fill={isLight ? '#0F172A' : '#F8FAFC'}
                        fontSize="12"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {metricMode === 'length' ? `${(totalLength / 100).toFixed(0)} km` : `${connections.length} 段`}
                      </text>
                      <text
                        x="90"
                        y="98"
                        textAnchor="middle"
                        fill={isLight ? '#64748B' : '#94A3B8'}
                        fontSize="8.5"
                        fontFamily="sans-serif"
                      >
                        {metricMode === 'length' ? '總路線長度' : '總路線連線'}
                      </text>
                    </>
                  )}
                </g>
              </svg>
            </div>

            {/* 水平色彩累積堆疊條 */}
            <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800 mt-1 mb-3">
              {colorStats.map((item) => {
                const pct = metricMode === 'length' ? item.lengthPercentage : item.countPercentage;
                return (
                  <div
                    key={item.color}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: item.color,
                    }}
                    className={`h-full transition-all cursor-pointer ${
                      hoveredColor && hoveredColor !== item.color ? 'opacity-35' : 'opacity-100'
                    }`}
                    onMouseEnter={() => setHoveredColor(item.color)}
                    onMouseLeave={() => setHoveredColor(null)}
                    title={`${item.name}: ${pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>

            {/* 各顏色詳細數據排行清單 */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
              {colorStats.map((item, idx) => {
                const isHovered = hoveredColor === item.color;
                const percentage = metricMode === 'length' ? item.lengthPercentage : item.countPercentage;

                return (
                  <div
                    key={item.color}
                    onMouseEnter={() => setHoveredColor(item.color)}
                    onMouseLeave={() => setHoveredColor(null)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isHovered
                        ? isLight
                          ? 'bg-white border-indigo-400 shadow-sm'
                          : 'bg-slate-900 border-indigo-500 shadow-sm'
                        : isLight
                        ? 'bg-white/80 border-slate-200 hover:border-slate-300'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* 色彩方塊與排行序號 */}
                        <div 
                          className="w-3.5 h-3.5 rounded-md shrink-0 shadow-xs flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ backgroundColor: item.color }}
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <span className={`text-xs font-semibold truncate block ${textHeading}`}>
                            {item.name}
                          </span>
                        </div>
                      </div>

                      {/* 佔比徽章 */}
                      <div className="flex items-center gap-1.5 shrink-0 font-mono">
                        <span className={`text-xs font-bold ${isHovered ? 'text-indigo-600 dark:text-indigo-400' : textHeading}`}>
                          {percentage.toFixed(1)}%
                        </span>
                        <span className={`text-[10px] px-1 py-0.2 rounded border uppercase font-mono ${
                          isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {item.color}
                        </span>
                      </div>
                    </div>

                    {/* 明細指標：段數與長度 */}
                    <div className="flex items-center justify-between text-[10.5px] font-mono">
                      <span className={textMuted}>
                        連線: <strong className={textHeading}>{item.count} 段</strong>
                      </span>
                      <span className={textMuted}>
                        長度: <strong className={textHeading}>{item.length} px</strong>
                        <span className="text-[9.5px] opacity-75 ml-1">
                          (~{(item.length / 100).toFixed(1)}km)
                        </span>
                      </span>
                    </div>

                    {/* 個別進度長條 */}
                    <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                        className="h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 路網幾何指標卡 (平均站距 / 最長站距) */}
      <div className={`p-2.5 rounded-xl border ${cardBg}`}>
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <h3 className={`text-xs font-bold ${textHeading}`}>站距指標 (座標幾何)</h3>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <span className={`text-[10px] block ${textMuted}`}>平均站距長度</span>
            <span className={`text-sm font-bold font-mono ${textHeading}`}>
              {avgSegmentLength} px
            </span>
            <span className={`text-[9.5px] block font-mono ${textMuted}`}>
              約 {(avgSegmentLength / 100).toFixed(2)} km
            </span>
          </div>

          <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <span className={`text-[10px] block ${textMuted}`}>最長區間站距</span>
            <span className={`text-sm font-bold font-mono text-emerald-500`}>
              {longestSegment} px
            </span>
            <span className={`text-[9.5px] block font-mono ${textMuted}`}>
              約 {(longestSegment / 100).toFixed(2)} km
            </span>
          </div>
        </div>

        <div className={`mt-2 text-[10px] flex items-center gap-1 ${textMuted}`}>
          <Info className="w-3 h-3 shrink-0 opacity-70" />
          <span>坐標幾何距離採歐氏折線實長計算（100px 約折合 1 公里）</span>
        </div>
      </div>
    </div>
  );
};
