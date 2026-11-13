/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { Station, Connection, EffectiveTheme } from '../types/metro';

export interface ExportPdfOptions {
  scope?: 'full' | 'viewport';
  background?: 'theme' | 'white' | 'dark' | 'transparent';
  pageSize?: 'fit' | 'a4' | 'a3';
  orientation?: 'auto' | 'landscape' | 'portrait';
  filename?: string;
  theme?: EffectiveTheme;
}

export interface ExportPdfResult {
  pdf: jsPDF;
  blob: Blob;
  blobUrl: string;
  pageWidth: number;
  pageHeight: number;
}

/**
 * Prepares an SVG element for export (cloning, stripping non-export elements, inlining styles, and bounds).
 */
export function prepareSvgForExport(
  svgElement: SVGSVGElement,
  stations: Station[] = [],
  connections: Connection[] = [],
  scope: 'full' | 'viewport' = 'full'
): { clone: SVGSVGElement; width: number; height: number; viewBox: string } {
  // 1. Deep clone the SVG element
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // 2. Remove non-exportable interactive UI elements (selection rings, guides, HUDs, marquee)
  const ignoredElements = clone.querySelectorAll(
    '.export-ignore, .animate-pulse, [data-export-ignore="true"]'
  );
  ignoredElements.forEach((el) => el.remove());

  const transparentCircles = clone.querySelectorAll('circle[fill="transparent"]');
  transparentCircles.forEach((el) => el.remove());

  // 3. Inject embedded fonts & CSS
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

  let viewBoxStr = '';

  if (scope === 'full' && stations.length > 0) {
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

      const lblScale = st.labelScale ?? 1;
      if (st.labelOffset) {
        minX = Math.min(minX, st.x + st.labelOffset.x - 45 * lblScale);
        maxX = Math.max(maxX, st.x + st.labelOffset.x + 45 * lblScale);
        minY = Math.min(minY, st.y + st.labelOffset.y - 25 * lblScale);
        maxY = Math.max(maxY, st.y + st.labelOffset.y + 25 * lblScale);
      } else if (!st.isVirtual && lblScale > 1) {
        minX = Math.min(minX, st.x - 45 * lblScale);
        maxX = Math.max(maxX, st.x + 45 * lblScale);
        minY = Math.min(minY, st.y - 25 * lblScale);
        maxY = Math.max(maxY, st.y + 25 * lblScale);
      }
    });

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

    const padding = 80;
    const contentW = Math.max(maxX - minX, 100);
    const contentH = Math.max(maxY - minY, 100);

    const mapX = minX - padding;
    const mapY = minY - padding;
    exportWidth = Math.round(contentW + padding * 2);
    exportHeight = Math.round(contentH + padding * 2);

    viewBoxStr = `${mapX} ${mapY} ${exportWidth} ${exportHeight}`;
    clone.setAttribute('viewBox', viewBoxStr);
    clone.setAttribute('width', `${exportWidth}`);
    clone.setAttribute('height', `${exportHeight}`);

    // Reset world translate transform so elements are drawn directly in world coordinates
    const mainGroup = clone.querySelector('g[transform*="translate"]');
    if (mainGroup) {
      mainGroup.setAttribute('transform', 'translate(0, 0) scale(1)');
    }
  } else {
    exportWidth = Math.round(viewportWidth);
    exportHeight = Math.round(viewportHeight);
    viewBoxStr = `0 0 ${exportWidth} ${exportHeight}`;
    clone.setAttribute('viewBox', viewBoxStr);
    clone.setAttribute('width', `${exportWidth}`);
    clone.setAttribute('height', `${exportHeight}`);
  }

  return { clone, width: exportWidth, height: exportHeight, viewBox: viewBoxStr };
}

/**
 * Exports the MetroCanvas SVG structure to a high-quality vector PDF document using jsPDF & svg2pdf.
 */
