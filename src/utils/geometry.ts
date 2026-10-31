import { RouteType, Point } from '../types/metro';

/**
 * Geometry helpers for metro map line routing, diamond 90-degree corners,
 * Douglas-Peucker simplification, and smooth Catmull-Rom waypoint curves.
 */

export function snapToGrid(val: number, gridSize: number = 20): number {
  return Math.round(val / gridSize) * gridSize;
}

/**
 * 1. 135度折線段 (經典地鐵 45°/135° 倒角走向，支援內外翻轉)
 */
export function get135BendPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number = 12,
  isFlipped: boolean = false
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // If directly horizontal, vertical, or already 45 deg diagonal
  if (absDx === 0 || absDy === 0 || Math.abs(absDx - absDy) < 2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  const signX = Math.sign(dx);
  const signY = Math.sign(dy);

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
 * 2. 90垂直線段 (先水平後垂直 / 先垂直後水平，支援內外翻轉)
 */
export function get90OrthoPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number = 12,
  isFlipped: boolean = false
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 || dy === 0) return `M ${x1} ${y1} L ${x2} ${y2}`;

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
 * 3. 90度旋轉垂直線段 (菱形旁的 90° 角，兩段皆為 45° 斜邊並在頂點成 90° 直角，支援內外翻轉)
 */
export function get90RotatedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number = 14,
  isFlipped: boolean = false
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return `M ${x1} ${y1} L ${x2} ${y2}`;

  // If already at 45° or 135° diagonal, connect directly
  if (Math.abs(Math.abs(dx) - Math.abs(dy)) < 2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // Diamond 90° corner formula:
  // Flipped toggles the vertex to the opposite side of the chord
  const sign = isFlipped ? -1 : 1;
  const cx = (x1 + x2 + sign * (y2 - y1)) / 2;
  const cy = (y1 + y2 + sign * (x2 - x1)) / 2;

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
 * 4. 直線線段 (兩點筆直直連線)
 */
export function getStraightPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

/**
 * 5. 任意角度線段 (AB兩條線皆可360°旋轉選擇，以角度相交匯合，支援內外翻轉)
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
  angleB?: number
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return `M ${x1} ${y1} L ${x2} ${y2}`;

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
  // Determinant: uAx * (-uBy) - uAy * (-uBx) = uAy * uBx - uAx * uBy = sin(radA - radB)
  const det = uAy * uBx - uAx * uBy;

  let cx: number;
  let cy: number;

  if (Math.abs(det) < 0.001) {
    // Parallel lines: connect via midpoint jog along Line A direction
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    cx = midX;
    cy = midY;
  } else {
    // Solve 2x2 linear system
    const t = (dy * uBx - dx * uBy) / det;
    cx = x1 + t * uAx;
    cy = y1 + t * uAy;

    // Bound the apex if lines are nearly parallel and intersect far away
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
  if (n === 1) return `M ${points[0].x} ${points[0].y}`;
  if (n === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${Math.round(points[0].x)} ${Math.round(points[0].y)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < n ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${Math.round(cp1x)} ${Math.round(cp1y)}, ${Math.round(cp2x)} ${Math.round(cp2y)}, ${Math.round(p2.x)} ${Math.round(p2.y)}`;
  }

  return d;
}

/**
 * 6. 自由繪製線段 (若有 waypoints 則精確穿過 waypoints，若無則自然平滑曲線)
 */
export function getFreeCurvePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  waypoints?: Point[]
): string {
  if (waypoints && waypoints.length > 0) {
    const allPoints = [{ x: x1, y: y1 }, ...waypoints, { x: x2, y: y2 }];
    return getSmoothCatmullRomPath(allPoints);
  }

  // 預設的自由繪製線路是直線（沒有小節點，後續可雙擊線段增加小節點調成曲線）
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

/**
 * Master dispatcher for all line segment types (支援 135度、90度、90旋轉、任意角度內外翻轉與360°角度雙轉盤)
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
  angleB?: number
): string {
  switch (routeType) {
    case '135_bend':
      return get135BendPath(x1, y1, x2, y2, radius, isFlipped);
    case '90_ortho':
      return get90OrthoPath(x1, y1, x2, y2, radius, isFlipped);
    case '90_rotated':
      return get90RotatedPath(x1, y1, x2, y2, radius, isFlipped);
    case 'straight':
      return getStraightPath(x1, y1, x2, y2);
    case 'any_angle':
      return getAnyAnglePath(x1, y1, x2, y2, radius, isFlipped, angleA, angleB);
    case 'free_curve':
      return getFreeCurvePath(x1, y1, x2, y2, waypoints);
    default:
      return get135BendPath(x1, y1, x2, y2, radius, isFlipped);
  }
}
