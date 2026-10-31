import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pipette, Check, Hash, X, History, Sliders } from 'lucide-react';
import { hexToHsv, hsvToHex, isValidHex, normalizeHex } from '../utils/color';
import { EffectiveTheme } from '../types/metro';

interface ColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeColor: string;
  recentColors: string[];
  onSelectColor: (color: string) => void;
  theme?: EffectiveTheme;
}

export const ColorModal: React.FC<ColorModalProps> = ({
  isOpen,
  onClose,
  activeColor,
  recentColors,
  onSelectColor,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  // HSV state to cover all 16,777,216 colors
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(() =>
    hexToHsv(activeColor)
  );
  const [hexInput, setHexInput] = useState<string>(activeColor);
  const [inputError, setInputError] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const spectrumRef = useRef<HTMLDivElement | null>(null);
  const hueSliderRef = useRef<HTMLDivElement | null>(null);

  // Sync internal state when activeColor changes from external
  useEffect(() => {
    setHsv(hexToHsv(activeColor));
    setHexInput(activeColor);
    setInputError(false);
  }, [activeColor]);

  // Handle ESC key and outside click to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Derived current color from HSV
  const currentColorHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  // 2D Saturation & Brightness spectrum interaction
  const handleSpectrumPointer = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (!spectrumRef.current) return;
    const rect = spectrumRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const s = Math.round((x / rect.width) * 100) / 100;
    const v = Math.round((1 - y / rect.height) * 100) / 100;

    setHsv((prev) => {
      const nextHsv = { ...prev, s, v };
      const hex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
      setHexInput(hex);
      setInputError(false);
      return nextHsv;
    });
  }, []);

  const handleSpectrumPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handleSpectrumPointer(e);

    const onPointerMove = (moveEvent: PointerEvent) => {
      handleSpectrumPointer(moveEvent);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // 1D Hue slider interaction (0 - 360 deg)
  const handleHuePointer = useCallback((e: PointerEvent | React.PointerEvent) => {
    if (!hueSliderRef.current) return;
    const rect = hueSliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const h = Math.round((x / rect.width) * 360) % 360;

    setHsv((prev) => {
      const nextHsv = { ...prev, h };
      const hex = hsvToHex(h, nextHsv.s, nextHsv.v);
      setHexInput(hex);
      setInputError(false);
      return nextHsv;
    });
  }, []);

  const handleHuePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    handleHuePointer(e);

    const onPointerMove = (moveEvent: PointerEvent) => {
      handleHuePointer(moveEvent);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Hex input change
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#') && val.length > 0) val = '#' + val;
    setHexInput(val);

    if (isValidHex(val)) {
      const normalized = normalizeHex(val);
      setInputError(false);
      setHsv(hexToHsv(normalized));
    } else {
      setInputError(val.length > 1);
    }
  };

  // Confirm selection
  const handleApplyColor = (colorToApply?: string) => {
    const finalHex = colorToApply ? normalizeHex(colorToApply) : normalizeHex(hexInput);
    if (isValidHex(finalHex)) {
      onSelectColor(finalHex);
      onClose();
    } else {
      setInputError(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
      {/* Window occupying approximately 1/9th of typical desktop screen (~34vw) */}
      <div
        ref={modalRef}
        className={`w-[34vw] min-w-[360px] max-w-[460px] rounded-2xl shadow-2xl overflow-hidden flex flex-col border animate-in fade-in zoom-in-95 duration-150 transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60'
            : 'bg-slate-900 border-slate-700/80 text-slate-200'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-b transition-colors ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-4 h-4 rounded-md border border-white/60 shadow-xs"
              style={{ backgroundColor: currentColorHex }}
            />
            <h3 className={`font-semibold text-sm flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              16,777,216 全色彩圖譜選擇器
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isLight
                ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="關閉 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* 1. 2D Spectrum Area (Saturation x Value) */}
          <div className="space-y-2">
            <div
              ref={spectrumRef}
              onPointerDown={handleSpectrumPointerDown}
              className="relative w-full h-36 rounded-xl overflow-hidden cursor-crosshair shadow-inner"
              style={{
                backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
              }}
            >
              {/* White horizontal gradient (Saturation) */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to right, #ffffff, transparent)',
                }}
              />
              {/* Black vertical gradient (Value / Brightness) */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, #000000, transparent)',
                }}
              />

              {/* Spectrum Draggable Handle */}
              <div
                className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-md pointer-events-none transition-transform"
                style={{
                  left: `${hsv.s * 100}%`,
                  top: `${(1 - hsv.v) * 100}%`,
                  backgroundColor: currentColorHex,
                }}
              />
            </div>

            {/* 2. 1D Hue Rainbow Slider (0 to 360 deg) */}
            <div
              ref={hueSliderRef}
              onPointerDown={handleHuePointerDown}
              className="relative w-full h-3.5 rounded-full cursor-pointer shadow-inner"
              style={{
                background:
                  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
              }}
              title="滑動選擇色相 (Hue 0° ~ 360°)"
            >
              {/* Hue Thumb */}
              <div
                className="absolute top-1/2 -mt-2.5 -ml-2.5 w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none"
                style={{
                  left: `${(hsv.h / 360) * 100}%`,
                  backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                }}
              />
            </div>
          </div>

          {/* 3. Hex Input & Preview Row */}
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div
              className="w-10 h-9 rounded-lg border border-white/40 shadow-xs shrink-0"
              style={{ backgroundColor: currentColorHex }}
              title={`當前預覽色彩: ${currentColorHex}`}
            />
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500 font-mono text-xs">
                <Hash className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={hexInput}
                onChange={handleHexInputChange}
                maxLength={7}
                placeholder="#E11D48"
                className={`w-full pl-7 pr-3 py-1.5 bg-slate-900 rounded-lg font-mono text-xs font-bold text-white uppercase border focus:outline-none transition-colors ${
                  inputError
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>
            <button
              onClick={() => handleApplyColor()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg text-xs font-semibold shrink-0 transition-all shadow-sm"
            >
              套用
            </button>
          </div>

          {/* 4. Recent 20 Colors Section */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                前 20 個使用的顏色
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {recentColors.length > 0 ? `已記錄 ${recentColors.length} / 20 色` : '尚未有歷史色彩'}
              </span>
            </div>

            {/* 20 slots grid (10 cols x 2 rows or 5 cols x 4 rows) */}
            <div className="grid grid-cols-10 gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800/80">
              {Array.from({ length: 20 }).map((_, index) => {
                const color = recentColors[index];
                const isCurrent = color && currentColorHex.toUpperCase() === color.toUpperCase();

                if (!color) {
                  // Empty slot before color has been used
                  return (
                    <div
                      key={`empty-${index}`}
                      className="h-6 rounded-md border border-dashed border-slate-800/80 bg-slate-900/30 flex items-center justify-center text-[9px] text-slate-700 font-mono"
                      title={`第 ${index + 1} 個使用色 (尚無記錄)`}
                    >
                      {index + 1}
                    </div>
                  );
                }

                return (
                  <button
                    key={`${color}-${index}`}
                    type="button"
                    onClick={() => {
                      setHsv(hexToHsv(color));
                      setHexInput(color);
                      setInputError(false);
                      onSelectColor(color);
                    }}
                    className={`h-6 rounded-md transition-all hover:scale-115 active:scale-95 focus:outline-none relative flex items-center justify-center border ${
                      isCurrent
                        ? 'ring-2 ring-white border-white scale-105 shadow-sm z-10'
                        : 'border-black/40 hover:border-white/50'
                    }`}
                    style={{ backgroundColor: color }}
                    title={`第 ${index + 1} 個使用色: ${color}`}
                  >
                    {isCurrent && <Check className="w-3 h-3 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
            {recentColors.length === 0 && (
              <p className="text-[10px] text-slate-500 text-center italic">
                在還沒有使用新顏色時無歷史記錄；套用新色彩後將自動記錄於此（上限 20 色）
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-2.5 border-t flex items-center justify-between text-[11px] transition-colors ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-600'
              : 'bg-slate-950/60 border-slate-800/60 text-slate-400'
          }`}
        >
          <span>拖曳色盤或滑桿即可無級選擇 16,777,216 色</span>
          <button
            onClick={onClose}
            className={`font-medium ${
              isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