export async function exportMetroCanvasToPdf(
  svgElement: SVGSVGElement,
  stations: Station[] = [],
  connections: Connection[] = [],
  options: ExportPdfOptions = {}
): Promise<ExportPdfResult> {
  const {
    scope = 'full',
    background = 'theme',
    pageSize = 'fit',
    orientation: userOrientation = 'auto',
    theme = 'dark',
  } = options;

  const isLight = theme === 'light';

  // 1. Prepare SVG clone
  const { clone, width: svgWidth, height: svgHeight } = prepareSvgForExport(
    svgElement,
    stations,
    connections,
    scope
  );

  // 2. Temporarily mount cloned SVG to DOM for svg2pdf to calculate accurate bounding boxes & styles
  clone.style.position = 'absolute';
  clone.style.left = '-99999px';
  clone.style.top = '-99999px';
  clone.style.width = `${svgWidth}px`;
  clone.style.height = `${svgHeight}px`;
  clone.style.visibility = 'hidden';
  clone.style.pointerEvents = 'none';
  document.body.appendChild(clone);

  try {
    // 3. Determine Page Dimensions & Orientation
    let effectiveOrientation: 'landscape' | 'portrait' = 'landscape';
    if (userOrientation === 'auto') {
      effectiveOrientation = svgWidth >= svgHeight ? 'landscape' : 'portrait';
    } else {
      effectiveOrientation = userOrientation;
    }

    let pageWidth = svgWidth;
    let pageHeight = svgHeight;
    let renderX = 0;
    let renderY = 0;
    let renderW = svgWidth;
    let renderH = svgHeight;

    if (pageSize === 'a4' || pageSize === 'a3') {
      // Standard dimensions in points (pt)
      // A4: 595.28 x 841.89 pt
      // A3: 841.89 x 1190.55 pt
      const baseW = pageSize === 'a4' ? 595.28 : 841.89;
      const baseH = pageSize === 'a4' ? 841.89 : 1190.55;

      pageWidth = effectiveOrientation === 'landscape' ? baseH : baseW;
      pageHeight = effectiveOrientation === 'landscape' ? baseW : baseH;

      // Fit SVG into page with margin
      const margin = 28; // ~10mm margin
      const availW = pageWidth - margin * 2;
      const availH = pageHeight - margin * 2;

      const scale = Math.min(availW / svgWidth, availH / svgHeight);
      renderW = svgWidth * scale;
      renderH = svgHeight * scale;
      renderX = (pageWidth - renderW) / 2;
      renderY = (pageHeight - renderH) / 2;
    } else {
      // 'fit' to content: exact size matching SVG dimensions
      pageWidth = svgWidth;
      pageHeight = svgHeight;
      renderX = 0;
      renderY = 0;
      renderW = svgWidth;
      renderH = svgHeight;
    }

    // 4. Create jsPDF instance
    const pdf = new jsPDF({
      orientation: effectiveOrientation,
      unit: 'pt',
      format: [pageWidth, pageHeight],
      compress: true,
    });

    // 5. Draw background in PDF
    let bgHex: string | null = null;
    if (background === 'white') {
      bgHex = '#FFFFFF';
    } else if (background === 'dark') {
      bgHex = '#0F172A';
    } else if (background === 'theme') {
      bgHex = isLight ? '#F8FAFC' : '#0F172A';
    } // if 'transparent', leave background blank

    if (bgHex) {
      const r = parseInt(bgHex.slice(1, 3), 16);
      const g = parseInt(bgHex.slice(3, 5), 16);
      const b = parseInt(bgHex.slice(5, 7), 16);
      pdf.setFillColor(r, g, b);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    }

    // 6. Convert SVG to PDF vectors using svg2pdf
    await svg2pdf(clone, pdf, {
      x: renderX,
      y: renderY,
      width: renderW,
      height: renderH,
    });

    // 7. Generate output Blob & URL
    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    return {
      pdf,
      blob,
      blobUrl,
      pageWidth,
      pageHeight,
    };
  } finally {
    // Always clean up mounted clone
    if (clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  }
}

/**
 * Triggers a download of the given jsPDF instance or blob.
 */
export function triggerPdfDownload(pdf: jsPDF, filename?: string): void {
  const name = filename || `metro-map-${Date.now()}.pdf`;
  pdf.save(name);
}
