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
  ChevronDown,
  ChevronUp,
  Hand,
  Grid,
  Crosshair,
  Undo2,
  Redo2,
  Keyboard,
  Check,
  Minus,
} from 'lucide-react';
import {
  ToolMode,
  RouteType,
  EffectiveTheme,
  CanvasImage,
  StationStyle,
  StationVariant,
  StrokeStyle,
} from '../types/metro';
import { CityStationSymbol } from './CityStationSymbol';
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
  defaultStationStyle?: StationStyle;
  defaultStationVariant?: StationVariant;
  defaultStrokeStyle?: StrokeStyle;
  onSelectCityPreset?: (preset: StationStyle) => void;
  onSelectStationVariant?: (variant: StationVariant) => void;
  onApplyCityPresetToAll?: (preset: StationStyle) => void;
  onChangeDefaultStrokeStyle?: (style: StrokeStyle) => void;
  gridSnap?: boolean;
  onToggleGridSnap?: () => void;
  nodeAlign?: boolean;
  onToggleNodeAlign?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
  canRedo?: boolean;
  onRedo?: () => void;
  onOpenShortcuts?: () => void;
}

type ActiveFlyout = 'route' | 'city' | 'line' | null;

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
  defaultStationStyle = 'default',
  defaultStationVariant = 'auto',
  defaultStrokeStyle = 'solid',
  onSelectCityPreset,
  onSelectStationVariant,
  onApplyCityPresetToAll,
  onChangeDefaultStrokeStyle,
  gridSnap = true,
  onToggleGridSnap,
  nodeAlign = false,
  onToggleNodeAlign,
  canUndo = false,
  onUndo,
  canRedo = false,
  onRedo,
  onOpenShortcuts,
}) => {
  const isLight = theme === 'light';
  const { t } = useI18n();
  const routeTypeOptions = getRouteTypeOptions(t);

  const [activeFlyout, setActiveFlyout] = useState<ActiveFlyout>(null);
  const [flyoutTop, setFlyoutTop] = useState<number>(12);
  const [showMoreTools, setShowMoreTools] = useState<boolean>(false);

  const asideRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const moreSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        flyoutRef.current &&
        !flyoutRef.current.contains(target) &&
        asideRef.current &&
        !asideRef.current.contains(target)
      ) {
        setActiveFlyout(null);
      }
    };
    if (activeFlyout) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeFlyout]);

  const openFlyoutForButton = (kind: Exclude<ActiveFlyout, null>, triggerEl: HTMLElement | null, estimatedHeight: number) => {
    if (activeFlyout === kind) {
      setActiveFlyout(null);
      return;
    }
    if (asideRef.current && triggerEl) {
      const asideRect = asideRef.current.getBoundingClientRect();
      const btnRect = triggerEl.getBoundingClientRect();
      const relTop = btnRect.top - asideRect.top;
      const clampedEst = Math.min(estimatedHeight, Math.max(120, asideRect.height - 16));
      const maxTop = Math.max(8, asideRect.height - clampedEst - 8);
      setFlyoutTop(Math.max(8, Math.min(maxTop, relTop)));
    }
    setActiveFlyout(kind);
  };

  const handleToggleShowMore = () => {
    setActiveFlyout(null);
    setShowMoreTools((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(() => {
          moreSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
      return next;
    });
  };

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
    `w-11 min-h-[42px] py-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer shrink-0 ${
      active
        ? isLight
          ? 'bg-zinc-900 text-white'
          : 'bg-zinc-100 text-zinc-900'
        : isLight
        ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
    }`;

  const cityMeta: Record<
    StationStyle,
    { label: string; desc: string; code: string; miniIcon: React.ReactNode; preview: React.ReactNode }
  > = {
    default: {
      label: t('sidebar.cityDefault'),
      desc: t('sidebar.cityDefaultDesc'),
      code: t('leftToolbar.cityCodeDefault'),
      miniIcon: (
        <svg className="w-4 h-4" viewBox="-12 -12 24 24">
          <circle r={5.8} fill="#ffffff" stroke="#0f172a" strokeWidth={2.2} />
        </svg>
      ),
      preview: (
        <svg className="w-14 h-5 shrink-0" viewBox="0 0 56 20">
          <line x1={4} y1={10} x2={52} y2={10} stroke={activeColor} strokeWidth={3.6} strokeLinecap="round" />
          <circle cx={17} cy={10} r={4.2} fill="#ffffff" stroke="#0f172a" strokeWidth={1.8} />
          <circle cx={39} cy={10} r={5.5} fill="#ffffff" stroke="#0f172a" strokeWidth={2} />
          <circle cx={37} cy={10} r={1.8} fill={activeColor} />
          <circle cx={41} cy={10} r={1.8} fill="#2563EB" />
        </svg>
      ),
    },
    beijing: {
      label: t('sidebar.cityBeijing'),
      desc: t('sidebar.cityBeijingDesc'),
      code: t('leftToolbar.cityCodeBeijing'),
      miniIcon: (
        <svg className="w-4 h-4" viewBox="-11 -11 22 22">
          <CityStationSymbol variant="beijing_interchange" />
        </svg>
      ),
      preview: (
        <svg className="w-16 h-6 shrink-0" viewBox="0 0 64 24">
          <line x1={6} y1={12} x2={58} y2={12} stroke={isLight ? '#FFFFFF' : '#09090B'} strokeWidth={6} strokeLinecap="round" />
          <line x1={6} y1={12} x2={58} y2={12} stroke="#E11D48" strokeWidth={3.6} strokeLinecap="round" />
          <g transform="translate(18, 12) scale(0.92)">
            <CityStationSymbol variant="beijing_basic" />
          </g>
          <g transform="translate(44, 12) scale(0.92)">
            <CityStationSymbol variant="beijing_interchange" />
          </g>
        </svg>
      ),
    },
    shanghai: {
      label: t('sidebar.cityShanghai'),
      desc: t('sidebar.cityShanghaiDesc'),
      code: t('leftToolbar.cityCodeShanghai'),
      miniIcon: (
        <svg className="w-4 h-4" viewBox="-11 -11 22 22">
          <CityStationSymbol variant="shanghai_interchange" />
        </svg>
      ),
      preview: (
        <svg className="w-16 h-6 shrink-0" viewBox="0 0 64 24">
          <line x1={6} y1={12} x2={58} y2={12} stroke={isLight ? '#FFFFFF' : '#09090B'} strokeWidth={5.5} strokeLinecap="round" />
          <line x1={6} y1={12} x2={58} y2={12} stroke="#2563EB" strokeWidth={3.6} strokeLinecap="round" />
          <g transform="translate(18, 12) scale(0.88)">
            <CityStationSymbol variant="shanghai_basic" />
          </g>
          <g transform="translate(44, 12) scale(0.88)">
            <CityStationSymbol variant="shanghai_interchange" />
          </g>
        </svg>
      ),
    },
    guangzhou: {
      label: t('sidebar.cityGuangzhou'),
      desc: t('sidebar.cityGuangzhouDesc'),
      code: t('leftToolbar.cityCodeGuangzhou'),
      miniIcon: (
        <svg className="w-4 h-4" viewBox="-15 -10 30 20">
          <CityStationSymbol variant="guangzhou_basic" />
        </svg>
      ),
      preview: (
        <svg className="w-16 h-6 shrink-0" viewBox="-32 -12 64 24">
          <line x1={-28} y1={0} x2={28} y2={0} stroke="#16A34A" strokeWidth={6} strokeOpacity={0.22} strokeLinecap="round" />
          <line x1={-28} y1={0} x2={28} y2={0} stroke="#16A34A" strokeWidth={3.2} strokeLinecap="round" />
          <g transform="translate(0, 0) scale(0.75)">
            <CityStationSymbol variant="guangzhou_interchange" />
          </g>
        </svg>
      ),
    },
  };

  const stationVariantOptions: Array<{
    variant: Exclude<StationVariant, 'auto'>;
    label: string;
    viewBox: string;
  }> = [
    { variant: 'shanghai_basic', label: t('sidebar.variantShanghaiBasic'), viewBox: '-12 -10 24 20' },
    { variant: 'shanghai_2020', label: t('sidebar.variantShanghai2020'), viewBox: '-12 -10 24 20' },
    { variant: 'shanghai_interchange', label: t('sidebar.variantShanghaiInterchange'), viewBox: '-14 -10 28 20' },
    { variant: 'shanghai_suburban', label: t('sidebar.variantShanghaiSuburban'), viewBox: '-12 -10 24 20' },
    { variant: 'guangzhou_basic', label: t('sidebar.variantGuangzhouBasic'), viewBox: '-18 -10 36 20' },
    { variant: 'guangzhou_interchange', label: t('sidebar.variantGuangzhouInterchange'), viewBox: '-30 -11 60 22' },
    { variant: 'guangzhou_interchange_2024', label: t('sidebar.variantGuangzhouInterchange2024'), viewBox: '-30 -15 60 30' },
    { variant: 'beijing_basic', label: t('sidebar.variantBeijingBasic'), viewBox: '-12 -10 24 20' },
    { variant: 'beijing_interchange', label: t('sidebar.variantBeijingInterchange'), viewBox: '-12 -11 24 22' },
  ];

  const strokePreviewBg = isLight ? '#FFFFFF' : '#18181B';
  const lineStyleOptions: Array<{ id: StrokeStyle; label: string; preview: React.ReactNode }> = [
    {
      id: 'solid',
      label: t('sidebar.styleSolid'),
      preview: (
        <svg className="w-8 h-3 shrink-0" viewBox="0 0 32 12">
          <line x1={2} y1={6} x2={30} y2={6} stroke={activeColor} strokeWidth={3.5} strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'dashed',
      label: t('sidebar.styleDashed'),
      preview: (
        <svg className="w-8 h-3 shrink-0" viewBox="0 0 32 12">
          <line x1={2} y1={6} x2={30} y2={6} stroke={activeColor} strokeWidth={3.5} strokeDasharray="6 3.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'dotted',
      label: t('sidebar.styleDotted'),
      preview: (
        <svg className="w-8 h-3 shrink-0" viewBox="0 0 32 12">
          <line x1={3} y1={6} x2={29} y2={6} stroke={activeColor} strokeWidth={3.5} strokeDasharray="0.1 6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'double',
      label: t('sidebar.styleDouble'),
      preview: (
        <svg className="w-8 h-3 shrink-0" viewBox="0 0 32 12">
          <line x1={2} y1={6} x2={30} y2={6} stroke={activeColor} strokeWidth={4.8} strokeLinecap="round" />
          <line x1={2} y1={6} x2={30} y2={6} stroke={strokePreviewBg} strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'beijing_cased',
      label: t('sidebar.styleBeijingCased'),
      preview: (
        <svg className="w-8 h-3 shrink-0" viewBox="0 0 32 12">
          <line x1={2} y1={6} x2={30} y2={6} stroke={isLight ? '#E4E4E7' : '#09090B'} strokeWidth={6} strokeLinecap="round" />
          <line x1={2} y1={6} x2={30} y2={6} stroke={activeColor} strokeWidth={3.5} strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'beijing_rail',
      label: t('sidebar.styleBeijingRail'),
      preview: (
        <svg className="w-8 h-3 shrink-0" viewBox="0 0 32 12">
          <line x1={2} y1={6} x2={30} y2={6} stroke={activeColor} strokeWidth={5} strokeLinecap="round" />
          <line x1={3} y1={6} x2={29} y2={6} stroke={strokePreviewBg} strokeWidth={2} strokeDasharray="4.5 3.5" />
        </svg>
      ),
    },
    {
      id: 'shanghai_metro',
      label: t('sidebar.styleShanghaiMetro'),
      preview: (
        <svg className="w-8 h-3 shrink-0" viewBox="0 0 32 12">
          <line x1={2} y1={6} x2={30} y2={6} stroke={strokePreviewBg} strokeWidth={5.5} strokeLinecap="round" />
          <line x1={2} y1={6} x2={30} y2={6} stroke={activeColor} strokeWidth={3.5} strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'shanghai_maglev',
      label: t('sidebar.styleShanghaiMaglev'),
      preview: (
        <svg className="w-8 h-3 shrink-0" viewBox="0 0 32 12">
          <line x1={2} y1={6} x2={30} y2={6} stroke={activeColor} strokeWidth={5.5} strokeLinecap="round" />
          <line x1={2} y1={6} x2={30} y2={6} stroke={strokePreviewBg} strokeWidth={2.6} strokeLinecap="round" />
          <line x1={3} y1={6} x2={29} y2={6} stroke={activeColor} strokeWidth={0.9} strokeDasharray="2.5 2.5" />
        </svg>
      ),
    },
    {
      id: 'guangzhou_metro',
      label: t('sidebar.styleGuangzhouMetro'),
      preview: (
        <svg className="w-8 h-3 shrink-0" viewBox="0 0 32 12">
          <line x1={2} y1={6} x2={30} y2={6} stroke={activeColor} strokeWidth={7} strokeOpacity={0.25} strokeLinecap="round" />
          <line x1={2} y1={6} x2={30} y2={6} stroke={strokePreviewBg} strokeWidth={4.8} strokeLinecap="round" />
          <line x1={2} y1={6} x2={30} y2={6} stroke={activeColor} strokeWidth={3.2} strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'guangzhou_intercity',
      label: t('sidebar.styleGuangzhouIntercity'),
      preview: (
        <svg className="w-8 h-3 shrink-0" viewBox="0 0 32 12">
          <line x1={2} y1={6} x2={30} y2={6} stroke={activeColor} strokeWidth={3.5} strokeDasharray="8 2.5 2 2.5" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const activeCityInfo = cityMeta[defaultStationStyle] || cityMeta.default;
  const activeLineStyleLabel = lineStyleOptions.find((o) => o.id === defaultStrokeStyle)?.label || defaultStrokeStyle;

  const activeVariantMeta =
    defaultStationVariant !== 'auto'
      ? stationVariantOptions.find((o) => o.variant === defaultStationVariant) || null
      : null;

  return (
    <aside
      ref={asideRef}
      aria-label={t('app.title')}
      className={`relative w-[62px] border-r flex flex-col items-center select-none shrink-0 h-full min-h-0 z-40 transition-colors ${
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

      {/* Scrollable Vertical Tool Container (supports smooth scrolling when tools expand) */}
      <div
        ref={scrollContainerRef}
        onScroll={() => {
          if (activeFlyout) setActiveFlyout(null);
        }}
        className="w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2.5 px-1 flex flex-col items-center gap-1 overscroll-contain [scrollbar-width:thin]"
      >
        {/* Primary Drawing Mode Tools */}
        <button
          type="button"
          onClick={() => {
            onSetToolMode('select');
            setActiveFlyout(null);
          }}
          className={getToolButtonClass(toolMode === 'select')}
          title={t('leftToolbar.selectTip')}
        >
          <MousePointer className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none truncate max-w-[42px]">{t('leftToolbar.select')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSetToolMode('marquee_select');
            setActiveFlyout(null);
          }}
          className={getToolButtonClass(toolMode === 'marquee_select')}
          title={t('leftToolbar.marqueeTip')}
        >
          <BoxSelect className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none truncate max-w-[42px]">{t('leftToolbar.marquee')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSetToolMode('add_station');
            setActiveFlyout(null);
          }}
          className={`${getToolButtonClass(toolMode === 'add_station')} relative`}
          title={t('leftToolbar.stationTip')}
        >
          <PlusCircle className="w-4 h-4 pointer-events-none" />
          <span className="text-[10px] font-medium leading-none truncate max-w-[44px] pointer-events-none">
            {t('leftToolbar.station')}
          </span>
          {activeVariantMeta && (
            <span
              className={`pointer-events-none absolute -bottom-0.5 -right-0.5 px-0.5 h-3.5 min-w-[16px] rounded flex items-center justify-center border bg-white ${
                isLight ? 'border-zinc-300' : 'border-zinc-600'
              }`}
            >
              <svg className="w-3.5 h-2.5" viewBox={activeVariantMeta.viewBox}>
                <CityStationSymbol variant={activeVariantMeta.variant} />
              </svg>
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            onSetToolMode('add_virtual_node');
            setActiveFlyout(null);
          }}
          className={getToolButtonClass(toolMode === 'add_virtual_node')}
          title={t('leftToolbar.virtualNodeTip')}
        >
          <XCircle className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none truncate max-w-[42px]">{t('leftToolbar.virtualNode')}</span>
        </button>

        {/* Connect Nodes Tool with route flyout */}
        <button
          type="button"
          onClick={(e) => {
            onSetToolMode('connect');
            openFlyoutForButton('route', e.currentTarget, 240);
          }}
          className={`${getToolButtonClass(toolMode === 'connect')} relative`}
          title={t('leftToolbar.connectTip')}
        >
          <GitCommit className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none truncate max-w-[42px]">{t('leftToolbar.connect')}</span>
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

        {/* Divider */}
        <div className={`w-7 h-px my-1.5 shrink-0 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />

        {/* SVG Elements: Import Image & Add Text */}
        <button
          type="button"
          onClick={() => {
            setActiveFlyout(null);
            imageFileInputRef.current?.click();
          }}
          className={getToolButtonClass(false)}
          title={t('leftToolbar.importImageTip')}
        >
          <ImagePlus className="w-4 h-4" />
          <span className="text-[9.5px] font-medium leading-none whitespace-nowrap truncate max-w-[44px]">{t('leftToolbar.importImage')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveFlyout(null);
            onAddText?.();
          }}
          className={getToolButtonClass(false)}
          title={t('leftToolbar.addTextTip')}
        >
          <Type className="w-4 h-4" />
          <span className="text-[9.5px] font-medium leading-none whitespace-nowrap truncate max-w-[44px]">{t('leftToolbar.addText')}</span>
        </button>

        {/* Divider */}
        <div className={`w-7 h-px my-1.5 shrink-0 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />

        {/* City Metro Style Flyout Trigger (Beijing / Shanghai / Guangzhou / Standard) */}
        <button
          type="button"
          onClick={(e) => openFlyoutForButton('city', e.currentTarget, 310)}
          className={`${getToolButtonClass(activeFlyout === 'city')} relative`}
          title={t('leftToolbar.cityStyleTip', { city: activeCityInfo.label })}
        >
          {activeCityInfo.miniIcon}
          <span className="text-[9.5px] font-medium leading-none truncate max-w-[44px]">
            {defaultStationStyle === 'default' ? t('leftToolbar.cityStyle') : activeCityInfo.label}
          </span>
        </button>

        {/* Active Color Swatch */}
        <div className="flex flex-col items-center gap-1 w-full pt-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveFlyout(null);
              onOpenColorModal();
            }}
            className={`relative w-8 h-8 rounded-lg border transition-transform hover:scale-105 active:scale-95 flex items-center justify-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 ${
              isLight ? 'border-zinc-300' : 'border-zinc-700'
            }`}
            style={{ backgroundColor: activeColor }}
            title={t('leftToolbar.colorTip', { color: activeColor })}
          >
            <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
              <Pipette className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
          <span className={`text-[9px] font-mono tabular-nums tracking-tight truncate max-w-[44px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {activeColor}
          </span>
        </div>

        {/* Divider */}
        <div className={`w-7 h-px my-1.5 shrink-0 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />

        {/* Show More / Show Less Expandable Toggle */}
        <button
          type="button"
          onClick={handleToggleShowMore}
          aria-expanded={showMoreTools}
          className={`w-11 py-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer shrink-0 ${
            showMoreTools
              ? isLight
                ? 'bg-zinc-100 border-zinc-300 text-zinc-900 font-semibold'
                : 'bg-zinc-800 border-zinc-700 text-zinc-100 font-semibold'
              : isLight
              ? 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
          }`}
          title={showMoreTools ? t('leftToolbar.lessTip') : t('leftToolbar.moreTip')}
        >
          {showMoreTools ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span className="text-[9.5px] leading-none truncate max-w-[42px]">
            {showMoreTools ? t('leftToolbar.less') : t('leftToolbar.more')}
          </span>
        </button>

        {/* Expanded Left Toolbar Features (Scrollable Downward as Features Grow) */}
        {showMoreTools && (
          <div ref={moreSectionRef} className="w-full flex flex-col items-center gap-1 pt-1 pb-2">
            {/* Quick City Metro Style Switches */}
            {(['default', 'beijing', 'shanghai', 'guangzhou'] as StationStyle[]).map((cityId) => {
              const info = cityMeta[cityId];
              const isCityActive = defaultStationStyle === cityId && defaultStationVariant === 'auto';
              return (
                <button
                  key={cityId}
                  type="button"
                  onClick={() => onSelectCityPreset?.(cityId)}
                  className={getToolButtonClass(isCityActive)}
                  title={`${info.label} — ${info.desc}`}
                >
                  {info.miniIcon}
                  <span className="text-[9.5px] font-medium leading-none truncate max-w-[42px]">{info.label}</span>
                </button>
              );
            })}

            {/* Authentic SVG Station Symbols Quick Picks (Scrollable) */}
            {onSelectStationVariant && (
              <>
                <div className={`w-7 h-px my-1 shrink-0 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
                {stationVariantOptions.map((item) => {
                  const isVarSelected = defaultStationVariant === item.variant;
                  const isVarArmed = isVarSelected && toolMode === 'add_station';
                  return (
                    <button
                      key={item.variant}
                      type="button"
                      onClick={() => {
                        setActiveFlyout(null);
                        onSelectStationVariant(item.variant);
                      }}
                      className={`${getToolButtonClass(isVarArmed)} ${
                        isVarSelected && !isVarArmed
                          ? isLight
                            ? 'ring-1 ring-zinc-400 bg-zinc-100/80 text-zinc-900'
                            : 'ring-1 ring-zinc-500 bg-zinc-800/80 text-zinc-100'
                          : ''
                      }`}
                      title={`${item.label} — ${t('leftToolbar.stationTip')}`}
                    >
                      <span className="pointer-events-none w-9 h-5 rounded bg-white border border-zinc-200 flex items-center justify-center overflow-hidden">
                        <svg className="w-8 h-4 pointer-events-none" viewBox={item.viewBox}>
                          <CityStationSymbol variant={item.variant} />
                        </svg>
                      </span>
                      <span className="pointer-events-none text-[8.5px] font-medium leading-none truncate max-w-[46px]">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {/* Line Segment Stroke Style Flyout Trigger */}
            <button
              type="button"
              onClick={(e) => openFlyoutForButton('line', e.currentTarget, 340)}
              className={getToolButtonClass(activeFlyout === 'line')}
              title={t('leftToolbar.lineStyleTip', { style: activeLineStyleLabel })}
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
              <span className="text-[9.5px] font-medium leading-none truncate max-w-[42px]">{t('leftToolbar.lineStyle')}</span>
            </button>

            <div className={`w-7 h-px my-1 shrink-0 ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`} />

            {/* Pan Tool */}
            <button
              type="button"
              onClick={() => {
                onSetToolMode('pan');
                setActiveFlyout(null);
              }}
              className={getToolButtonClass(toolMode === 'pan')}
              title={t('leftToolbar.panTip')}
            >
              <Hand className="w-4 h-4" />
              <span className="text-[9.5px] font-medium leading-none truncate max-w-[42px]">{t('leftToolbar.pan')}</span>
            </button>

            {/* 8-Way Alignment Toggle */}
            {onToggleNodeAlign && (
              <button
                type="button"
                onClick={onToggleNodeAlign}
                className={getToolButtonClass(Boolean(nodeAlign))}
                title={t('toolbar.alignTip')}
              >
                <Crosshair className="w-4 h-4" />
                <span className="text-[9.5px] font-medium leading-none truncate max-w-[42px]">{t('toolbar.align')}</span>
              </button>
            )}

            {/* Grid Snap Toggle */}
            {onToggleGridSnap && (
              <button
                type="button"
                onClick={onToggleGridSnap}
                className={getToolButtonClass(Boolean(gridSnap))}
                title={t('toolbar.snapTip')}
              >
                <Grid className="w-4 h-4" />
                <span className="text-[9.5px] font-medium leading-none truncate max-w-[42px]">{t('toolbar.snap')}</span>
              </button>
            )}

            {/* Undo & Redo */}
            {onUndo && (
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className={`${getToolButtonClass(false)} disabled:opacity-30 disabled:cursor-not-allowed`}
                title={`${t('toolbar.undo')} (Ctrl+Z)`}
              >
                <Undo2 className="w-4 h-4" />
                <span className="text-[9.5px] font-medium leading-none truncate max-w-[42px]">{t('toolbar.undo')}</span>
              </button>
            )}

            {onRedo && (
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className={`${getToolButtonClass(false)} disabled:opacity-30 disabled:cursor-not-allowed`}
                title={`${t('toolbar.redo')} (Ctrl+Y)`}
              >
                <Redo2 className="w-4 h-4" />
                <span className="text-[9.5px] font-medium leading-none truncate max-w-[42px]">{t('toolbar.redo')}</span>
              </button>
            )}

            {/* Shortcuts Guide */}
            {onOpenShortcuts && (
              <button
                type="button"
                onClick={() => {
                  setActiveFlyout(null);
                  onOpenShortcuts();
                }}
                className={getToolButtonClass(false)}
                title={t('app.tab.shortcuts')}
              >
                <Keyboard className="w-4 h-4" />
                <span className="text-[9.5px] font-medium leading-none truncate max-w-[42px]">{t('app.tab.shortcuts')}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Unclipped Flyout Panels (Positioned outside overflow-y-auto scroll container) */}
      {activeFlyout === 'route' && (
        <div
          ref={flyoutRef}
          style={{ top: flyoutTop }}
          className={`absolute left-full ml-2 z-50 w-52 rounded-lg shadow-lg p-1.5 text-xs border ${
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
                  setActiveFlyout(null);
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

      {activeFlyout === 'city' && (
        <div
          ref={flyoutRef}
          style={{ top: flyoutTop, maxHeight: 'calc(100% - 16px)' }}
          className={`absolute left-full ml-2 z-50 w-72 overflow-y-auto rounded-lg shadow-lg p-2.5 text-xs border ${
            isLight
              ? 'bg-white border-zinc-200 text-zinc-800'
              : 'bg-[#111113] border-zinc-800 text-zinc-200'
          }`}
        >
          <div
            className={`px-1 pb-1.5 mb-1.5 border-b ${
              isLight ? 'border-zinc-200' : 'border-zinc-800'
            }`}
          >
            <div className="font-semibold text-[11.5px]">{t('sidebar.cityPresetTitle')}</div>
            <div className={`text-[10px] mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {t('sidebar.cityPresetSubtitle')}
            </div>
          </div>
          <div className="space-y-1">
            {(['default', 'beijing', 'shanghai', 'guangzhou'] as StationStyle[]).map((cityId) => {
              const info = cityMeta[cityId];
              const isSelected = defaultStationStyle === cityId && defaultStationVariant === 'auto';
              return (
                <button
                  key={cityId}
                  type="button"
                  onClick={() => onSelectCityPreset?.(cityId)}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border text-left transition-colors cursor-pointer ${
                    isSelected
                      ? isLight
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-100 text-zinc-900 border-zinc-100'
                      : isLight
                      ? 'bg-zinc-50/70 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <div className="min-w-0 flex-1 pointer-events-none">
                    <div className="font-medium text-[11px]">{info.label}</div>
                    <div
                      className={`text-[9.5px] truncate ${
                        isSelected
                          ? isLight
                            ? 'text-zinc-300'
                            : 'text-zinc-600'
                          : isLight
                          ? 'text-zinc-500'
                          : 'text-zinc-400'
                      }`}
                    >
                      {info.desc}
                    </div>
                  </div>
                  <span className="pointer-events-none">{info.preview}</span>
                </button>
              );
            })}
          </div>

          {/* All 9 Official City SVG Station Symbols */}
          {onSelectStationVariant && (
            <div className={`mt-2.5 pt-2 border-t ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <div className="flex items-center justify-between px-0.5 mb-1.5">
                <span className="font-semibold text-[11px]">{t('sidebar.stationVariantTitle')}</span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectStationVariant('auto');
                    setActiveFlyout(null);
                  }}
                  className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer ${
                    defaultStationVariant === 'auto'
                      ? isLight
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-100 text-zinc-900 border-zinc-100'
                      : isLight
                      ? 'border-zinc-200 text-zinc-500 hover:text-zinc-900'
                      : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t('sidebar.variantAuto')}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {stationVariantOptions.map((item) => {
                  const isVarSelected = defaultStationVariant === item.variant;
                  return (
                    <button
                      key={item.variant}
                      type="button"
                      onClick={() => {
                        onSelectStationVariant(item.variant);
                        setActiveFlyout(null);
                      }}
                      className={`p-1.5 rounded-md border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                        isVarSelected
                          ? isLight
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-zinc-100 text-zinc-900 border-zinc-100'
                          : isLight
                          ? 'bg-zinc-50/70 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                      }`}
                      title={`${item.label} — ${t('leftToolbar.stationTip')}`}
                    >
                      <span className="pointer-events-none w-full h-7 rounded bg-white border border-zinc-200/80 flex items-center justify-center">
                        <svg className="w-16 h-6 pointer-events-none" viewBox={item.viewBox}>
                          <CityStationSymbol variant={item.variant} />
                        </svg>
                      </span>
                      <span className="pointer-events-none text-[9.5px] leading-tight text-center truncate w-full">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {onApplyCityPresetToAll && (
            <button
              type="button"
              onClick={() => {
                onApplyCityPresetToAll(defaultStationStyle);
                setActiveFlyout(null);
              }}
              className={`w-full mt-2 py-1.5 px-2.5 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('sidebar.applyPresetAll')}</span>
            </button>
          )}
        </div>
      )}

      {activeFlyout === 'line' && (
        <div
          ref={flyoutRef}
          style={{ top: flyoutTop }}
          className={`absolute left-full ml-2 z-50 w-64 rounded-lg shadow-lg p-2 text-xs border ${
            isLight
              ? 'bg-white border-zinc-200 text-zinc-800'
              : 'bg-[#111113] border-zinc-800 text-zinc-200'
          }`}
        >
          <div
            className={`px-1.5 pb-1.5 mb-1.5 border-b flex items-center justify-between ${
              isLight ? 'border-zinc-200' : 'border-zinc-800'
            }`}
          >
            <span className="font-semibold text-[11.5px]">{t('sidebar.cityLineStyleTitle')}</span>
            <span className={`font-mono text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {activeLineStyleLabel}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1 max-h-72 overflow-y-auto pr-0.5">
            {lineStyleOptions.map((opt) => {
              const active = defaultStrokeStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChangeDefaultStrokeStyle?.(opt.id);
                    setActiveFlyout(null);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border text-left transition-colors cursor-pointer ${
                    active
                      ? isLight
                        ? 'bg-zinc-900 text-white border-zinc-900 font-medium'
                        : 'bg-zinc-100 text-zinc-900 border-zinc-100 font-medium'
                      : isLight
                      ? 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-[11px] truncate">{opt.label}</span>
                  {opt.preview}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
