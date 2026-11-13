import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Hash, X } from 'lucide-react';
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
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(() =>
    hexToHsv(activeColor)
  );
  const [hexInput, setHexInput] = useState<string>(activeColor);
  const [inputError, setInputError] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const spectrumRef = useRef<HTMLDivElement | null>(null);
  const hueSliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setHsv(hexToHsv(activeColor));
    setHexInput(activeColor);
    setInputError(false);
  }, [activeColor]);

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

  const currentColorHex = hsvToHex(hsv.h, hsv.s, hsv.v);

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

  const borderCol = isLight ? 'border-zinc-200' : 'border-zinc-800';
  const textHeading = isLight ? 'text-zinc-900' : 'text-zinc-100';
  const textMuted = isLight ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-2xs select-none">
      <div
        ref={modalRef}
        className={`w-full max-w-[400px] rounded-xl shadow-2xl overflow-hidden flex flex-col border transition-colors ${
          isLight
            ? 'bg-white border-zinc-200 text-zinc-800'
            : 'bg-[#111113] border-zinc-800 text-zinc-200'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${borderCol}`}>
          <div className="flex items-center gap-2.5">
            <div
              className={`w-4 h-4 rounded border ${isLight ? 'border-zinc-300' : 'border-zinc-700'}`}
              style={{ backgroundColor: currentColorHex }}
            />
            <h3 className={`font-semibold text-sm ${textHeading}`}>
              路線色彩選擇器
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isLight
                ? 'text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
            title="關閉 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* 1. 2D Spectrum Area */}
          <div className="space-y-3">
            <div
              ref={spectrumRef}
              onPointerDown={handleSpectrumPointerDown}
              className={`relative w-full h-36 rounded-lg overflow-hidden cursor-crosshair border ${borderCol}`}
              style={{
                backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to right, #ffffff, transparent)' }}
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, #000000, transparent)' }}
              />
              <div
                className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 border-white shadow pointer-events-none"
                style={{
                  left: `${hsv.s * 100}%`,
                  top: `${(1 - hsv.v) * 100}%`,
                  backgroundColor: currentColorHex,
                }}
              />
            </div>

            {/* 2. Hue Slider */}
            <div
              ref={hueSliderRef}
              onPointerDown={handleHuePointerDown}
              className="relative w-full h-3 rounded-full cursor-pointer"
              style={{
                background:
                  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
              }}
              title="選擇色相 (0° ~ 360°)"
            >
              <div
                className="absolute top-1/2 -mt-2 -ml-2 w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none"
                style={{
                  left: `${(hsv.h / 360) * 100}%`,
                  backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                }}
              />
            </div>
          </div>

          {/* 3. Hex Input & Apply */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-md border shrink-0 ${borderCol}`}
              style={{ backgroundColor: currentColorHex }}
            />
            <div className="flex-1 relative">
              <div className={`absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none ${textMuted}`}>
                <Hash className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={hexInput}
                onChange={handleHexInputChange}
                maxLength={7}
                placeholder="#E11D48"
                className={`w-full h-9 pl-7 pr-3 rounded-md font-mono text-xs font-semibold uppercase border focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-zinc-50 text-zinc-900 focus:bg-white'
                    : 'bg-zinc-950 text-zinc-100'
                } ${
                  inputError
                    ? 'border-rose-500'
                    : isLight
                    ? 'border-zinc-200 focus:border-zinc-900'
                    : 'border-zinc-800 focus:border-zinc-400'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={() => handleApplyColor()}
              className={`h-9 px-4 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                isLight
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                  : 'bg-zinc-100 hover:bg-white text-zinc-900'
              }`}
            >
              套用
            </button>
          </div>

          {/* 4. Recent 20 Colors */}
          <div className={`space-y-2 pt-3 border-t ${borderCol}`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${textHeading}`}>最近使用色</span>
              <span className={`text-[11px] font-mono tabular-nums ${textMuted}`}>
                {recentColors.length} / 20
              </span>
            </div>

            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 20 }).map((_, index) => {
                const color = recentColors[index];
                const isCurrent = color && currentColorHex.toUpperCase() === color.toUpperCase();

                if (!color) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className={`h-6 rounded border border-dashed flex items-center justify-center text-[9px] font-mono ${
                        isLight
                          ? 'border-zinc-200 text-zinc-300'
                          : 'border-zinc-800 text-zinc-700'
                      }`}
                      title={`欄位 ${index + 1}`}
                    />
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
                    className={`h-6 rounded transition-transform hover:scale-110 focus:outline-none relative flex items-center justify-center border cursor-pointer ${
                      isCurrent
                        ? isLight
                          ? 'ring-2 ring-zinc-900 border-white scale-105 z-10'
                          : 'ring-2 ring-zinc-100 border-zinc-900 scale-105 z-10'
                        : isLight
                        ? 'border-black/15'
                        : 'border-white/15'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  >
                    {isCurrent && <Check className="w-3 h-3 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
