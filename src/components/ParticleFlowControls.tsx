import React, { useState } from 'react';
import { Sparkles, Activity, Zap, DollarSign, ShieldAlert, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { RelationType } from '../types';

export interface ParticleFlowSettings {
  isEnabled: boolean;
  speedMultiplier: number; // 0.5, 1.0, 2.0
  filterType: 'all' | RelationType;
}

interface ParticleFlowControlsProps {
  settings: ParticleFlowSettings;
  onChangeSettings: (newSettings: ParticleFlowSettings) => void;
  activeParticleCount: number;
  isMonochrome: boolean;
}

export const ParticleFlowControls: React.FC<ParticleFlowControlsProps> = ({
  settings,
  onChangeSettings,
  activeParticleCount,
  isMonochrome,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const containerBg = isMonochrome
    ? 'bg-zinc-950/92 border-zinc-800/90 text-zinc-200'
    : 'bg-slate-900/92 border-slate-800/90 text-slate-200';

  return (
    <div
      className={`absolute bottom-20 sm:bottom-24 left-3 z-20 flex flex-col rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 font-vazir select-none ${containerBg} ${
        isOpen ? 'w-64 p-3' : 'w-auto p-1.5'
      }`}
      id="tactical-particle-flow-controller"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Sparkles className={`w-4 h-4 ${settings.isEnabled ? (isMonochrome ? 'text-zinc-100' : 'text-amber-400') : 'text-zinc-500'} animate-pulse`} />
          {isOpen && (
            <div className="flex flex-col">
              <span>جریان ذرات زنده روابط</span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {settings.isEnabled ? `${activeParticleCount} ذره فعال` : 'جریان غیرفعال'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle Flow on/off */}
          <button
            onClick={() => onChangeSettings({ ...settings, isEnabled: !settings.isEnabled })}
            className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${
              settings.isEnabled
                ? isMonochrome ? 'bg-zinc-200 text-zinc-950 font-bold' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
            }`}
            title={settings.isEnabled ? 'توقف پویانمایی ذرات' : 'فعال‌سازی جریان ذرات'}
          >
            {settings.isEnabled ? 'روشن' : 'خاموش'}
          </button>

          {/* Minimize / Expand Toggle */}
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title={isOpen ? 'بستن پنل ذرات' : 'تنظیمات جریان ذرات'}
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls */}
      {isOpen && (
        <div className="mt-2.5 flex flex-col gap-2.5 pt-2 border-t border-zinc-800/80 text-[11px]">
          {/* Speed Presets */}
          <div className="flex flex-col gap-1">
            <span className="text-zinc-400 text-[10px]">سرعت جریان مبادلات:</span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: '۰.۵x آهسته', val: 0.5 },
                { label: '۱x استاندارد', val: 1.0 },
                { label: '۲x شتاب‌یافته', val: 2.0 },
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => onChangeSettings({ ...settings, speedMultiplier: s.val })}
                  className={`py-1 px-1 rounded-lg text-center transition-all ${
                    settings.speedMultiplier === s.val
                      ? isMonochrome
                        ? 'bg-zinc-200 text-zinc-950 font-bold'
                        : 'bg-sky-500/30 text-sky-200 border border-sky-500/50 font-bold'
                      : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter by relation stream */}
          <div className="flex flex-col gap-1">
            <span className="text-zinc-400 text-[10px]">تمرکز بر نوع جریان:</span>
            <div className="flex flex-col gap-1">
              {[
                { id: 'all', label: 'همه جریان‌ها (تمام روابط)', icon: Globe },
                { id: 'economic', label: 'مبادلات اقتصادی و تجاری', icon: DollarSign },
                { id: 'alliance', label: 'پشتیبانی راهبردی / ائتلاف', icon: Zap },
                { id: 'conflict', label: 'جریان تنش‌ها و تعارضات', icon: ShieldAlert },
              ].map((f) => {
                const IconComponent = f.icon;
                const isSelected = settings.filterType === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => onChangeSettings({ ...settings, filterType: f.id as any })}
                    className={`py-1 px-2 rounded-lg flex items-center justify-between transition-all ${
                      isSelected
                        ? isMonochrome
                          ? 'bg-zinc-200 text-zinc-950 font-bold'
                          : 'bg-sky-500/25 text-sky-200 border border-sky-500/40 font-semibold'
                        : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <IconComponent className="w-3 h-3 text-zinc-400" />
                      <span>{f.label}</span>
                    </div>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flow Direction & Intensity Guide */}
          <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-[10px] text-zinc-400 flex flex-col gap-1">
            <div className="flex items-center gap-1 text-zinc-300 font-semibold">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>مفهوم پویای ذرات:</span>
            </div>
            <div>• <b>تراکم و اندازه ذرات</b>: متناسب با شدت رابطه (۱ تا ۵)</div>
            <div>• <b>جهت حرکت</b>: از صادرکننده/حامی به مقصد مبادله</div>
            <div>• <b>روابط تعارض</b>: ذرات دوطرفه متضاد با برخورد فرکانسی</div>
          </div>
        </div>
      )}
    </div>
  );
};
