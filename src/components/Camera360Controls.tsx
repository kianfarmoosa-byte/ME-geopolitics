import React, { useState } from 'react';
import { 
  Compass, 
  RotateCw, 
  RotateCcw, 
  Play, 
  Pause, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Layers, 
  Eye, 
  Target, 
  Sliders, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

interface Camera360ControlsProps {
  azimuthAngle: number; // 0 - 360
  polarAngle: number;   // degrees from top
  zoomPercent: number;
  isAutoRotate: boolean;
  onToggleAutoRotate: () => void;
  autoRotateSpeed: number;
  onChangeAutoRotateSpeed: (speed: number) => void;
  onRotateStep: (deltaDegrees: number) => void;
  onSetAzimuth: (degrees: number) => void;
  onApplyPreset: (preset: 'top' | 'front' | 'side' | 'isometric' | 'selected') => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCamera: () => void;
  hasSelectedActor: boolean;
  isMonochrome: boolean;
}

export const Camera360Controls: React.FC<Camera360ControlsProps> = ({
  azimuthAngle,
  polarAngle,
  zoomPercent,
  isAutoRotate,
  onToggleAutoRotate,
  autoRotateSpeed,
  onChangeAutoRotateSpeed,
  onRotateStep,
  onSetAzimuth,
  onApplyPreset,
  onZoomIn,
  onZoomOut,
  onResetCamera,
  hasSelectedActor,
  isMonochrome,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Border & background classes according to monochrome state
  const containerBg = isMonochrome
    ? 'bg-zinc-950/92 border-zinc-800/90 text-zinc-200'
    : 'bg-slate-900/92 border-slate-800/90 text-slate-200';

  const activeBtnBg = isMonochrome
    ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold';

  const standardBtnBg = isMonochrome
    ? 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800/80'
    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/80';

  return (
    <div
      className={`absolute bottom-20 sm:bottom-24 right-3 z-20 flex flex-col rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 font-vazir select-none ${containerBg} ${
        isExpanded ? 'w-64 p-3' : 'w-auto p-1.5'
      }`}
      id="tactical-360-camera-controller"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Compass className={`w-4 h-4 ${isMonochrome ? 'text-zinc-100' : 'text-sky-400'} animate-spin-slow`} />
          {isExpanded && <span>کنترل دوربین ۳۶۰°</span>}
        </div>

        <div className="flex items-center gap-1">
          {/* Quick 360 Turntable auto-rotate toggle */}
          <button
            onClick={onToggleAutoRotate}
            className={`p-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${
              isAutoRotate
                ? isMonochrome ? 'bg-zinc-200 text-zinc-900 font-bold' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title={isAutoRotate ? 'توقف گردش ۳۶۰ درجه' : 'فعال‌سازی گردش خودکار ۳۶۰ درجه'}
          >
            {isAutoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize / Expand Toggle */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title={isExpanded ? 'بستن پنل کنترل' : 'بازکردن کنترل دوربین ۳۶۰°'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls */}
      {isExpanded && (
        <div className="mt-2.5 flex flex-col gap-2.5 pt-2 border-t border-zinc-800/80 text-[11px]">
          {/* 360 Azimuth Stepper & Live Angle */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>زاویه افقی (Azimuth):</span>
              <span className="font-mono text-zinc-200 font-bold">{Math.round(azimuthAngle)}°</span>
            </div>

            {/* Stepper Buttons & Angle Slider */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onRotateStep(-30)}
                className={`flex-1 py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${standardBtnBg}`}
                title="چرخش ۳۰ درجه پادساعتگرد"
              >
                <RotateCcw className="w-3 h-3" />
                <span>۳۰°-</span>
              </button>

              <button
                onClick={() => onRotateStep(30)}
                className={`flex-1 py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${standardBtnBg}`}
                title="چرخش ۳۰ درجه ساعتگرد"
              >
                <span>+۳۰°</span>
                <RotateCw className="w-3 h-3" />
              </button>
            </div>

            {/* Azimuth 0-360 Slider */}
            <input
              type="range"
              min="0"
              max="360"
              value={Math.round(azimuthAngle)}
              onChange={(e) => onSetAzimuth(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-200"
              title="چرخش پیوسته ۳۶۰ درجه دوربین"
            />
          </div>

          {/* Perspective Angle Presets */}
          <div className="flex flex-col gap-1">
            <span className="text-zinc-400 text-[10px]">دیدهای تاکتیکال راهبردی:</span>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => onApplyPreset('top')}
                className={`py-1 px-2 rounded-lg flex items-center gap-1.5 transition-all ${standardBtnBg}`}
                title="دید عمودی مستقیم از بالا (Zenith 90°) جهت تحلیل توپولوژی شبکه‌ای بدون هم‌پوشانی"
              >
                <Eye className="w-3 h-3 text-zinc-400" />
                <span>دید از بالا (Zenith)</span>
              </button>

              <button
                onClick={() => onApplyPreset('isometric')}
                className={`py-1 px-2 rounded-lg flex items-center gap-1.5 transition-all ${standardBtnBg}`}
                title="دید ایزومتریک زاویه ۴۵ درجه راهبردی"
              >
                <Layers className="w-3 h-3 text-zinc-400" />
                <span>دید ایزومتریک ۴۵°</span>
              </button>

              <button
                onClick={() => onApplyPreset('front')}
                className={`py-1 px-2 rounded-lg flex items-center gap-1.5 transition-all ${standardBtnBg}`}
                title="دید تراز افقی روبه‌رو (Front View)"
              >
                <Compass className="w-3 h-3 text-zinc-400" />
                <span>دید روبه‌رو</span>
              </button>

              <button
                onClick={() => onApplyPreset('side')}
                className={`py-1 px-2 rounded-lg flex items-center gap-1.5 transition-all ${standardBtnBg}`}
                title="دید زاویه جانبی ۹۰ درجه (Side View)"
              >
                <Sliders className="w-3 h-3 text-zinc-400" />
                <span>دید جانبی</span>
              </button>
            </div>

            {/* Orbit Selected Actor (if an actor is selected) */}
            {hasSelectedActor && (
              <button
                onClick={() => onApplyPreset('selected')}
                className={`w-full mt-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all ${
                  isMonochrome
                    ? 'bg-zinc-200 text-zinc-950 hover:bg-white'
                    : 'bg-sky-500/25 text-sky-300 border border-sky-500/50 hover:bg-sky-500/35'
                }`}
                title="قفل و چرخش ۳۶۰ درجه حول بازیگر انتخاب‌شده"
              >
                <Target className="w-3.5 h-3.5 animate-pulse" />
                <span>چرخش حول بازیگر منتخب</span>
              </button>
            )}
          </div>

          {/* Zoom Controls & Readout */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
            <div className="flex items-center gap-1">
              <button
                onClick={onZoomIn}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                title="بزرگ‌نمایی (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onZoomOut}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                title="کوچک‌نمایی (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onResetCamera}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                title="بازنشانی زاویه دید و فاصله استاندارد"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[10px] text-zinc-400 font-mono">
              زوم: <span className="text-zinc-200 font-bold">{zoomPercent}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
