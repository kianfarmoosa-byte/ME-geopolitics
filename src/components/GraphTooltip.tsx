import React, { useMemo } from 'react';
import { ActorData, GraphLink, RelationType } from '../types';
import { CATEGORY_COLORS, RELATION_CONFIG } from '../data';
import { getLinkLayer, STRATEGIC_LAYERS } from './FocusViewOverlay';
import { 
  Shield, 
  Swords, 
  Coins, 
  Handshake, 
  Radio, 
  Flame, 
  Compass, 
  MapPin, 
  UserCheck, 
  AlertTriangle,
  ArrowRightLeft,
  Target,
  FileText
} from 'lucide-react';

interface GraphTooltipProps {
  activeHoveredActor: ActorData | null;
  hoveredLink: GraphLink | null;
  tooltipPos: { x: number; y: number } | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  selectedActor: ActorData | null;
  focusedActor: ActorData | null;
  allActorsMap: Map<string, ActorData>;
  links: GraphLink[];
  onOpenDetailsModal?: (actor: ActorData) => void;
  onEnterFocusView?: (actor: ActorData) => void;
}

export const GraphTooltip: React.FC<GraphTooltipProps> = ({
  activeHoveredActor,
  hoveredLink,
  tooltipPos,
  containerRef,
  selectedActor,
  focusedActor,
  allActorsMap,
  links,
  onOpenDetailsModal,
  onEnterFocusView,
}) => {
  // If neither actor nor link is hovered, or no position, don't render
  if (!tooltipPos || (!activeHoveredActor && !hoveredLink)) {
    return null;
  }

  // Calculate smart boundary-safe placement
  const placementStyle = useMemo(() => {
    if (!tooltipPos || !containerRef.current) {
      return { left: `${tooltipPos?.x || 0}px`, top: `${tooltipPos?.y || 0}px`, transform: 'translate(-50%, -100%)' };
    }

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const { x, y } = tooltipPos;

    // Flip vertical: if too close to top, show below cursor
    const flipBottom = y < 280;
    
    // Clamp horizontal: if too close to left or right edges
    const isFarLeft = x < 180;
    const isFarRight = x > containerWidth - 180;

    let transform = '';
    let left = x;
    let top = y;

    if (isFarLeft) {
      left = Math.max(16, x);
      transform += 'translateX(8px) ';
    } else if (isFarRight) {
      left = Math.min(containerWidth - 16, x);
      transform += 'translateX(calc(-100% - 8px)) ';
    } else {
      transform += 'translateX(-50%) ';
    }

    if (flipBottom) {
      top = y + 16;
      transform += 'translateY(0)';
    } else {
      top = y - 12;
      transform += 'translateY(-100%)';
    }

    return {
      left: `${left}px`,
      top: `${top}px`,
      transform,
    };
  }, [tooltipPos, containerRef]);

  // Statistics for hovered actor
  const actorStats = useMemo(() => {
    if (!activeHoveredActor) return null;

    const connectedLinks = links.filter((l) => {
      const sId = typeof l.source === 'object' ? (l.source as { id: string }).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as { id: string }).id : l.target;
      return sId === activeHoveredActor.id || tId === activeHoveredActor.id;
    });

    const counts: Record<RelationType, number> = {
      alliance: 0,
      conflict: 0,
      economic: 0,
      diplomatic: 0,
      proxy_cyber: 0,
      volatile: 0,
    };

    connectedLinks.forEach((l) => {
      if (counts[l.type] !== undefined) {
        counts[l.type]++;
      }
    });

    // Check direct bilateral relationship with selectedActor if any
    let directLinkWithSelected: GraphLink | null = null;
    if (selectedActor && selectedActor.id !== activeHoveredActor.id) {
      directLinkWithSelected = connectedLinks.find((l) => {
        const sId = typeof l.source === 'object' ? (l.source as { id: string }).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as { id: string }).id : l.target;
        return (
          (sId === selectedActor.id && tId === activeHoveredActor.id) ||
          (tId === selectedActor.id && sId === activeHoveredActor.id)
        );
      }) || null;
    }

    return {
      total: connectedLinks.length,
      counts,
      directLinkWithSelected,
    };
  }, [activeHoveredActor, links, selectedActor]);

  // Details for hovered link
  const linkDetails = useMemo(() => {
    if (!hoveredLink) return null;

    const sId = typeof hoveredLink.source === 'object' ? (hoveredLink.source as { id: string }).id : hoveredLink.source;
    const tId = typeof hoveredLink.target === 'object' ? (hoveredLink.target as { id: string }).id : hoveredLink.target;

    const sourceActor = allActorsMap.get(sId);
    const targetActor = allActorsMap.get(tId);
    const layer = getLinkLayer(hoveredLink.type);
    const layerCfg = STRATEGIC_LAYERS[layer];
    const relationCfg = RELATION_CONFIG[hoveredLink.type];

    let intensityLabel = 'متوسط';
    if (hoveredLink.intensity === 5) intensityLabel = 'بسیار شدید / بحرانی';
    else if (hoveredLink.intensity === 4) intensityLabel = 'شدید و راهبردی';
    else if (hoveredLink.intensity === 3) intensityLabel = 'مستمر و فعال';
    else if (hoveredLink.intensity === 2) intensityLabel = 'محدود / در حال شکل‌گیری';
    else if (hoveredLink.intensity === 1) intensityLabel = 'نمادین / اولیه';

    return {
      sourceActor,
      targetActor,
      layerCfg,
      relationCfg,
      intensityLabel,
    };
  }, [hoveredLink, allActorsMap]);

  // 1. Render Hovered Link Tooltip
  if (hoveredLink && linkDetails && !activeHoveredActor) {
    const { sourceActor, targetActor, layerCfg, relationCfg, intensityLabel } = linkDetails;

    return (
      <div
        className="absolute z-50 pointer-events-none transition-opacity duration-150 animate-in fade-in zoom-in-95"
        style={placementStyle}
        id="geopolitical-link-tooltip"
      >
        <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 w-80 max-w-sm text-right text-slate-100 ring-1 ring-white/10">
          {/* Header: Source and Target */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            {/* Source */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base">{sourceActor?.flagEmoji || '🌐'}</span>
              <span className="text-xs font-bold text-slate-200 font-vazir truncate max-w-[90px]">
                {sourceActor?.nameFa || 'بازیگر مبدأ'}
              </span>
            </div>

            {/* Direction Indicator */}
            <div className="flex flex-col items-center px-2">
              <div 
                className="p-1 rounded-full border flex items-center justify-center text-xs"
                style={{
                  backgroundColor: `${relationCfg?.color || '#38bdf8'}20`,
                  borderColor: relationCfg?.color || '#38bdf8',
                  color: relationCfg?.color || '#38bdf8'
                }}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Target */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-200 font-vazir truncate max-w-[90px]">
                {targetActor?.nameFa || 'بازیگر مقصد'}
              </span>
              <span className="text-base">{targetActor?.flagEmoji || '🌐'}</span>
            </div>
          </div>

          {/* Relation Type Badge & Strategic Layer */}
          <div className="flex items-center justify-between mt-3 mb-2">
            <div className="flex items-center gap-1.5">
              <span 
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: relationCfg?.color || '#38bdf8' }}
              />
              <span className="text-xs font-bold text-slate-100 font-vazir">
                {hoveredLink.typeFa}
              </span>
            </div>

            <span 
              className="text-[10px] px-2 py-0.5 rounded-md font-medium border"
              style={{
                backgroundColor: `${layerCfg?.color || '#38bdf8'}15`,
                borderColor: `${layerCfg?.color || '#38bdf8'}40`,
                color: layerCfg?.color || '#38bdf8',
              }}
            >
              {layerCfg?.icon} {layerCfg?.nameFa}
            </span>
          </div>

          {/* Intensity Progress Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 mb-2.5">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400 font-vazir">شدت راهبردی:</span>
              <span className="font-bold font-vazir" style={{ color: relationCfg?.color || '#38bdf8' }}>
                {intensityLabel} ({hoveredLink.intensity}/۵)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex gap-0.5 p-0.5">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div
                  key={lvl}
                  className={`h-full flex-1 rounded-sm transition-all ${
                    lvl <= hoveredLink.intensity ? 'opacity-100' : 'opacity-20'
                  }`}
                  style={{
                    backgroundColor: lvl <= hoveredLink.intensity ? relationCfg?.color || '#38bdf8' : '#475569',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Analytical Description */}
          <div className="text-[11px] text-slate-300 leading-relaxed font-vazir bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60 mb-2 max-h-32 overflow-y-auto">
            {hoveredLink.description}
          </div>

          {/* Micro hint */}
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-vazir pt-1 border-t border-slate-800/80">
            <span>💡 کلیک روی یال جهت برجسته‌سازی این بردار ارتباطی</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Render Hovered Node Tooltip
  if (activeHoveredActor) {
    const categoryConfig = CATEGORY_COLORS[activeHoveredActor.category];
    const score = activeHoveredActor.influenceScore || 3;

    let powerTitle = 'قدرت منطقه‌ای';
    if (score === 5) powerTitle = 'هژمون / ابرقدرت راهبردی';
    else if (score === 4) powerTitle = 'قدرت منطقه‌ای محوری';
    else if (score === 3) powerTitle = 'بازیگر تأثیرگذار منطقه‌ای';
    else if (score === 2) powerTitle = 'بازیگر تخصصی یا پیرامونی';
    else powerTitle = 'کنشگر با دامنه محدود';

    return (
      <div
        className="absolute z-50 pointer-events-none transition-opacity duration-150 animate-in fade-in zoom-in-95"
        style={placementStyle}
        id="geopolitical-actor-tooltip"
      >
        <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 w-84 max-w-sm text-right text-slate-100 ring-1 ring-white/10">
          {/* Header: Flag, Name, Category */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-2xl drop-shadow">{activeHoveredActor.flagEmoji || '🌐'}</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-slate-100 text-sm font-vazir">
                    {activeHoveredActor.nameFa}
                  </h4>
                  {activeHoveredActor.acronym && (
                    <span className="text-[10px] font-mono font-semibold bg-slate-800 text-cyan-300 px-1.5 py-0.2 rounded border border-slate-700">
                      {activeHoveredActor.acronym}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-sans tracking-wide">
                  {activeHoveredActor.nameEn}
                </p>
              </div>
            </div>

            {/* Category badge */}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium border text-center whitespace-nowrap"
              style={{
                backgroundColor: `${categoryConfig?.hex || '#38bdf8'}15`,
                borderColor: `${categoryConfig?.hex || '#38bdf8'}40`,
                color: categoryConfig?.hex || '#38bdf8',
              }}
            >
              {activeHoveredActor.primaryClass?.split('/')[0] || activeHoveredActor.category}
            </span>
          </div>

          {/* Influence Meter Bar */}
          <div className="flex items-center justify-between mt-2.5 mb-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1 text-[11px] text-slate-300 font-vazir">
              <span className="text-amber-400">⚡</span>
              <span>{powerTitle}</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div
                  key={lvl}
                  className={`w-3.5 h-1.5 rounded-xs transition-colors ${
                    lvl <= score ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'bg-slate-800'
                  }`}
                />
              ))}
              <span className="text-[10px] font-bold text-amber-300 mr-1">{score}/۵</span>
            </div>
          </div>

          {/* Core Geopolitical Role */}
          <div className="mb-2 text-[11.5px] text-slate-200 leading-relaxed font-vazir bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
            <p className="line-clamp-3">
              {activeHoveredActor.geopoliticalRole}
            </p>
          </div>

          {/* Key Facts: Geography, Alignment, Leader */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] mb-2.5 text-slate-300 font-vazir">
            <div className="flex items-center gap-1 bg-slate-900/40 px-2 py-1 rounded border border-slate-800/40">
              <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="text-slate-400 text-[10px]">موقعیت:</span>
              <span className="truncate text-slate-200">{activeHoveredActor.geography}</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-900/40 px-2 py-1 rounded border border-slate-800/40">
              <Compass className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="text-slate-400 text-[10px]">جهت‌گیری:</span>
              <span className="truncate text-slate-200">{activeHoveredActor.alignment}</span>
            </div>
            {activeHoveredActor.leader && (
              <div className="col-span-2 flex items-center gap-1 bg-slate-900/40 px-2 py-1 rounded border border-slate-800/40">
                <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-slate-400 text-[10px]">رهبری / فرماندهی:</span>
                <span className="truncate text-slate-200">{activeHoveredActor.leader}</span>
              </div>
            )}
            {activeHoveredActor.f5_redlines && (
              <div className="col-span-2 flex items-start gap-1 bg-rose-950/20 px-2 py-1 rounded border border-rose-900/40 text-rose-300 text-[10.5px]">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold text-rose-400 text-[10px] shrink-0">خط قرمز:</span>
                <span className="line-clamp-1">{activeHoveredActor.f5_redlines}</span>
              </div>
            )}
          </div>

          {/* Network Connections Breakdown */}
          {actorStats && (
            <div className="border-t border-slate-800/80 pt-2 mb-2">
              <div className="flex items-center justify-between text-[10.5px] text-slate-400 mb-1.5 font-vazir">
                <span>روابط در این شبکه ({actorStats.total} پیوند):</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] font-vazir text-center">
                <div className="bg-emerald-950/30 border border-emerald-800/40 rounded px-1 py-0.5 text-emerald-300">
                  🛡️ هم‌پیمان: {actorStats.counts.alliance}
                </div>
                <div className="bg-rose-950/30 border border-rose-800/40 rounded px-1 py-0.5 text-rose-300">
                  ⚔️ تقابل: {actorStats.counts.conflict}
                </div>
                <div className="bg-amber-950/30 border border-amber-800/40 rounded px-1 py-0.5 text-amber-300">
                  💰 اقتصادی: {actorStats.counts.economic}
                </div>
                <div className="bg-cyan-950/30 border border-cyan-800/40 rounded px-1 py-0.5 text-cyan-300">
                  🕊️ دیپلماسی: {actorStats.counts.diplomatic}
                </div>
                <div className="bg-purple-950/30 border border-purple-800/40 rounded px-1 py-0.5 text-purple-300">
                  🌐 سایبری/نیابتی: {actorStats.counts.proxy_cyber}
                </div>
                <div className="bg-orange-950/30 border border-orange-800/40 rounded px-1 py-0.5 text-orange-300">
                  ⚡ نوسانی: {actorStats.counts.volatile}
                </div>
              </div>
            </div>
          )}

          {/* Bilateral Link Insight with currently selected actor */}
          {selectedActor && selectedActor.id !== activeHoveredActor.id && actorStats?.directLinkWithSelected && (
            <div className="mt-2 p-2 rounded-lg bg-sky-950/40 border border-sky-600/50 text-[11px] font-vazir text-sky-200">
              <div className="flex items-center gap-1 font-bold text-sky-300 mb-0.5">
                <span>🔗 رابطه مستقیم با {selectedActor.nameFa}:</span>
              </div>
              <div className="text-[10px] text-slate-300">
                <span className="font-semibold text-sky-400">{actorStats.directLinkWithSelected.typeFa}</span> (شدت {actorStats.directLinkWithSelected.intensity}/۵) - {actorStats.directLinkWithSelected.description.slice(0, 75)}...
              </div>
            </div>
          )}

          {/* Micro-UX action guidance */}
          <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] flex flex-col gap-1 text-slate-400 font-vazir">
            <div className="flex items-center justify-between text-cyan-400">
              <span>👆 کلیک: تمرکز بر همسایگان</span>
              <span>⚡ دبل‌کلیک: Focus View لایه‌بندی</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
