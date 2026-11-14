/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Station, Connection, CanvasImage, CanvasText, EffectiveTheme } from '../types/metro';

export interface ExportPngOptions {
  scope?: 'full' | 'viewport';
  background?: 'theme' | 'white' | 'dark' | 'transparent';
  scale?: number; // e.g. 1, 2 (Retina/HD), 3
  filename?: string;
  theme?: EffectiveTheme;
  svgImages?: CanvasImage[];
  svgTexts?: CanvasText[];
}

export interface ExportResult {
  dataUrl: string;
  width: number;
  height: number;
  blob?: Blob;
}

/**
 * Exports the MetroCanvas SVG element to a PNG image using canvas.toDataURL().
 * Handles styles inlining, element bounds calculation, and high-DPI scaling.
 */
export async function exportMetroCanvasToPng(
  svgElement: SVGSVGElement,
  stations: Station[] = [],
  connections: Connection[] = [],
  options: ExportPngOptions = {}
): Promise<ExportResult> {
  const {
    scope = 'full',
    background = 'theme',
    scale = 2,
    theme = 'dark',
    svgImages = [],
    svgTexts = [],
  } = options;

  const isLight = theme === 'light';

  // 1. Deep clone the SVG element
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // 2. Remove non-exportable interactive UI elements (selection halos, marquee rects, snapping guides)
  const ignoredElements = clone.querySelectorAll('.export-ignore, .animate-pulse, [data-export-ignore="true"]');
  ignoredElements.forEach((el) => el.remove());

  // Also remove pointer event helpers or hit areas that have fill="transparent"
  const transparentHitAreas = clone.querySelectorAll('circle[fill="transparent"], rect[fill="transparent"]');
  transparentHitAreas.forEach((el) => el.remove());

  // 3. Inject embedded CSS rules into SVG defs so text & colors render cleanly in isolated Image context
  let defs = clone.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    clone.insertBefore(defs, clone.firstChild);
  }

  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = `
    text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .fill-white { fill: #ffffff !important; }
    .fill-slate-900 { fill: #0f172a !important; }
    .fill-slate-800 { fill: #1e293b !important; }
    .fill-slate-700 { fill: #334155 !important; }
    .fill-slate-600 { fill: #475569 !important; }
    .fill-slate-500 { fill: #64748b !important; }
    .fill-slate-400 { fill: #94a3b8 !important; }
    .fill-slate-300 { fill: #cbd5e1 !important; }
    .fill-slate-200 { fill: #e2e8f0 !important; }
    .fill-slate-100 { fill: #f1f5f9 !important; }
    .stroke-white { stroke: #ffffff !important; }
    .stroke-slate-900 { stroke: #0f172a !important; }
    .stroke-slate-800 { stroke: #1e293b !important; }
    .stroke-slate-700 { stroke: #334155 !important; }
    .stroke-slate-950 { stroke: #020617 !important; }
  `;
  defs.appendChild(styleEl);

  // 4. In-line computed styles for text elements from original SVG
  const origTexts = svgElement.querySelectorAll('text');
  const cloneTexts = clone.querySelectorAll('text');
  for (let i = 0; i < origTexts.length && i < cloneTexts.length; i++) {
    const orig = origTexts[i];
    const target = cloneTexts[i];
    try {
      const comp = window.getComputedStyle(orig);
      if (comp.fill && comp.fill !== 'none') target.setAttribute('fill', comp.fill);
      if (comp.stroke && comp.stroke !== 'none') target.setAttribute('stroke', comp.stroke);
      if (comp.strokeWidth) target.setAttribute('stroke-width', comp.strokeWidth);
      if (comp.fontSize) target.setAttribute('font-size', comp.fontSize);
      if (comp.fontWeight) target.setAttribute('font-weight', comp.fontWeight);
      if (comp.textAnchor) target.setAttribute('text-anchor', comp.textAnchor);
      if (comp.paintOrder) target.setAttribute('paint-order', comp.paintOrder);
    } catch {
      // Continue if computed style is unavailable
    }
  }

  // 5. Determine export dimensions and viewBox
  let exportWidth = 1200;
  let exportHeight = 800;

  const rect = svgElement.getBoundingClientRect();
  const viewportWidth = rect.width > 0 ? rect.width : 1280;
  const viewportHeight = rect.height > 0 ? rect.height : 800;

  if (scope === 'full' && (stations.length > 0 || svgImages.length > 0 || svgTexts.length > 0)) {
    // Calculate bounding box of all stations, waypoints, images, and texts
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    stations.forEach((st) => {
      const markerHalf =
        (st.isVirtual ? 12 : 18) *
        (st.scale ?? 1) *
        Math.max(st.scaleX ?? 1, st.scaleY ?? 1);
      minX = Math.min(minX, st.x - markerHalf);
      maxX = Math.max(maxX, st.x + markerHalf);
      minY = Math.min(minY, st.y - markerHalf);
      maxY = Math.max(maxY, st.y + markerHalf);

      // Include label offset and labelScale if present
      const lblScale = st.labelScale ?? 1;
      if (st.labelOffset) {
        minX = Math.min(minX, st.x + st.labelOffset.x - 40 * lblScale);
        maxX = Math.max(maxX, st.x + st.labelOffset.x + 40 * lblScale);
        minY = Math.min(minY, st.y + st.labelOffset.y - 20 * lblScale);
        maxY = Math.max(maxY, st.y + st.labelOffset.y + 20 * lblScale);
      } else if (!st.isVirtual && lblScale > 1) {
        minX = Math.min(minX, st.x - 40 * lblScale);
        maxX = Math.max(maxX, st.x + 40 * lblScale);
        minY = Math.min(minY, st.y - 25 * lblScale);
        maxY = Math.max(maxY, st.y + 25 * lblScale);
      }
    });

    svgImages.forEach((img) => {
      const s = img.scale ?? 1;
      const sx = s * (img.scaleX ?? 1);
      const sy = s * (img.scaleY ?? 1);
      const hw = (img.width * sx) / 2;
      const hh = (img.height * sy) / 2;
      const rad = ((img.rotation ?? 0) * Math.PI) / 180;
      const boundHalfW = Math.abs(hw * Math.cos(rad)) + Math.abs(hh * Math.sin(rad));
      const boundHalfH = Math.abs(hw * Math.sin(rad)) + Math.abs(hh * Math.cos(rad));
      minX = Math.min(minX, img.x - boundHalfW);
      maxX = Math.max(maxX, img.x + boundHalfW);
      minY = Math.min(minY, img.y - boundHalfH);
      maxY = Math.max(maxY, img.y + boundHalfH);
    });

    svgTexts.forEach((txt) => {
      const s = txt.scale ?? 1;
      const sx = s * (txt.scaleX ?? 1);
      const sy = s * (txt.scaleY ?? 1);
      const lines = (txt.content || '文字').split('\n');
      const maxChars = Math.max(...lines.map((l) => l.length), 2);
      const estW = maxChars * txt.fontSize * 0.85 * sx;
      const estH = lines.length * txt.fontSize * 1.3 * sy;
      minX = Math.min(minX, txt.x - estW / 2 - 20);
      maxX = Math.max(maxX, txt.x + estW / 2 + 20);
      minY = Math.min(minY, txt.y - estH / 2 - 15);
      maxY = Math.max(maxY, txt.y + estH / 2 + 15);
    });

    // Also include connection waypoints, parallel line offsets, and custom stroke width
    connections.forEach((conn) => {
      const margin = Math.abs(conn.offset ?? 0) + (conn.strokeWidth ?? 6) / 2;
      if (margin > 0) {
        const fromSt = stations.find((s) => s.id === conn.fromStationId);
        const toSt = stations.find((s) => s.id === conn.toStationId);
        if (fromSt) {
          minX = Math.min(minX, fromSt.x - margin);
          maxX = Math.max(maxX, fromSt.x + margin);
          minY = Math.min(minY, fromSt.y - margin);
          maxY = Math.max(maxY, fromSt.y + margin);
        }
        if (toSt) {
          minX = Math.min(minX, toSt.x - margin);
          maxX = Math.max(maxX, toSt.x + margin);
          minY = Math.min(minY, toSt.y - margin);
          maxY = Math.max(maxY, toSt.y + margin);
        }
      }
      if (conn.waypoints) {
        conn.waypoints.forEach((pt) => {
          minX = Math.min(minX, pt.x - margin);
          maxX = Math.max(maxX, pt.x + margin);
          minY = Math.min(minY, pt.y - margin);
          maxY = Math.max(maxY, pt.y + margin);
        });
      }
    });

    // Add generous padding around the entire metro map
    const padding = 90;
    const contentW = Math.max(maxX - minX, 100);
    const contentH = Math.max(maxY - minY, 100);

    const mapX = minX - padding;
    const mapY = minY - padding;
    exportWidth = Math.round(contentW + padding * 2);
    exportHeight = Math.round(contentH + padding * 2);

    // Apply new viewBox & dimensions to the clone
    clone.setAttribute('viewBox', `${mapX} ${mapY} ${exportWidth} ${exportHeight}`);
    clone.setAttribute('width', `${exportWidth}`);
    clone.setAttribute('height', `${exportHeight}`);

    // Find the main transformed group (with viewTransform) and reset its transform
    // so items are drawn at their absolute world coordinates within mapX..mapX+width
    const mainGroup = clone.querySelector('g[transform*="translate"]');
    if (mainGroup) {
      mainGroup.setAttribute('transform', 'translate(0, 0) scale(1)');
    }
  } else {
    // Viewport mode: capture currently visible viewport as-is
    exportWidth = Math.round(viewportWidth);
    exportHeight = Math.round(viewportHeight);
    clone.setAttribute('viewBox', `0 0 ${exportWidth} ${exportHeight}`);
    clone.setAttribute('width', `${exportWidth}`);
    clone.setAttribute('height', `${exportHeight}`);
  }

  // 6. Serialize SVG to XML string
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);

  // Ensure xmlns is present
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // 7. Load SVG into an HTML Image object
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (err) => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error(`Failed to load SVG into Image: ${err}`));
    };
    img.src = blobUrl;
  });

  // 8. Render Image onto HTML5 Canvas element
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(exportWidth * scale);
  canvas.height = Math.round(exportHeight * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(blobUrl);
    throw new Error('Canvas 2D context not supported');
  }

  // Draw background fill
  if (background === 'white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (background === 'dark') {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (background === 'theme') {
    ctx.fillStyle = isLight ? '#F8FAFC' : '#0F172A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } // if transparent, do not fillRect

  // Draw the rendered SVG image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // 9. Call canvas.toDataURL() as requested by user!
  const dataUrl = canvas.toDataURL('image/png');

  // Clean up object URL
  URL.revokeObjectURL(blobUrl);

  return {
    dataUrl,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Triggers a download of the given image data URL as a file.
 */
export function triggerPngDownload(dataUrl: string, filename?: string): void {
  const link = document.createElement('a');
  link.download = filename || `metro-map-${Date.now()}.png`;
  link.href = dataUrl;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
