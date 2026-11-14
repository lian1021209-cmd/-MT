import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer,
  BoxSelect,
  PlusCircle,
  XCircle,
  GitCommit,
  Pipette,
  ImagePlus,
  Type,
} from 'lucide-react';
import { ToolMode, RouteType, EffectiveTheme, CanvasImage } from '../types/metro';
import { getRouteTypeOptions } from './Toolbar';
import { useI18n } from '../i18n/I18nContext';

interface LeftToolbarProps {
  toolMode: ToolMode;
  onSetToolMode: (mode: ToolMode) => void;
  activeRouteType: RouteType;
  onChangeRouteType: (type: RouteType) => void;
  activeColor: string;
  onOpenColorModal: () => void;
  onAddImage?: (img: Omit<CanvasImage, 'id' | 'x' | 'y'>) => void;
  onAddText?: () => void;
  theme?: EffectiveTheme;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  toolMode,
  onSetToolMode,
  activeRouteType,
  onChangeRouteType,
  activeColor,
  onOpenColorModal,
  onAddImage,
  onAddText,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const { t } = useI18n();
  const routeTypeOptions = getRouteTypeOptions(t);
  const [showRouteFlyout, setShowRouteFlyout] = useState(false);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        setShowRouteFlyout(false);
      }
    };
    if (showRouteFlyout) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRouteFlyout]);

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onAddImage) return;
    const baseName = file.name.replace(/\.[^.]+$/, '') || t('canvas.defaultImageName');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const img = new window.Image();
      img.onload = () => {
        const natW = img.naturalWidth > 0 ? img.naturalWidth : 200;
        const natH = img.naturalHeight > 0 ? img.naturalHeight : 200;
        const maxDim = 260;
        const ratio = Math.min(1, maxDim / Math.max(natW, natH));
        const width = Math.max(24, Math.round(natW * ratio));
        const height = Math.max(24, Math.round(natH * ratio));
        onAddImage({
          name: baseName,
          src: dataUrl,
          width,
          height,
          scale: 1,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          opacity: 1,
          zIndex: -1,
          preserveAspectRatio: true,
        });
      };
      img.onerror = () => {
        onAddImage({
          name: baseName,
          src: dataUrl,
          width: 200,
          height: 200,
          scale: 1,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          opacity: 1,
          zIndex: -1,
          preserveAspectRatio: true,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const activeOption = routeTypeOptions.find((o) => o.type === activeRouteType) || routeTypeOptions[0];

  const getToolButtonClass = (active: boolean) =>
    `w-12 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
      active
        ? isLight
          ? 'bg-zinc-900 text-white'
          : 'bg-zinc-100 text-zinc-900'
        : isLight
        ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
    }`;

  return (
    <aside
      aria-label={t('app.title')}
      className={`relative w-14 border-r flex flex-col items-center py-2.5 px-1 select-none shrink-0 h-full z-20 transition-colors ${
        isLight ? 'bg-white border-zinc-200' : 'bg-[#111113] border-zinc-800'
      }`}
    >
      {/* Hidden file input for SVG Image import */}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*,.svg"
        className="hidden"
        onChange={handleImageFileSelect}
      />

      {/* Drawing Mode Tools */}
      <div className="flex flex-col items-center gap-1 w-full">
        <button
          type="button"
          onClick={() => {
            onSetToolMode('select');
            setShowRouteFlyout(false);
          }}
          className={getToolButtonClass(toolMode === 'select')}
          title={t('leftToolbar.selectTip')}
        >
          <MousePointer className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none truncate max-w-[44px]">{t('leftToolbar.select')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSetToolMode('marquee_select');
            setShowRouteFlyout(false);
          }}
          className={getToolButtonClass(toolMode === 'marquee_select')}
          title={t('leftToolbar.marqueeTip')}
        >
          <BoxSelect className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none truncate max-w-[44px]">{t('leftToolbar.marquee')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSetToolMode('add_station');
            setShowRouteFlyout(false);
          }}
          className={getToolButtonClass(toolMode === 'add_station')}
          title={t('leftToolbar.stationTip')}
        >
          <PlusCircle className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none truncate max-w-[44px]">{t('leftToolbar.station')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSetToolMode('add_virtual_node');
            setShowRouteFlyout(false);
          }}
          className={getToolButtonClass(toolMode === 'add_virtual_node')}
          title={t('leftToolbar.virtualNodeTip')}
        >
          <XCircle className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none truncate max-w-[44px]">{t('leftToolbar.virtualNode')}</span>
        </button>

        {/* Connect Nodes Tool with route flyout */}
        <div className="relative w-full flex justify-center">
          <button
            type="button"
            onClick={() => {
              onSetToolMode('connect');
              setShowRouteFlyout((v) => !v);
            }}
            className={`${getToolButtonClass(toolMode === 'connect')} relative`}
            title={t('leftToolbar.connectTip')}
          >
            <GitCommit className="w-4 h-4" />
            <span className="text-[10px] font-medium leading-none truncate max-w-[44px]">{t('leftToolbar.connect')}</span>
            {toolMode === 'connect' && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 text-[9px] font-mono w-4 h-4 rounded flex items-center justify-center border ${
                  isLight
                    ? 'bg-white text-zinc-900 border-zinc-300'
                    : 'bg-zinc-900 text-zinc-100 border-zinc-700'
                }`}
              >
                {activeOption.icon}
              </span>
            )}
          </button>

          {/* Flyout panel for line segment styles */}
          {showRouteFlyout && (
            <div
              ref={flyoutRef}
              className={`absolute left-full ml-2 top-0 z-50 w-52 rounded-lg shadow-lg p-1.5 text-xs border ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-800'
                  : 'bg-[#111113] border-zinc-800 text-zinc-200'
              }`}
            >
              <div
                className={`px-2 py-1.5 text-[11px] font-medium border-b mb-1 flex items-center justify-between ${
                  isLight ? 'text-zinc-500 border-zinc-200' : 'text-zinc-400 border-zinc-800'
                }`}
              >
                <span>{t('leftToolbar.routeModeTitle')}</span>
                <span className="font-mono text-[10px] tabular-nums">{t('leftToolbar.routeCount', { count: 6 })}</span>
              </div>
              <div className="space-y-0.5">
                {routeTypeOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      onChangeRouteType(opt.type);
                      setShowRouteFlyout(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                      activeRouteType === opt.type
                        ? isLight
                          ? 'bg-zinc-900 text-white font-medium'
                          : 'bg-zinc-100 text-zinc-900 font-medium'
                        : isLight
                        ? 'text-zinc-700 hover:bg-zinc-100'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm w-4 text-center">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className={`w-7 h-px my-2.5 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />

      {/* SVG Elements: 導入圖片 & 增加文字 */}
      <div className="flex flex-col items-center gap-1 w-full">
        <button
          type="button"
          onClick={() => {
            setShowRouteFlyout(false);
            imageFileInputRef.current?.click();
          }}
          className={getToolButtonClass(false)}
          title={t('leftToolbar.importImageTip')}
        >
          <ImagePlus className="w-4 h-4" />
          <span className="text-[9.5px] font-medium leading-none whitespace-nowrap truncate max-w-[46px]">{t('leftToolbar.importImage')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowRouteFlyout(false);
            onAddText?.();
          }}
          className={getToolButtonClass(false)}
          title={t('leftToolbar.addTextTip')}
        >
          <Type className="w-4 h-4" />
          <span className="text-[9.5px] font-medium leading-none whitespace-nowrap truncate max-w-[46px]">{t('leftToolbar.addText')}</span>
        </button>
      </div>

      {/* Divider */}
      <div className={`w-7 h-px my-2.5 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />

      {/* Active Color Swatch */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <button
          type="button"
          onClick={onOpenColorModal}
          className={`relative w-9 h-9 rounded-lg border transition-transform hover:scale-105 active:scale-95 flex items-center justify-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 ${
            isLight ? 'border-zinc-300' : 'border-zinc-700'
          }`}
          style={{ backgroundColor: activeColor }}
          title={t('leftToolbar.colorTip', { color: activeColor })}
        >
          <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
            <Pipette className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
        <span className={`text-[9px] font-mono tabular-nums tracking-tight truncate max-w-[46px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {activeColor}
        </span>
      </div>
    </aside>
  );
};
