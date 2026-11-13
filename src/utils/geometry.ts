import { RouteType, Point } from '../types/metro';

/**
 * Geometry helpers for metro map line routing, diamond 90-degree corners,
 * Douglas-Peucker simplification, and smooth Catmull-Rom waypoint curves.
 */

export function snapToGrid(val: number, gridSize: number = 20): number {
  return Math.round(val / gridSize) * gridSize;
}

const roundCoord = (n: number): number => Math.round(n * 10) / 10;

/**
 * Generates an SVG path from an anchor polyline [P0, P1, ..., Pn] with exact perpendicular parallel offset
 * and concentric corner rounding for clean parallel metro tracks (並線效果).
 */
export function buildOffsetPolylinePath(
  rawPoints: Point[],
  offset: number = 0,
  radius: number = 14
): string {
  // Filter out consecutive duplicate points
  const pts: Point[] = [];
  for (const p of rawPoints) {
    if (
      pts.length === 0 ||
      Math.hypot(p.x - pts[pts.length - 1].x, p.y - pts[pts.length - 1].y) >= 0.5
    ) {
      pts.push(p);
    }
  }
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${roundCoord(pts[0].x)} ${roundCoord(pts[0].y)}`;

  const hasOffset = Math.abs(offset) >= 0.05;

  interface SegInfo {
    ux: number;
    uy: number;
    nx: number;
    ny: number;
    ax: number;
    ay: number;
    bx: number;
    by: number;
  }

  const segs: SegInfo[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    segs.push({
      ux,
      uy,
      nx,
      ny,
      ax: a.x + (hasOffset ? offset * nx : 0),
      ay: a.y + (hasOffset ? offset * ny : 0),
      bx: b.x + (hasOffset ? offset * nx : 0),
      by: b.y + (hasOffset ? offset * ny : 0),
    });
  }

  const oPts: Point[] = [{ x: segs[0].ax, y: segs[0].ay }];
  const crossVals: number[] = [];

  for (let i = 1; i < pts.length - 1; i++) {
    const s1 = segs[i - 1];
    const s2 = segs[i];
    const det = s1.ux * s2.uy - s1.uy * s2.ux;
    crossVals.push(det);

    if (!hasOffset || Math.abs(det) < 1e-4) {
      oPts.push({ x: s2.ax, y: s2.ay });
    } else {
      const diffX = s2.ax - s1.bx;
      const diffY = s2.ay - s1.by;
      const rawT = (diffX * s2.uy - diffY * s2.ux) / det;
      const maxMiter = Math.abs(offset) * 4;
      const t = Math.max(-maxMiter, Math.min(maxMiter, rawT));
      oPts.push({
        x: s1.bx + t * s1.ux,
        y: s1.by + t * s1.uy,
      });
    }
  }

  oPts.push({ x: segs[segs.length - 1].bx, y: segs[segs.length - 1].by });

  if (oPts.length === 2) {
    return `M ${roundCoord(oPts[0].x)} ${roundCoord(oPts[0].y)} L ${roundCoord(oPts[1].x)} ${roundCoord(oPts[1].y)}`;
  }

  let d = `M ${roundCoord(oPts[0].x)} ${roundCoord(oPts[0].y)}`;

  for (let i = 1; i < oPts.length - 1; i++) {
    const prev = oPts[i - 1];
    const curr = oPts[i];
    const next = oPts[i + 1];
    const leg1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const leg2 = Math.hypot(next.x - curr.x, next.y - curr.y);
    const crossVal = crossVals[i - 1] ?? 0;

    // Concentric corner radius adjustment so parallel tracks keep uniform spacing around bends
    let targetR = radius;
    if (hasOffset && Math.abs(crossVal) > 1e-4) {
      if (offset * crossVal < 0) {
        targetR = radius + Math.abs(offset);
      } else {
        targetR = Math.max(2, radius - Math.abs(offset));
      }
    }

    const r = Math.min(targetR, leg1 * 0.45, leg2 * 0.45);
    if (r < 1 || leg1 < 2 || leg2 < 2) {
      d += ` L ${roundCoord(curr.x)} ${roundCoord(curr.y)}`;
    } else {
      const u1x = (prev.x - curr.x) / leg1;
      const u1y = (prev.y - curr.y) / leg1;
      const u2x = (next.x - curr.x) / leg2;
      const u2y = (next.y - curr.y) / leg2;
      const inX = curr.x + u1x * r;
      const inY = curr.y + u1y * r;
      const outX = curr.x + u2x * r;
      const outY = curr.y + u2y * r;
      d += ` L ${roundCoord(inX)} ${roundCoord(inY)} Q ${roundCoord(curr.x)} ${roundCoord(curr.y)} ${roundCoord(outX)} ${roundCoord(outY)}`;
    }
  }

  const last = oPts[oPts.length - 1];
  d += ` L ${roundCoord(last.x)} ${roundCoord(last.y)}`;
  return d;
}

/**
 * Offsets each point of a smooth curve polyline using averaged vertex normals.
 */
function offsetCurvePoints(points: Point[], offset: number): Point[] {
  if (Math.abs(offset) < 0.05 || points.length < 2) return points;

  const segNormals: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.hypot(dx, dy) || 1;
    segNormals.push({ x: -dy / len, y: dx / len });
  }

  return points.map((pt, i) => {
    if (i === 0) {
      const n = segNormals[0];
      return { x: pt.x + offset * n.x, y: pt.y + offset * n.y };
    }
    if (i === points.length - 1) {
      const n = segNormals[segNormals.length - 1];
      return { x: pt.x + offset * n.x, y: pt.y + offset * n.y };
    }
    const n1 = segNormals[i - 1];
    const n2 = segNormals[i];
    const avgX = n1.x + n2.x;
    const avgY = n1.y + n2.y;
    const avgLen = Math.hypot(avgX, avgY);
    if (avgLen < 1e-4) {
      return { x: pt.x + offset * n1.x, y: pt.y + offset * n1.y };
    }
    const ux = avgX / avgLen;
    const uy = avgY / avgLen;
    const dot = n1.x * ux + n1.y * uy;
    const miterScale = Math.min(2.5, 1 / Math.max(0.4, dot));
    return {
      x: pt.x + offset * miterScale * ux,
      y: pt.y + offset * miterScale * uy,
    };
  });
}

/**
 * 1. 135度折線段 (經典地鐵 45°/135° 倒角走向，支援內外翻轉與平行偏移)
 */
export function get135BendPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number = 12,
  isFlipped: boolean = false,
  offset: number = 0
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // If directly horizontal, vertical, or already 45 deg diagonal
  if (absDx === 0 || absDy === 0 || Math.abs(absDx - absDy) < 2) {
    if (Math.abs(offset) < 0.05) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    return buildOffsetPolylinePath(
      [{ x: x1, y: y1 }, { x: x2, y: y2 }],
      offset,
      radius
    );
  }

  const signX = Math.sign(dx);
  const signY = Math.sign(dy);

  if (Math.abs(offset) >= 0.05) {
    let corner: Point;
    if (!isFlipped) {
      if (absDx > absDy) {
        corner = { x: x2 - signX * absDy, y: y1 };
      } else {
        corner = { x: x1, y: y2 - signY * absDx };
      }
    } else {
      if (absDx > absDy) {
        corner = { x: x1 + signX * absDy, y: y2 };
      } else {
        corner = { x: x2, y: y1 + signY * absDx };
      }
    }
    return buildOffsetPolylinePath(
      [{ x: x1, y: y1 }, corner, { x: x2, y: y2 }],
      offset,
      radius
    );
  }

  if (!isFlipped) {
    // Normal:
    if (absDx > absDy) {
      // Longer horizontally: move horizontally, then 45-deg into target
      const midX = x2 - signX * absDy;
      const r = Math.min(radius, absDy / 2);
      return `M ${x1} ${y1} L ${midX - signX * r} ${y1} Q ${midX} ${y1} ${midX + signX * r * 0.7} ${y1 + signY * r * 0.7} L ${x2} ${y2}`;
    } else {
      // Longer vertically: move vertically, then 45-deg into target
      const midY = y2 - signY * absDx;
      const r = Math.min(radius, absDx / 2);
      return `M ${x1} ${y1} L ${x1} ${midY - signY * r} Q ${x1} ${midY} ${x1 + signX * r * 0.7} ${midY + signY * r * 0.7} L ${x2} ${y2}`;
    }
  } else {
    // Flipped (內外翻轉走線):
    if (absDx > absDy) {
      // 45-deg diagonal first, then move horizontally into target
      const midX = x1 + signX * absDy;
      const r = Math.min(radius, absDy / 2);
      return `M ${x1} ${y1} L ${midX - signX * r * 0.7} ${y2 - signY * r * 0.7} Q ${midX} ${y2} ${midX + signX * r} ${y2} L ${x2} ${y2}`;
    } else {
      // 45-deg diagonal first, then move vertically into target
      const midY = y1 + signY * absDx;
      const r = Math.min(radius, absDx / 2);
      return `M ${x1} ${y1} L ${x2 - signX * r * 0.7} ${midY - signY * r * 0.7} Q ${x2} ${midY} ${x2} ${midY + signY * r} L ${x2} ${y2}`;
    }
  }
}

/**
 * 2. 90垂直線段 (先水平後垂直 / 先垂直後水平，支援內外翻轉與平行偏移)
 */
export function get90OrthoPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number = 12,
  isFlipped: boolean = false,
  offset: number = 0
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 || dy === 0) {
    if (Math.abs(offset) < 0.05) return `M ${x1} ${y1} L ${x2} ${y2}`;
    return buildOffsetPolylinePath(
      [{ x: x1, y: y1 }, { x: x2, y: y2 }],
      offset,
      radius
    );
  }

  if (Math.abs(offset) >= 0.05) {
    const corner: Point = !isFlipped ? { x: x2, y: y1 } : { x: x1, y: y2 };
    return buildOffsetPolylinePath(
      [{ x: x1, y: y1 }, corner, { x: x2, y: y2 }],
      offset,
      radius
    );
  }

  const signX = Math.sign(dx);
  const signY = Math.sign(dy);
  const r = Math.min(radius, Math.abs(dx) / 2, Math.abs(dy) / 2);

  if (!isFlipped) {
    // Normal: From (x1, y1) horizontally to corner at (x2, y1), then vertically to (x2, y2)
    return `M ${x1} ${y1} L ${x2 - signX * r} ${y1} Q ${x2} ${y1} ${x2} ${y1 + signY * r} L ${x2} ${y2}`;
  } else {
    // Flipped: From (x1, y1) vertically to corner at (x1, y2), then horizontally to (x2, y2)
    return `M ${x1} ${y1} L ${x1} ${y2 - signY * r} Q ${x1} ${y2} ${x1 + signX * r} ${y2} L ${x2} ${y2}`;
  }
}

/**
 * 3. 90度旋轉垂直線段 (菱形旁的 90° 角，兩段皆為 45° 斜邊並在頂點成 90° 直角，支援內外翻轉與平行偏移)
 */
export function get90RotatedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number = 14,
  isFlipped: boolean = false,
  offset: number = 0
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) {
    if (Math.abs(offset) < 0.05) return `M ${x1} ${y1} L ${x2} ${y2}`;
    return buildOffsetPolylinePath([{ x: x1, y: y1 }, { x: x2, y: y2 }], offset, radius);
  }

  // If already at 45° or 135° diagonal, connect directly
  if (Math.abs(Math.abs(dx) - Math.abs(dy)) < 2) {
    if (Math.abs(offset) < 0.05) return `M ${x1} ${y1} L ${x2} ${y2}`;
    return buildOffsetPolylinePath([{ x: x1, y: y1 }, { x: x2, y: y2 }], offset, radius);
  }

  // Diamond 90° corner formula:
  // Flipped toggles the vertex to the opposite side of the chord
  const sign = isFlipped ? -1 : 1;
  const cx = (x1 + x2 + sign * (y2 - y1)) / 2;
  const cy = (y1 + y2 + sign * (x2 - x1)) / 2;

  if (Math.abs(offset) >= 0.05) {
    return buildOffsetPolylinePath(
      [{ x: x1, y: y1 }, { x: cx, y: cy }, { x: x2, y: y2 }],
      offset,
      radius
    );
  }

  const leg1 = Math.hypot(cx - x1, cy - y1);
  const leg2 = Math.hypot(x2 - cx, y2 - cy);
  const minLeg = Math.min(leg1, leg2);

  if (minLeg < 4) {
    return `M ${x1} ${y1} L ${Math.round(cx)} ${Math.round(cy)} L ${x2} ${y2}`;
  }

  // Corner rounding at the diamond apex
  const r = Math.min(radius, minLeg * 0.4);
  const u1x = (x1 - cx) / leg1;
  const u1y = (y1 - cy) / leg1;
  const u2x = (x2 - cx) / leg2;
  const u2y = (y2 - cy) / leg2;

  const a1x = cx + u1x * r;
  const a1y = cy + u1y * r;
  const a2x = cx + u2x * r;
  const a2y = cy + u2y * r;

  return `M ${x1} ${y1} L ${Math.round(a1x)} ${Math.round(a1y)} Q ${Math.round(cx)} ${Math.round(cy)} ${Math.round(a2x)} ${Math.round(a2y)} L ${x2} ${y2}`;
}

/**
 * 4. 直線線段 (兩點筆直直連線，支援平行偏移)
 */
export function getStraightPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset: number = 0
): string {
  if (Math.abs(offset) < 0.05) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  return buildOffsetPolylinePath([{ x: x1, y: y1 }, { x: x2, y: y2 }], offset, 0);
}

/**
 * 5. 任意角度線段 (AB兩條線皆可360°旋轉選擇，以角度相交匯合，支援內外翻轉與平行偏移)
 * @param angleA 線段 A (站點 A 側出發角度，0° ~ 360°)
 * @param angleB 線段 B (站點 B 側接續角度，0° ~ 360°)
 */
export function getAnyAnglePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number = 14,
  isFlipped: boolean = false,
  angleA?: number,
  angleB?: number,
  offset: number = 0
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) {
    if (Math.abs(offset) < 0.05) return `M ${x1} ${y1} L ${x2} ${y2}`;
    return buildOffsetPolylinePath([{ x: x1, y: y1 }, { x: x2, y: y2 }], offset, radius);
  }

  // Smart default angles if not set: horizontal/vertical based on major dx/dy
  let degA = angleA;
  let degB = angleB;

  if (degA === undefined || degB === undefined) {
    if (Math.abs(dx) >= Math.abs(dy)) {
      degA = degA !== undefined ? degA : (dx >= 0 ? 0 : 180);
      degB = degB !== undefined ? degB : (dy >= 0 ? 90 : 270);
    } else {
      degA = degA !== undefined ? degA : (dy >= 0 ? 90 : 270);
      degB = degB !== undefined ? degB : (dx >= 0 ? 0 : 180);
    }
  }

  // Convert angles to radians (0° = East, 90° = South, 180° = West, 270° = North in SVG screen space)
  const radA = ((degA % 360 + 360) % 360) * (Math.PI / 180);
  const radB = ((degB % 360 + 360) % 360) * (Math.PI / 180);

  const uAx = Math.cos(radA);
  const uAy = Math.sin(radA);
  const uBx = Math.cos(radB);
  const uBy = Math.sin(radB);

  // Intersection between Line A: (x1, y1) + t * (uAx, uAy)
  // and Line B: (x2, y2) + s * (uBx, uBy)
  const det = uAy * uBx - uAx * uBy;

  let cx: number;
  let cy: number;

  if (Math.abs(det) < 0.001) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    cx = midX;
    cy = midY;
  } else {
    const t = (dy * uBx - dx * uBy) / det;
    cx = x1 + t * uAx;
    cy = y1 + t * uAy;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const distToMid = Math.hypot(cx - midX, cy - midY);
    const maxDist = Math.max(dist * 2.5, 300);
    if (distToMid > maxDist) {
      const scale = maxDist / distToMid;
      cx = midX + (cx - midX) * scale;
      cy = midY + (cy - midY) * scale;
    }
  }

  // 走線內外翻轉：將交點頂點 C 沿兩站點弦線 AB 鏡射對稱翻轉
  if (isFlipped) {
    const chordLenSq = dx * dx + dy * dy;
    if (chordLenSq > 0.0001) {
      const wX = cx - x1;
      const wY = cy - y1;
      const proj = (wX * dx + wY * dy) / chordLenSq;
      const projX = x1 + proj * dx;
      const projY = y1 + proj * dy;
      cx = 2 * projX - cx;
      cy = 2 * projY - cy;
    }
  }

  if (Math.abs(offset) >= 0.05) {
    return buildOffsetPolylinePath(
      [{ x: x1, y: y1 }, { x: cx, y: cy }, { x: x2, y: y2 }],
      offset,
      radius
    );
  }

  const leg1 = Math.hypot(cx - x1, cy - y1);
  const leg2 = Math.hypot(x2 - cx, y2 - cy);
  const minLeg = Math.min(leg1, leg2);

  if (minLeg < 4) {
    return `M ${Math.round(x1)} ${Math.round(y1)} L ${Math.round(cx)} ${Math.round(cy)} L ${Math.round(x2)} ${Math.round(y2)}`;
  }

  // Smooth quadratic corner rounding at the intersection apex
  const r = Math.min(radius, minLeg * 0.45);
  const u1x = (x1 - cx) / leg1;
  const u1y = (y1 - cy) / leg1;
  const u2x = (x2 - cx) / leg2;
  const u2y = (y2 - cy) / leg2;

  const a1x = cx + u1x * r;
  const a1y = cy + u1y * r;
  const a2x = cx + u2x * r;
  const a2y = cy + u2y * r;

  return `M ${Math.round(x1)} ${Math.round(y1)} L ${Math.round(a1x)} ${Math.round(a1y)} Q ${Math.round(cx)} ${Math.round(cy)} ${Math.round(a2x)} ${Math.round(a2y)} L ${Math.round(x2)} ${Math.round(y2)}`;
}

/**
 * Ramer-Douglas-Peucker (RDP) Algorithm
 * Simplifies a high-frequency recorded mouse trajectory into key inflection waypoints
 */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  const num = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  return num / Math.sqrt(lenSq);
}

export function simplifyPoints(points: Point[], tolerance: number = 10): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPoints(points.slice(0, index + 1), tolerance);
    const right = simplifyPoints(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  } else {
    return [first, last];
  }
}

/**
 * Generates a smooth Catmull-Rom spline passing directly through all waypoints
 */
export function getSmoothCatmullRomPath(points: Point[]): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M ${roundCoord(points[0].x)} ${roundCoord(points[0].y)}`;
  if (n === 2) return `M ${roundCoord(points[0].x)} ${roundCoord(points[0].y)} L ${roundCoord(points[1].x)} ${roundCoord(points[1].y)}`;

  let d = `M ${roundCoord(points[0].x)} ${roundCoord(points[0].y)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < n ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${roundCoord(cp1x)} ${roundCoord(cp1y)}, ${roundCoord(cp2x)} ${roundCoord(cp2y)}, ${roundCoord(p2.x)} ${roundCoord(p2.y)}`;
  }

  return d;
}

