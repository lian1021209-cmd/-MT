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
  Palette, 
  Maximize2, 
  Sparkles,
  FileCode,
  Eye,
  FileText,
  ExternalLink,
  Printer,
  Compass
} from 'lucide-react';
import { Station, Connection, EffectiveTheme } from '../types/metro';
import { exportMetroCanvasToPng, triggerPngDownload } from '../utils/exportImage';
import { exportMetroCanvasToPdf, triggerPdfDownload } from '../utils/exportPdf';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  connections: Connection[];
  theme: EffectiveTheme;
  onExportJSON: () => void;
  initialFormat?: 'pdf' | 'png';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  stations,
  connections,
  theme,
  onExportJSON,
  initialFormat = 'pdf',
}) => {
  const isLight = theme === 'light';

  // Format Switcher: PDF (jsPDF vector) vs PNG (canvas.toDataURL)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png'>(initialFormat);

  // Common Options
  const [scope, setScope] = useState<'full' | 'viewport'>('full');
  const [background, setBackground] = useState<'theme' | 'white' | 'dark' | 'transparent'>('theme');

  // PNG Specific Options
  const [scale, setScale] = useState<number>(2);

  // PDF Specific Options (jsPDF)
  const [pageSize, setPageSize] = useState<'fit' | 'a4' | 'a3'>('fit');
  const [orientation, setOrientation] = useState<'auto' | 'landscape' | 'portrait'>('auto');

  // States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pngSuccess, setPngSuccess] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Set initial format if changed from props
  useEffect(() => {
    if (isOpen && initialFormat) {
      setExportFormat(initialFormat);
    }
  }, [isOpen, initialFormat]);

  // Generate preview when modal opens or options change
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
          scale: 1, // 1x for fast interactive preview
          theme,
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

    // Debounce preview rendering
    const timer = setTimeout(generatePreview, 120);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, scope, background, theme, stations, connections]);

  // Handle Export to PDF using jsPDF + svg2pdf
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

  // Handle Preview PDF in a new tab / direct print dialog
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
      });
      window.open(result.blobUrl, '_blank');
    } catch (err) {
      console.error('Failed to open PDF preview:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle Download PNG using canvas.toDataURL()
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

  // Handle Copy PNG to Clipboard
  const handleCopyToClipboard = async () => {
    const svg = document.getElementById('metro-canvas-svg') as SVGSVGElement | null;
    if (!svg) return;

    try {
      const result = await exportMetroCanvasToPng(svg, stations, connections, {
        scope,
        background,
        scale: Math.min(scale, 2),
        theme,
      });

      const res = await fetch(result.dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy PNG to clipboard:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all max-h-[92vh] ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-3.5 border-b shrink-0 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              exportFormat === 'pdf'
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}>
              {exportFormat === 'pdf' ? (
                <FileText className="w-5 h-5" />
              ) : (
                <ImageIcon className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>{exportFormat === 'pdf' ? '匯出為 PDF 向量文件' : '匯出為 PNG 圖片'}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                  exportFormat === 'pdf'
                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}>
                  {exportFormat === 'pdf' ? 'jsPDF + svg2pdf' : 'canvas.toDataURL()'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {exportFormat === 'pdf'
                  ? '利用 jsPDF 將 MetroCanvas SVG 結構轉為原生向量 PDF，支援精準列印與大型輸出'
                  : '將目前地鐵路網繪圖轉化為高畫質點陣圖，支援自訂範圍、背景與解析度'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className={`px-6 py-2 border-b flex items-center justify-between gap-3 text-xs shrink-0 ${
          isLight ? 'bg-slate-100/60 border-slate-200' : 'bg-slate-950/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">匯出格式:</span>
            {/* Tab: PDF */}
            <button
              type="button"
              onClick={() => setExportFormat('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                exportFormat === 'pdf'
                  ? 'bg-red-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF 向量文件</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-normal ${
                exportFormat === 'pdf' ? 'bg-red-700/80 text-white' : 'bg-red-500/10 text-red-500'
              }`}>
                推薦印刷
              </span>
            </button>

            {/* Tab: PNG */}
            <button
              type="button"
              onClick={() => setExportFormat('png')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                exportFormat === 'png'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>PNG 圖片</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                exportFormat === 'png' ? 'bg-emerald-700/80 text-white' : 'bg-emerald-500/10 text-emerald-500'
              }`}>
                .toDataURL
              </span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
            {exportFormat === 'pdf' ? '📐 向量格式 (無限縮放無鋸齒)' : '🖼️ 點陣影像 (支援透明背景)'}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Preview Canvas Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                即時輸出預覽
              </span>
              {imgDimensions && (
                <span className="font-mono text-[11px] text-slate-400">
                  {exportFormat === 'pdf' ? (
                    <>
                      路網畫布: {imgDimensions.width} × {imgDimensions.height} pt ·{' '}
                      {pageSize === 'fit' ? '自適應滿版' : pageSize.toUpperCase()}
                    </>
                  ) : (
                    <>
                      輸出解析度: {imgDimensions.width * scale} × {imgDimensions.height * scale} px ({scale}x)
                    </>
                  )}
                </span>
              )}
            </div>

            <div
              className={`relative h-52 rounded-xl border overflow-hidden flex items-center justify-center p-2 transition-colors ${
                background === 'transparent'
                  ? 'bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:12px_12px] bg-slate-100 dark:bg-slate-950'
                  : isLight
                  ? 'bg-slate-100 border-slate-200'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              {isGenerating ? (
                <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                  <span className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  <span>渲染輸出預覽中...</span>
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Metro Network Export Preview"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : (
                <span className="text-xs text-slate-400">畫布尚無路網資料</span>
              )}

              {/* Vector Badge overlay in preview for PDF mode */}
              {exportFormat === 'pdf' && (
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-red-600 text-white shadow-xs pointer-events-none flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Vector PDF</span>
                </div>
              )}
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Scope Option */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
                匯出範圍
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setScope('full')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    scope === 'full'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  完整路網
                </button>
                <button
                  type="button"
                  onClick={() => setScope('viewport')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    scope === 'viewport'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  目前視野
                </button>
              </div>
            </div>

            {/* 2. Background Option */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-pink-500" />
                背景樣式
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setBackground('theme')}
                  className={`px-2 py-1.5 font-medium rounded-lg transition-all cursor-pointer ${
                    background === 'theme'
                      ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  跟隨主題
                </button>
                <button
                  type="button"
                  onClick={() => setBackground('white')}
                  className={`px-2 py-1.5 font-medium rounded-lg transition-all cursor-pointer ${
                    background === 'white'
                      ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  純白背景
                </button>
                <button
                  type="button"
                  onClick={() => setBackground('dark')}
                  className={`px-2 py-1.5 font-medium rounded-lg transition-all cursor-pointer ${
                    background === 'dark'
                      ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  深色科技
                </button>
                <button
                  type="button"
                  onClick={() => setBackground('transparent')}
                  className={`px-2 py-1.5 font-medium rounded-lg transition-all cursor-pointer ${
                    background === 'transparent'
                      ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  透明 / 無底色
                </button>
              </div>
            </div>

            {/* 3. Format-specific option: PDF Page Size vs PNG Scale */}
            {exportFormat === 'pdf' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-red-500" />
                    紙張規格 (jsPDF)
                  </span>
                  {pageSize !== 'fit' && (
                    <button
                      type="button"
                      onClick={() =>
                        setOrientation((prev) => (prev === 'landscape' ? 'portrait' : 'landscape'))
                      }
                      className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                      title="切換頁面方向"
                    >
                      <Compass className="w-3 h-3" />
                      <span>{orientation === 'landscape' ? '橫向' : orientation === 'portrait' ? '直向' : '自動方向'}</span>
                    </button>
                  )}
                </label>

                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
                  {[
                    { id: 'fit', label: '自適應' },
                    { id: 'a4', label: 'A4 規格' },
                    { id: 'a3', label: 'A3 海報' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPageSize(item.id as 'fit' | 'a4' | 'a3')}
                      className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                        pageSize === item.id
                          ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-400">
                  {pageSize === 'fit' && '無邊界貼合路網範圍，最適合數位分享與任意縮放'}
                  {pageSize === 'a4' && '210 × 297 mm，符合標準辦公室或家用印表機'}
                  {pageSize === 'a3' && '297 × 420 mm，大尺寸適合車站掛圖與海報印刷'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  解析度倍率 (PNG)
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
                  {[
                    { value: 1, label: '1x 標準' },
                    { value: 2, label: '2x 高清' },
                    { value: 3, label: '3x 超清' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setScale(s.value)}
                      className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                        scale === s.value
                          ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  {scale === 1 && '適合一般網頁或通訊軟體輕量分享'}
                  {scale === 2 && 'Retina 雙倍清晰，線條字體皆極致銳利'}
                  {scale === 3 && '300 DPI 超高清，適合大螢幕與簡報使用'}
                </p>
              </div>
            )}
          </div>

          {/* PDF Feature Banner */}
          {exportFormat === 'pdf' && (
            <div className={`p-3 rounded-xl border flex items-start gap-3 ${
              isLight
                ? 'bg-red-50/70 border-red-200/80 text-red-950'
                : 'bg-red-950/20 border-red-900/50 text-red-200'
            }`}>
              <FileText className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-semibold text-red-600 dark:text-red-400">
                  向量 PDF 匯出優勢 (jsPDF & svg2pdf)
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  將畫布轉為純向量 PDF 文件，車站節點、多色路線轉折與站名文字均為數學向量路徑。無論放大至任何比例或列印成海報尺寸，字體與線條均無失真模糊。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          {/* JSON Export Option */}
          <button
            type="button"
            onClick={onExportJSON}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer border ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="匯出完整路網資料結構 (JSON)"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-400" />
            <span>匯出 JSON 資料</span>
          </button>

          {/* Dynamic Actions based on Format */}
          <div className="flex items-center gap-2.5">
            {exportFormat === 'pdf' ? (
              <>
                {/* Preview in new tab */}
                <button
                  type="button"
                  onClick={handlePreviewPDF}
                  disabled={isExportingPdf}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer border ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="在新分頁開啟 PDF 檢視或直接調用印表機"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>新分頁預覽 / 列印</span>
                </button>

                {/* Download PDF Button */}
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isExportingPdf}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all shadow-md cursor-pointer ${
                    pdfSuccess
                      ? 'bg-emerald-600'
                      : 'bg-red-600 hover:bg-red-500 active:scale-[0.98] shadow-red-600/25'
                  }`}
                >
                  {isExportingPdf ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>正在產生向量 PDF...</span>
                    </>
                  ) : pdfSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>PDF 下載成功！</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>下載 PDF 文件 (.pdf)</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Copy PNG */}
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer border ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">已複製至剪貼簿！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>複製圖片</span>
                    </>
                  )}
                </button>

                {/* Download PNG Button */}
                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  disabled={isGenerating}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all shadow-md cursor-pointer ${
                    pngSuccess
                      ? 'bg-emerald-600'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] shadow-emerald-600/25'
                  }`}
                >
                  {pngSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>下載成功！</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>下載 PNG 圖片 (toDataURL)</span>
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
