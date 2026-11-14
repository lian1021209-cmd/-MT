import React from 'react';
import {
  StationStyle,
  StationType,
  StationVariant,
  GuangzhouBadgeItem,
} from '../types/metro';

export function resolveEffectiveStationVariant(
  stationStyle?: StationStyle,
  stationType?: StationType,
  stationVariant?: StationVariant
): Exclude<StationVariant, 'auto'> | null {
  if (stationVariant && stationVariant !== 'auto') {
    return stationVariant;
  }
  const style = stationStyle || 'default';
  if (style === 'shanghai') {
    if (stationType === 'interchange' || stationType === 'interchange_3line') {
      return 'shanghai_interchange';
    }
    return 'shanghai_basic';
  }
  if (style === 'guangzhou') {
    if (stationType === 'interchange' || stationType === 'interchange_3line') {
      return 'guangzhou_interchange';
    }
    return 'guangzhou_basic';
  }
  if (style === 'beijing') {
    if (stationType === 'interchange' || stationType === 'interchange_3line') {
      return 'beijing_interchange';
    }
    return 'beijing_basic';
  }
  return null;
}

export function getCityFromVariant(variant: StationVariant): StationStyle {
  if (variant.startsWith('shanghai_')) return 'shanghai';
  if (variant.startsWith('guangzhou_')) return 'guangzhou';
  if (variant.startsWith('beijing_')) return 'beijing';
  return 'default';
}

export function getDefaultGzBadges(
  variant: Exclude<StationVariant, 'auto'>,
  existing?: GuangzhouBadgeItem[],
  connectedColors: string[] = [],
  stationCode?: string,
  stationColor?: string
): GuangzhouBadgeItem[] {
  if (variant === 'guangzhou_basic') {
    const first = existing?.[0];
    return [
      {
        line: first?.line !== undefined ? first.line : '1',
        number: first?.number !== undefined ? first.number : '01',
        color: first?.color,
      },
    ];
  }
  if (variant === 'guangzhou_interchange_2024') {
    const first = existing?.[0];
    const second = existing?.[1];
    return [
      {
        line: first?.line !== undefined ? first.line : '1',
        number: first?.number !== undefined ? first.number : '1',
        color: first?.color,
      },
      {
        line: second?.line !== undefined ? second.line : '1',
        number: second?.number !== undefined ? second.number : '1',
        color: second?.color,
      },
    ];
  }
  // guangzhou_interchange
  if (existing && existing.length >= 2) {
    return existing.map((b, idx) => ({
      line: b.line,
      number: b.number,
      color: b.color || connectedColors[idx] || (idx === 0 ? '#EAB308' : idx === 1 ? '#F97316' : '#2563EB'),
    }));
  }
  const count = Math.max(2, connectedColors.length);
  const defaultLines = ['1', '3', '2', '5', '6', '8'];
  const defaultNums = ['14', '11', '08', '05', '12', '10'];
  const defaultColors = ['#EAB308', '#F97316', '#2563EB', '#E11D48', '#16A34A', '#9333EA'];
  return Array.from({ length: count }).map((_, idx) => ({
    line: existing?.[idx]?.line ?? defaultLines[idx % defaultLines.length],
    number: existing?.[idx]?.number ?? defaultNums[idx % defaultNums.length],
    color: existing?.[idx]?.color || connectedColors[idx] || defaultColors[idx % defaultColors.length],
  }));
}

interface CityStationSymbolProps {
  variant: Exclude<StationVariant, 'auto'>;
  stationColor?: string;
  gzBadges?: GuangzhouBadgeItem[];
  connectedColors?: string[];
  stationCode?: string;
}

function measurePillDimensions(lineText: string, numText: string, height: number = 14) {
  const lStr = lineText || '';
  const nStr = numText || '';
  const leftW = Math.max(10.5, lStr.length * 4.8 + 4.5);
  const rightW = Math.max(13, nStr.length * 4.5 + 5);
  const width = leftW + rightW;
  return { leftW, rightW, width, height };
}