/**
 * 6. 自由繪製線段 (若有 waypoints 則精確穿過 waypoints，若無則自然平滑直線，支援平行偏移)
 */
export function getFreeCurvePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  waypoints?: Point[],
  offset: number = 0
): string {
  if (waypoints && waypoints.length > 0) {
    const allPoints = [{ x: x1, y: y1 }, ...waypoints, { x: x2, y: y2 }];
    const shifted = Math.abs(offset) >= 0.05 ? offsetCurvePoints(allPoints, offset) : allPoints;
    return getSmoothCatmullRomPath(shifted);
  }

  if (Math.abs(offset) >= 0.05) {
    return buildOffsetPolylinePath([{ x: x1, y: y1 }, { x: x2, y: y2 }], offset, 0);
  }

  // 預設的自由繪製線路是直線（沒有小節點，後續可雙擊線段增加小節點調成曲線）
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

/**
 * Master dispatcher for all line segment types (支援 135度、90度、90旋轉、任意角度內外翻轉、360°角度雙轉盤與線段平行偏移並線)
 */
export function getMetroPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  routeType: RouteType = '135_bend',
  radius: number = 14,
  waypoints?: Point[],
  isFlipped: boolean = false,
  angleA?: number,
  angleB?: number,
  offset: number = 0
): string {
  switch (routeType) {
    case '135_bend':
      return get135BendPath(x1, y1, x2, y2, radius, isFlipped, offset);
    case '90_ortho':
      return get90OrthoPath(x1, y1, x2, y2, radius, isFlipped, offset);
    case '90_rotated':
      return get90RotatedPath(x1, y1, x2, y2, radius, isFlipped, offset);
    case 'straight':
      return getStraightPath(x1, y1, x2, y2, offset);
    case 'any_angle':
      return getAnyAnglePath(x1, y1, x2, y2, radius, isFlipped, angleA, angleB, offset);
    case 'free_curve':
      return getFreeCurvePath(x1, y1, x2, y2, waypoints, offset);
    default:
      return get135BendPath(x1, y1, x2, y2, radius, isFlipped, offset);
  }
}
