import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Calendar,
  ChevronUp,
  ChevronDown,
  Info,
  Clock,
  Sparkles,
  Layers,
  Flame,
  Globe2,
} from 'lucide-react';
import { TIMELINE_ERAS, TimelineEra } from '../data/timelineEras';
import { ActorData } from '../types';

interface TimelineToolbarProps {
  selectedEraId: string | 'all';
  onSelectEra: (eraId: string | 'all') => void;
  allActorsMap: Map<string, ActorData>;
  onSelectActor?: (actor: ActorData) => void;
  className?: string;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  selectedEraId,
  onSelectEra,
  allActorsMap,
  onSelectActor,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2>(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentEraIndex = TIMELINE_ERAS.findIndex((e) => e.id === selectedEraId);
  const currentEra = currentEraIndex >= 0 ? TIMELINE_ERAS[currentEraIndex] : null;

  // Auto-play interval effect
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = playSpeed === 1 ? 4200 : 2200;
    timerRef.current = setInterval(() => {
      // Advance to next era or loop back to first
      const nextIndex = currentEraIndex < 0 ? 0 : (currentEraIndex + 1) % TIMELINE_ERAS.length;
      onSelectEra(TIMELINE_ERAS[nextIndex].id);
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentEraIndex, playSpeed, onSelectEra]);

  const handleNext = () => {
    if (currentEraIndex < 0) {
      onSelectEra(TIMELINE_ERAS[0].id);
    } else {
      const nextIdx = (currentEraIndex + 1) % TIMELINE_ERAS.length;
      onSelectEra(TIMELINE_ERAS[nextIdx].id);
    }
  };

  const handlePrev = () => {
    if (currentEraIndex <= 0) {
      onSelectEra(TIMELINE_ERAS[TIMELINE_ERAS.length - 1].id);
    } else {
      onSelectEra(TIMELINE_ERAS[currentEraIndex - 1].id);
    }
  };

  const togglePlay = () => {
    if (!isPlaying && selectedEraId === 'all') {
      onSelectEra(TIMELINE_ERAS[0].id);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <aside
      aria-label="خط زمانی تحولات ژئوپلیتیک"
      className={`relative z-20 flex flex-col items-center select-none font-vazir ${className}`}
      id="timeline-toolbar-container"
    >
      {/* Detail Popover / Accordion when expanded or active */}
      {isExpanded && currentEra && (
        <div
          className="w-full max-w-5xl mx-auto mb-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 text-right"
          id="timeline-details-drawer"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl p-2 rounded-xl bg-slate-800 border border-slate-700 shadow-inner">
                {currentEra.icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>{currentEra.nameFa}</span>
                    <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-700/40">
                      {currentEra.periodFa}
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-sans">{currentEra.titleEn}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-medium">
                <Flame className="w-3.5 h-3.5" />
                <span>{currentEra.badge}</span>
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="بستن پنجره جزئیات"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-3">
            {currentEra.descriptionFa}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            {/* Key Events */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-1.5 text-cyan-400">
                <Clock className="w-3.5 h-3.5" />
                <span>رویدادها و نقاط عطف بنیادین دوره:</span>
              </h4>
              <ul className="space-y-1.5 text-slate-300 leading-normal">
                {currentEra.keyEventsFa.map((evt, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-cyan-500 text-[10px] mt-1">◀</span>
                    <span>{evt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Focal Actors in this era */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-1.5 text-indigo-400">
                  <Globe2 className="w-3.5 h-3.5" />
                  <span>کانون‌های تحول و بازیگران اثرگذار دوره:</span>
                </h4>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {currentEra.focalActors.map((actId) => {
                    const actor = allActorsMap.get(actId);
                    if (!actor) return null;
                    return (
                      <button
                        key={actId}
                        onClick={() => onSelectActor?.(actor)}
                        className="px-2 py-1 bg-slate-900 hover:bg-indigo-950/70 border border-slate-700/80 hover:border-indigo-500/60 rounded-lg text-slate-200 text-xs flex items-center gap-1 transition-all hover:scale-105"
                        title="مشاهده بازیگر در گراف"
                      >
                        <span>{actor.flagEmoji || '🏛️'}</span>
                        <span className="font-medium">{actor.nameFa}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{currentEra.powerShiftsFa}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Docked Timeline Control Bar */}
      <div
        className="w-full max-w-5xl mx-auto bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-2 sm:p-2.5 transition-all"
        id="timeline-main-bar"
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Left Controls: Play/Pause, Step, Info */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 shrink-0 px-1 border-b lg:border-b-0 lg:border-l lg:border-slate-800 pb-2 lg:pb-0 lg:pl-3">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                title="دوره قبلی"
                id="btn-timeline-prev"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-md ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold animate-pulse'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
                title={isPlaying ? 'توقف پخش خط زمانی' : 'پخش خودکار تحولات تاریخ'}
                id="btn-timeline-play"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span className="hidden sm:inline">توقف</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span className="hidden sm:inline">پخش تاریخی</span>
                  </>
                )}
              </button>

              <button
                onClick={handleNext}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                title="دوره بعدی"
                id="btn-timeline-next"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {isPlaying && (
                <button
                  onClick={() => setPlaySpeed(playSpeed === 1 ? 2 : 1)}
                  className="px-2 py-1 text-[10px] rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono"
                  title="تغییر سرعت پخش"
                >
                  {playSpeed}x
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onSelectEra('all')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  selectedEraId === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="نمایش تمام روابط بدون فیلتر زمانی"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>همه دوره‌ها</span>
              </button>

              {currentEra && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`p-1.5 sm:px-2 sm:py-1.5 rounded-xl text-xs flex items-center gap-1 transition-colors ${
                    isExpanded
                      ? 'bg-slate-800 text-cyan-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                  title={isExpanded ? 'بستن کارت توضیحات دوره' : 'مشاهده تحلیل تفصیلی دوره'}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تحلیل</span>
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          {/* Era Nodes Track: Clickable Horizontal Segment Bar */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-slate-800 px-1">
            {TIMELINE_ERAS.map((era, index) => {
              const isSelected = era.id === selectedEraId;
              return (
                <button
                  key={era.id}
                  onClick={() => onSelectEra(era.id)}
                  className={`flex-1 min-w-[130px] sm:min-w-[140px] p-2 rounded-xl border text-right transition-all group relative ${
                    isSelected
                      ? `bg-gradient-to-r ${era.accentClass} shadow-lg shadow-cyan-950/40 border-current font-bold scale-[1.02] ring-1 ring-cyan-500/50`
                      : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800/90 text-slate-400 hover:text-slate-200'
                  }`}
                  title={`${era.nameFa} (${era.periodFa})`}
                >
                  {/* Top Indicator bar */}
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="flex items-center gap-1">
                      <span className="text-xs">{era.icon}</span>
                      <span className="font-mono font-semibold">{era.periodFa}</span>
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full transition-all ${
                        isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700 group-hover:bg-slate-500'
                      }`}
                    />
                  </div>

                  {/* Title */}
                  <div
                    className={`text-[11px] sm:text-xs leading-tight line-clamp-1 ${
                      isSelected ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {era.nameFa}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Era Quick Banner (When not fully expanded) */}
        {!isExpanded && currentEra && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400 px-2 font-vazir">
            <div className="flex items-center gap-2 truncate">
              <span className="text-cyan-400 font-bold flex items-center gap-1 shrink-0">
                <span>{currentEra.icon}</span>
                <span>{currentEra.nameFa}:</span>
              </span>
              <span className="text-slate-300 truncate">{currentEra.headlineFa}</span>
            </div>

            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline shrink-0 mr-3 flex items-center gap-0.5"
            >
              <span>جزئیات رویدادها</span>
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
