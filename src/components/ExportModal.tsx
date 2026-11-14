/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Image as ImageIcon,
  Copy,
  Check,
  FileCode,
  FileText,
  ExternalLink,
  FileSpreadsheet,
} from 'lucide-react';
import { Station, Connection, CanvasImage, CanvasText, EffectiveTheme } from '../types/metro';
import { exportMetroCanvasToPng, triggerPngDownload } from '../utils/exportImage';
import { exportMetroCanvasToPdf, triggerPdfDownload } from '../utils/exportPdf';
import {
  buildMetroNetworkCsv,
  triggerCsvDownload,
  CsvExportScope,
} from '../utils/exportCsv';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  connections: Connection[];
  svgImages?: CanvasImage[];
  svgTexts?: CanvasText[];
  theme: EffectiveTheme;
  onExportJSON: () => void;
  initialFormat?: 'pdf' | 'png' | 'csv';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  stations,
  connections,
  svgImages = [],
  svgTexts = [],
  theme,
  onExportJSON,
  initialFormat = 'pdf',
}) => {
  const isLight = theme === 'light';

  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'csv'>(initialFormat);
  const [scope, setScope] = useState<'full' | 'viewport'>('full');
  const [background, setBackground] = useState<'theme' | 'white' | 'dark' | 'transparent'>('theme');
  const [scale, setScale] = useState<number>(2);
  const [pageSize, setPageSize] = useState<'fit' | 'a4' | 'a3'>('fit');
  const [orientation, setOrientation] = useState<'auto' | 'landscape' | 'portrait'>('auto');
  const [csvScope, setCsvScope] = useState<CsvExportScope>('all');

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pngSuccess, setPngSuccess] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [csvSuccess, setCsvSuccess] = useState(false);
  const [csvCopied, setCsvCopied] = useState(false);

  const csvData = React.useMemo(
    () => buildMetroNetworkCsv(stations, connections, csvScope),
    [stations, connections, csvScope]
  );

  useEffect(() => {
    if (isOpen && initialFormat) {
      setExportFormat(initialFormat);
    }
  }, [isOpen, initialFormat]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const generatePreview = async () => {
      const svg = document.getElementById('metro-canvas-svg') as SVGSVGElement | null;
      if (!svg) return;

      setIsGenerating(true);
      try {
        const result = await exportMetroCanvasToPng(svg, stations, connections, {
          scope,
          background,
          scale: 1,
          theme,
          svgImages,
          svgTexts,
        });

        if (isMounted) {
          setPreviewUrl(result.dataUrl);
          setImgDimensions({
            width: result.width,
            height: result.height,
          });
        }
      } catch (err) {
        console.error('Failed to generate export preview:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    const timer = setTimeout(generatePreview, 120);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, scope, background, theme, stations, connections, svgImages, svgTexts]);

  const handleDownloadPDF = async () => {
    const svg = document.getElementById('metro-canvas-svg') as SVGSVGElement | null;
    if (!svg) return;

    setIsExportingPdf(true);
    try {
      const result = await exportMetroCanvasToPdf(svg, stations, connections, {
        scope,
        background,
        pageSize,
        orientation,
        theme,
        svgImages,
        svgTexts,
      });

      triggerPdfDownload(result.pdf, `metro-map-${Date.now()}.pdf`);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePreviewPDF = async () => {
    const svg = document.getElementById('metro-canvas-svg') as SVGSVGElement | null;
    if (!svg) return;

    setIsExportingPdf(true);
    try {
      const result = await exportMetroCanvasToPdf(svg, stations, connections, {
        scope,
        background,
        pageSize,
        orientation,
        theme,
        svgImages,
        svgTexts,
      });
      window.open(result.blobUrl, '_blank');
    } catch (err) {
      console.error('Failed to open PDF preview:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadPNG = async () => {
    const svg = document.getElementById('metro-canvas-svg') as SVGSVGElement | null;
    if (!svg) return;

    setIsGenerating(true);
    try {
      const result = await exportMetroCanvasToPng(svg, stations, connections, {
        scope,
        background,
        scale,
        theme,
        svgImages,
        svgTexts,
      });

      triggerPngDownload(result.dataUrl, `metro-map-${Date.now()}.png`);
      setPngSuccess(true);
      setTimeout(() => setPngSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export PNG:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    const svg = document.getElementById('metro-canvas-svg') as SVGSVGElement | null;
    if (!svg) return;

    try {
      const result = await exportMetroCanvasToPng(svg, stations, connections, {
        scope,
        background,
        scale: Math.min(scale, 2),
        theme,
        svgImages,
        svgTexts,
      });

      const res = await fetch(result.dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy PNG to clipboard:', err);
    }
  };

  const handleDownloadCSV = (targetScope: CsvExportScope = csvScope) => {
    const result =
      targetScope === csvScope
        ? csvData
        : buildMetroNetworkCsv(stations, connections, targetScope);
    const ts = Date.now();
    const suffix =
      targetScope === 'stations'
        ? 'stations'
        : targetScope === 'connections'
        ? 'connections'
        : 'network';
    triggerCsvDownload(result.csvText, `metro-${suffix}-${ts}.csv`);
    setCsvSuccess(true);
    setTimeout(() => setCsvSuccess(false), 2500);
  };

  const handleDownloadBothCsv = () => {
    const ts = Date.now();
    const stCsv = buildMetroNetworkCsv(stations, connections, 'stations');
    const connCsv = buildMetroNetworkCsv(stations, connections, 'connections');
    triggerCsvDownload(stCsv.csvText, `metro-stations-${ts}.csv`);
    setTimeout(() => {
      triggerCsvDownload(connCsv.csvText, `metro-connections-${ts}.csv`);
    }, 120);
    setCsvSuccess(true);
    setTimeout(() => setCsvSuccess(false), 2500);
  };

  const handleCopyCSV = async () => {
    try {
      await navigator.clipboard.writeText(csvData.csvText.replace(/^\uFEFF/, ''));
      setCsvCopied(true);
      setTimeout(() => setCsvCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy CSV to clipboard:', err);
    }
  };

  if (!isOpen) return null;

  const borderCol = isLight ? 'border-zinc-200' : 'border-zinc-800';
  const textHeading = isLight ? 'text-zinc-900' : 'text-zinc-100';
  const textMuted = isLight ? 'text-zinc-500' : 'text-zinc-400';

  const segContainer = `grid gap-1 p-0.5 rounded-md border ${
    isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
  }`;

  const segBtn = (active: boolean) =>
    `px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
      active
        ? isLight
          ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
          : 'bg-zinc-800 text-zinc-100 font-semibold'
        : isLight
        ? 'text-zinc-500 hover:text-zinc-900'
        : 'text-zinc-400 hover:text-zinc-200'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs select-none">
      <div
        className={`relative w-full max-w-2xl rounded-xl shadow-2xl border flex flex-col overflow-hidden max-h-[90vh] ${
          isLight
            ? 'bg-white border-zinc-200 text-zinc-800'
            : 'bg-[#111113] border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${borderCol}`}>
          <div>
            <h2 className={`text-base font-semibold tracking-tight ${textHeading}`}>
              匯出路網
            </h2>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              向量 PDF、高解析 PNG 圖片、CSV 表格或結構化 JSON 資料
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              isLight ? 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800' : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
            }`}
            title="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Tabs */}
        <div className={`px-6 py-2.5 border-b flex items-center justify-between gap-4 text-xs shrink-0 ${borderCol}`}>
          <div className={`inline-flex p-0.5 rounded-md border ${isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <button
              type="button"
              onClick={() => setExportFormat('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                exportFormat === 'pdf'
                  ? isLight
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'bg-zinc-800 text-zinc-100 font-semibold'
                  : textMuted
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF 向量</span>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('png')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                exportFormat === 'png'
                  ? isLight
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'bg-zinc-800 text-zinc-100 font-semibold'
                  : textMuted
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>PNG 圖片</span>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                exportFormat === 'csv'
                  ? isLight
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'bg-zinc-800 text-zinc-100 font-semibold'
                  : textMuted
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV 表格</span>
            </button>
          </div>

          {exportFormat === 'csv' ? (
            <span className={`font-mono text-[11px] tabular-nums ${textMuted}`}>
              {csvData.rows.length} 筆資料 · {csvData.headers.length} 欄 · UTF-8 BOM
            </span>
          ) : (
            imgDimensions && (
              <span className={`font-mono text-[11px] tabular-nums ${textMuted}`}>
                {exportFormat === 'pdf'
                  ? `${imgDimensions.width} × ${imgDimensions.height} pt · ${pageSize === 'fit' ? '自適應' : pageSize.toUpperCase()}`
                  : `${imgDimensions.width * scale} × ${imgDimensions.height * scale} · ${scale}×`}
              </span>
            )
          )}
        </div>

        {/* Content Body */}
        {exportFormat === 'csv' ? (
          <div className="p-6 overflow-y-auto space-y-4">
            {/* CSV Scope Selector + Stats */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <label className={`text-xs font-medium block ${textHeading}`}>匯出資料內容</label>
                <div className={`${segContainer} grid-cols-3`}>
                  <button
                    type="button"
                    onClick={() => setCsvScope('all')}
                    className={segBtn(csvScope === 'all')}
                  >
                    合併全部 ({stations.length + connections.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCsvScope('stations')}
                    className={segBtn(csvScope === 'stations')}
                  >
                    僅節點 ({stations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCsvScope('connections')}
                    className={segBtn(csvScope === 'connections')}
                  >
                    僅連線 ({connections.length})
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadBothCsv}
                disabled={stations.length === 0 && connections.length === 0}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap ${
                  isLight
                    ? 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
                title="分別下載 stations 與 connections 兩份獨立 CSV"
              >
                雙檔分開下載
              </button>
            </div>

            {/* Data Table Preview */}
            <div className={`rounded-lg border overflow-hidden ${borderCol}`}>
              <div
                className={`px-3 py-2 border-b flex items-center justify-between text-[11px] ${borderCol} ${
                  isLight ? 'bg-zinc-50 text-zinc-600' : 'bg-zinc-900/60 text-zinc-400'
                }`}
              >
                <span>欄位預覽 (含 Excel UTF-8 BOM 防亂碼與坐標／長度統計)</span>
                <span className="font-mono tabular-nums">
                  顯示前 {Math.min(8, csvData.rows.length)} / {csvData.rows.length} 筆
                </span>
              </div>

              {csvData.rows.length === 0 ? (
                <div className={`py-10 text-center text-xs ${textMuted}`}>
                  目前畫布尚無節點或連線資料可匯出
                </div>
              ) : (
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left border-collapse text-[11px] font-mono tabular-nums">
                    <thead>
                      <tr className={`border-b ${borderCol} ${isLight ? 'bg-zinc-50/80 text-zinc-600' : 'bg-zinc-900/40 text-zinc-400'}`}>
                        {csvData.headers.slice(0, 8).map((h) => (
                          <th key={h} className="px-2.5 py-1.5 font-semibold whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                        {csvData.headers.length > 8 && (
                          <th className={`px-2.5 py-1.5 font-normal whitespace-nowrap ${textMuted}`}>
                            +{csvData.headers.length - 8} 欄
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-zinc-100' : 'divide-zinc-800/70'}`}>
                      {csvData.rows.slice(0, 8).map((row, rIdx) => (
                        <tr
                          key={`csv-row-${rIdx}`}
                          className={isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900/40'}
                        >
                          {row.slice(0, 8).map((cell, cIdx) => (
                            <td
                              key={`csv-cell-${rIdx}-${cIdx}`}
                              className={`px-2.5 py-1.5 whitespace-nowrap max-w-[140px] truncate ${
                                cIdx === 0 ? textHeading : textMuted
                              }`}
                              title={cell}
                            >
                              {cell || '—'}
                            </td>
                          ))}
                          {csvData.headers.length > 8 && (
                            <td className={`px-2.5 py-1.5 ${textMuted}`}>…</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <p className={`text-[11px] leading-relaxed ${textMuted}`}>
              支援直接以 Microsoft Excel、Google Sheets、QGIS 或 Python Pandas 開啟，連線資料已自動關聯起終點坐標 (from_x, from_y, to_x, to_y) 與計算線段長度 (segment_length)。
            </p>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Preview Box */}
            <div
              className={`relative h-52 rounded-lg border overflow-hidden flex items-center justify-center p-3 ${
                background === 'transparent'
                  ? 'bg-[radial-gradient(#a1a1aa_1px,transparent_1px)] [background-size:12px_12px] bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800'
                  : isLight
                  ? 'bg-zinc-50 border-zinc-200'
                  : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              {isGenerating ? (
                <div className={`flex flex-col items-center gap-2 text-xs ${textMuted}`}>
                  <span className="w-4 h-4 border-2 border-zinc-400/30 border-t-zinc-500 rounded-full animate-spin" />
                  <span>產生預覽中...</span>
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Metro Network Export Preview"
                  className="max-h-full max-w-full object-contain rounded"
                />
              ) : (
                <span className={`text-xs ${textMuted}`}>畫布尚無路網資料</span>
              )}
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Scope */}
              <div className="space-y-1.5">
                <label className={`text-xs font-medium block ${textHeading}`}>匯出範圍</label>
                <div className={`${segContainer} grid-cols-2`}>
                  <button type="button" onClick={() => setScope('full')} className={segBtn(scope === 'full')}>
                    完整路網
                  </button>
                  <button type="button" onClick={() => setScope('viewport')} className={segBtn(scope === 'viewport')}>
                    目前視野
                  </button>
                </div>
              </div>

              {/* 2. Background */}
              <div className="space-y-1.5">
                <label className={`text-xs font-medium block ${textHeading}`}>背景</label>
                <div className={`${segContainer} grid-cols-2`}>
                  <button type="button" onClick={() => setBackground('theme')} className={segBtn(background === 'theme')}>
                    跟隨主題
                  </button>
                  <button type="button" onClick={() => setBackground('white')} className={segBtn(background === 'white')}>
                    純白
                  </button>
                  <button type="button" onClick={() => setBackground('dark')} className={segBtn(background === 'dark')}>
                    深色
                  </button>
                  <button type="button" onClick={() => setBackground('transparent')} className={segBtn(background === 'transparent')}>
                    透明
                  </button>
                </div>
              </div>

              {/* 3. Format-specific */}
              {exportFormat === 'pdf' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-medium ${textHeading}`}>紙張規格</label>
                    {pageSize !== 'fit' && (
                      <button
                        type="button"
                        onClick={() => setOrientation((prev) => (prev === 'landscape' ? 'portrait' : 'landscape'))}
                        className={`text-[11px] underline cursor-pointer ${textMuted} hover:text-zinc-900 dark:hover:text-zinc-100`}
                      >
                        {orientation === 'landscape' ? '橫向' : orientation === 'portrait' ? '直向' : '自動方向'}
                      </button>
                    )}
                  </div>
                  <div className={`${segContainer} grid-cols-3`}>
                    {[
                      { id: 'fit', label: '自適應' },
                      { id: 'a4', label: 'A4' },
                      { id: 'a3', label: 'A3' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPageSize(item.id as 'fit' | 'a4' | 'a3')}
                        className={segBtn(pageSize === item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className={`text-xs font-medium block ${textHeading}`}>解析度倍率</label>
                  <div className={`${segContainer} grid-cols-3`}>
                    {[
                      { value: 1, label: '1×' },
                      { value: 2, label: '2×' },
                      { value: 3, label: '3×' },
                    ].map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setScale(s.value)}
                        className={`${segBtn(scale === s.value)} font-mono tabular-nums`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className={`flex items-center justify-between gap-2 px-6 py-4 border-t shrink-0 ${borderCol}`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportJSON}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer border ${
                isLight
                  ? 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>匯出 JSON</span>
            </button>

            {exportFormat !== 'csv' && (
              <button
                type="button"
                onClick={() => handleDownloadCSV('all')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer border ${
                  isLight
                    ? 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
                title="一鍵下載節點與連線完整 CSV 表格"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>匯出 CSV</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {exportFormat === 'csv' ? (
              <>
                <button
                  type="button"
                  onClick={handleCopyCSV}
                  disabled={csvData.rows.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer border disabled:opacity-40 ${
                    isLight
                      ? 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                  }`}
                >
                  {csvCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">已複製</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>複製 CSV</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadCSV(csvScope)}
                  disabled={csvData.rows.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-40 ${
                    csvSuccess
                      ? 'bg-emerald-600 text-white'
                      : isLight
                      ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                      : 'bg-zinc-100 hover:bg-white text-zinc-900'
                  }`}
                >
                  {csvSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>已下載 CSV</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>下載 CSV</span>
                    </>
                  )}
                </button>
              </>
            ) : exportFormat === 'pdf' ? (
              <>
                <button
                  type="button"
                  onClick={handlePreviewPDF}
                  disabled={isExportingPdf}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer border ${
                    isLight
                      ? 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>新分頁預覽</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isExportingPdf}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    pdfSuccess
                      ? 'bg-emerald-600 text-white'
                      : isLight
                      ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                      : 'bg-zinc-100 hover:bg-white text-zinc-900'
                  }`}
                >
                  {isExportingPdf ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      <span>產生中...</span>
                    </>
                  ) : pdfSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>已下載 PDF</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>下載 PDF</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer border ${
                    isLight
                      ? 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">已複製</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>複製圖片</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  disabled={isGenerating}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    pngSuccess
                      ? 'bg-emerald-600 text-white'
                      : isLight
                      ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                      : 'bg-zinc-100 hover:bg-white text-zinc-900'
                  }`}
                >
                  {pngSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>已下載 PNG</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>下載 PNG</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