export const CityStationSymbol: React.FC<CityStationSymbolProps> = ({
  variant,
  stationColor,
  gzBadges,
  connectedColors = [],
  stationCode,
}) => {
  // 1. 上海基本站: crisp white circle with dark outline
  if (variant === 'shanghai_basic') {
    const strokeCol = stationColor || '#18181B';
    return (
      <g pointerEvents="none">
        <circle r={5.8} fill="#ffffff" stroke={strokeCol} strokeWidth={1.6} />
      </g>
    );
  }

  // 2. 上海基本站(2020): crisp vertical solid bar
  if (variant === 'shanghai_2020') {
    const fillCol = stationColor || '#18181B';
    return (
      <g pointerEvents="none">
        <rect x={-2} y={-4.6} width={4} height={9.2} rx={0.6} fill={fillCol} />
      </g>
    );
  }

  // 3. 上海換乘站: white horizontal stadium / rounded pill
  if (variant === 'shanghai_interchange') {
    const strokeCol = stationColor || '#18181B';
    return (
      <g pointerEvents="none">
        <rect
          x={-8.5}
          y={-5.2}
          width={17}
          height={10.4}
          rx={5.2}
          fill="#ffffff"
          stroke={strokeCol}
          strokeWidth={1.6}
        />
      </g>
    );
  }

  // 4. 上海市域鐵路站: grey open-bottom inverted-U tick
  if (variant === 'shanghai_suburban') {
    const strokeCol = stationColor || '#71717A';
    return (
      <g pointerEvents="none">
        <rect x={-2.5} y={-3.6} width={5} height={7.2} fill="#ffffff" stroke="none" />
        <path
          d="M -2.5 3.6 L -2.5 -3.6 L 2.5 -3.6 L 2.5 3.6"
          fill="none"
          stroke={strokeCol}
          strokeWidth={1.3}
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </g>
    );
  }

  // 5. 北京基本站: small crisp white circle with thin dark/colored outline
  if (variant === 'beijing_basic') {
    const strokeCol = stationColor || '#18181B';
    return (
      <g pointerEvents="none">
        <circle r={4.6} fill="#ffffff" stroke={strokeCol} strokeWidth={1.3} />
      </g>
    );
  }

  // 6. 北京換乘站: white circle with cyclic vertical/diagonal dual arrows inside
  if (variant === 'beijing_interchange') {
    const col = stationColor || '#18181B';
    return (
      <g pointerEvents="none">
        <circle r={8.6} fill="#ffffff" stroke={col} strokeWidth={1.4} />
        {/* Left arc curving clockwise upward */}
        <path
          d="M -1.5 5.2 A 5.4 5.4 0 0 1 -1.2 -4.8"
          fill="none"
          stroke={col}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <path d="M 1.2 -5.0 L -1.8 -6.4 L -1.3 -3.2 Z" fill={col} />
        {/* Right arc curving clockwise downward */}
        <path
          d="M 1.5 -5.2 A 5.4 5.4 0 0 1 1.2 4.8"
          fill="none"
          stroke={col}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <path d="M -1.2 5.0 L 1.8 6.4 L 1.3 3.2 Z" fill={col} />
      </g>
    );
  }

  // 7. 廣州基本站: single split pill [line | number]
  if (variant === 'guangzhou_basic') {
    const [badge] = getDefaultGzBadges('guangzhou_basic', gzBadges, connectedColors, stationCode, stationColor);
    const pillColor = badge.color || stationColor || '#18181B';
    const { leftW, rightW, width, height } = measurePillDimensions(badge.line, badge.number, 14);
    const x0 = -width / 2;
    const divX = x0 + leftW;
    return (
      <g pointerEvents="none">
        <rect
          x={x0}
          y={-height / 2}
          width={width}
          height={height}
          rx={height / 2}
          fill="#ffffff"
          stroke={pillColor}
          strokeWidth={1.4}
        />
        <line
          x1={divX}
          y1={-height / 2 + 0.6}
          x2={divX}
          y2={height / 2 - 0.6}
          stroke={pillColor}
          strokeWidth={1.05}
        />
        <text
          x={x0 + leftW / 2 + 0.3}
          y={0.4}
          textAnchor="middle"
          dominantBaseline="central"
          fill={pillColor}
          fontSize={7.6}
          fontWeight={700}
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        >
          {badge.line}
        </text>
        <text
          x={divX + rightW / 2 - 0.3}
          y={0.4}
          textAnchor="middle"
          dominantBaseline="central"
          fill={pillColor}
          fontSize={7.6}
          fontWeight={700}
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        >
          {badge.number}
        </text>
      </g>
    );
  }

  // 8. 廣州換乘站: multi-pill joined inside soft outer pill [1|14][3|11]
  if (variant === 'guangzhou_interchange') {
    const badges = getDefaultGzBadges('guangzhou_interchange', gzBadges, connectedColors, stationCode, stationColor);
    const pillH = 13;
    const gap = 1.4;
    const measured = badges.map((b) => ({
      badge: b,
      ...measurePillDimensions(b.line, b.number, pillH),
    }));
    const totalInnerW = measured.reduce((acc, m) => acc + m.width, 0) + gap * Math.max(0, measured.length - 1);
    const outerPadX = 2;
    const outerPadY = 2;
    const outerW = totalInnerW + outerPadX * 2;
    const outerH = pillH + outerPadY * 2;
    let cursorX = -totalInnerW / 2;

    return (
      <g pointerEvents="none">
        <rect
          x={-outerW / 2}
          y={-outerH / 2}
          width={outerW}
          height={outerH}
          rx={outerH / 2}
          fill="#ffffff"
          stroke={stationColor || '#D4D4D8'}
          strokeWidth={1.6}
        />
        {measured.map((m, idx) => {
          const x0 = cursorX;
          cursorX += m.width + gap;
          const divX = x0 + m.leftW;
          const bCol = m.badge.color || '#EAB308';
          return (
            <g key={idx}>
              <rect
                x={x0}
                y={-pillH / 2}
                width={m.width}
                height={pillH}
                rx={pillH / 2}
                fill="#ffffff"
                stroke={bCol}
                strokeWidth={1.45}
              />
              <line
                x1={divX}
                y1={-pillH / 2 + 0.7}
                x2={divX}
                y2={pillH / 2 - 0.7}
                stroke={bCol}
                strokeWidth={1}
              />
              <text
                x={x0 + m.leftW / 2 + 0.3}
                y={0.4}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#18181B"
                fontSize={7.2}
                fontWeight={700}
                fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
              >
                {m.badge.line}
              </text>
              <text
                x={divX + m.rightW / 2 - 0.3}
                y={0.4}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#18181B"
                fontSize={7.2}
                fontWeight={700}
                fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
              >
                {m.badge.number}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  // 9. 廣州換乘站(2024): two separated pills with bold top & bottom clockwise transfer arrows
  const badges2024 = getDefaultGzBadges(
    'guangzhou_interchange_2024',
    gzBadges,
    connectedColors,
    stationCode,
    stationColor
  ).slice(0, 2);
  const pillH = 13;
  const gap = 4.5;
  const m0 = measurePillDimensions(badges2024[0].line, badges2024[0].number, pillH);
  const m1 = measurePillDimensions(badges2024[1].line, badges2024[1].number, pillH);
  const totalW = m0.width + gap + m1.width;
  const xStart0 = -totalW / 2;
  const xStart1 = xStart0 + m0.width + gap;
  const arrowCol = stationColor || '#18181B';
  const col0 = badges2024[0].color || stationColor || '#18181B';
  const col1 = badges2024[1].color || stationColor || '#18181B';

  return (
    <g pointerEvents="none">
      {/* Top bold clockwise arrow */}
      <path
        d="M -11 -9.2 A 15 10 0 0 1 9.5 -9.2"
        fill="none"
        stroke={arrowCol}
        strokeWidth={2.3}
        strokeLinecap="round"
      />
      <path d="M 12.6 -7.6 L 9.8 -11.6 L 7.4 -7.5 Z" fill={arrowCol} />

      {/* Bottom bold clockwise arrow */}
      <path
        d="M 11 9.2 A 15 10 0 0 1 -9.5 9.2"
        fill="none"
        stroke={arrowCol}
        strokeWidth={2.3}
        strokeLinecap="round"
      />
      <path d="M -12.6 7.6 L -9.8 11.6 L -7.4 7.5 Z" fill={arrowCol} />

      {[
        { x0: xStart0, m: m0, badge: badges2024[0], col: col0 },
        { x0: xStart1, m: m1, badge: badges2024[1], col: col1 },
      ].map(({ x0, m, badge, col }, idx) => {
        const divX = x0 + m.leftW;
        return (
          <g key={idx}>
            <rect
              x={x0}
              y={-pillH / 2}
              width={m.width}
              height={pillH}
              rx={pillH / 2}
              fill="#ffffff"
              stroke={col}
              strokeWidth={1.35}
            />
            <line
              x1={divX}
              y1={-pillH / 2 + 0.6}
              x2={divX}
              y2={pillH / 2 - 0.6}
              stroke={col}
              strokeWidth={1}
            />
            <text
              x={x0 + m.leftW / 2 + 0.3}
              y={0.4}
              textAnchor="middle"
              dominantBaseline="central"
              fill={col}
              fontSize={7.4}
              fontWeight={700}
              fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
            >
              {badge.line}
            </text>
            <text
              x={divX + m.rightW / 2 - 0.3}
              y={0.4}
              textAnchor="middle"
              dominantBaseline="central"
              fill={col}
              fontSize={7.4}
              fontWeight={700}
              fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
            >
              {badge.number}
            </text>
          </g>
        );
      })}
    </g>
  );
};
