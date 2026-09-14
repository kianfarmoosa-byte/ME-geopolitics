import React, { useState, useMemo } from 'react';
import { ActorData, GraphLink, RelationType } from '../types';
import { CATEGORY_COLORS, RELATION_CONFIG } from '../data';
import { 
  Target, 
  X, 
  ShieldAlert, 
  Handshake, 
  Coins, 
  MessageSquareQuote, 
  Maximize2, 
  FileText, 
  ChevronRight, 
  Layers, 
  ArrowLeftRight,
  Flame,
  CheckCircle2,
  HelpCircle,
  Eye
} from 'lucide-react';

export type StrategicLayerType = 'all' | 'military' | 'alliance' | 'economic' | 'diplomatic';

export interface StrategicLayerConfig {
  id: StrategicLayerType;
  nameFa: string;
  nameEn: string;
  icon: string;
  types: RelationType[];
  color: string;
  bgColor: string;
  borderColor: string;
}

export const STRATEGIC_LAYERS: Record<StrategicLayerType, StrategicLayerConfig> = {
  all: {
    id: 'all',
    nameFa: 'همه لایه‌ها',
    nameEn: 'All Strategic Layers',
    icon: '🌐',
    types: ['alliance', 'conflict', 'economic', 'diplomatic', 'proxy_cyber', 'volatile'],
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  military: {
    id: 'military',
    nameFa: 'امنیتی و تقابل نظامی',
    nameEn: 'Security & Military',
    icon: '⚔️',
    types: ['conflict', 'proxy_cyber'],
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  alliance: {
    id: 'alliance',
    nameFa: 'هم‌پیمانی و بازدارندگی',
    nameEn: 'Strategic Alliances',
    icon: '🤝',
    types: ['alliance'],
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  economic: {
    id: 'economic',
    nameFa: 'ژئواکونومیک و انرژی',
    nameEn: 'Geo-economics & Energy',
    icon: '💼',
    types: ['economic'],
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  diplomatic: {
    id: 'diplomatic',
    nameFa: 'دیپلماسی و نوسانی',
    nameEn: 'Diplomatic & Volatile',
    icon: '🕊️',
    types: ['diplomatic', 'volatile'],
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
};

export function getLinkLayer(relationType: RelationType): StrategicLayerType {
  if (relationType === 'conflict' || relationType === 'proxy_cyber') return 'military';
  if (relationType === 'alliance') return 'alliance';
  if (relationType === 'economic') return 'economic';
  return 'diplomatic';
}

interface FocusViewOverlayProps {
  focusedActor: ActorData | null;
  allActorsMap: Map<string, ActorData>;
  directLinks: GraphLink[];
  activeLayer: StrategicLayerType;
  onChangeLayer: (layer: StrategicLayerType) => void;
  onExitFocusView: () => void;
  onCenterOnActor: (actorId: string) => void;
  onSelectActorForFocus: (actor: ActorData) => void;
  onOpenDetailsModal?: (actor: ActorData) => void;
}

export const FocusViewOverlay: React.FC<FocusViewOverlayProps> = ({
  focusedActor,
  allActorsMap,
  directLinks,
  activeLayer,
  onChangeLayer,
  onExitFocusView,
  onCenterOnActor,
  onSelectActorForFocus,
  onOpenDetailsModal,
}) => {
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Group direct relationships by layer
  const layeredData = useMemo(() => {
    if (!focusedActor) {
      return { military: [], alliance: [], economic: [], diplomatic: [] };
    }

    const military: { neighbor: ActorData; link: GraphLink }[] = [];
    const alliance: { neighbor: ActorData; link: GraphLink }[] = [];
    const economic: { neighbor: ActorData; link: GraphLink }[] = [];
    const diplomatic: { neighbor: ActorData; link: GraphLink }[] = [];

    directLinks.forEach((link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source;
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
      const neighborId = srcId === focusedActor.id ? tgtId : srcId;
      const neighbor = allActorsMap.get(neighborId);
      if (!neighbor) return;

      const layer = getLinkLayer(link.type);
      if (layer === 'military') military.push({ neighbor, link });
      else if (layer === 'alliance') alliance.push({ neighbor, link });
      else if (layer === 'economic') economic.push({ neighbor, link });
      else diplomatic.push({ neighbor, link });
    });

    return { military, alliance, economic, diplomatic };
  }, [directLinks, focusedActor, allActorsMap]);

  if (!focusedActor) {
    return null;
  }

  const totalNeighborsCount = directLinks.length;
  const categoryConfig = CATEGORY_COLORS[focusedActor.category];

  return (
    <>
      {/* Top Floating Command Bar for Focus View */}
      <div
        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 w-[96%] max-w-4xl bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl p-3 sm:p-4 text-right font-vazir animate-in fade-in slide-in-from-top-4 duration-300 select-none"
        id="focus-view-command-bar"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Focal Actor Identity */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-700 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
                {focusedActor.flagEmoji || '🎯'}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 items-center justify-center text-[9px] text-slate-950 font-bold">
                  🎯
                </span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  نمای تمرکز عمیق (Focus View)
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{
                    backgroundColor: `${categoryConfig?.hex}20`,
                    color: categoryConfig?.hex,
                  }}
                >
                  {focusedActor.category}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-base font-extrabold text-slate-100">{focusedActor.nameFa}</h2>
                <span className="text-xs text-slate-400 font-sans">{focusedActor.nameEn}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 mr-auto self-end md:self-center">
            {/* Inspector Toggle Button */}
            <button
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isInspectorOpen
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
              title="مشاهده فهرست تفکیک‌شده روابط لایه‌بندی شده"
              id="btn-toggle-focus-inspector"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-300" />
              <span>فهرست روابط لایه‌بندی ({totalNeighborsCount})</span>
            </button>

            {/* Center on Actor */}
            <button
              onClick={() => onCenterOnActor(focusedActor.id)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="مرکزیت مجدد دوربین روی گره کانونی"
              id="btn-focus-recenter"
            >
              <Maximize2 className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Dossier */}
            {onOpenDetailsModal && (
              <button
                onClick={() => onOpenDetailsModal(focusedActor)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="مشاهده پرونده کامل اطلاعاتی"
                id="btn-focus-dossier"
              >
                <FileText className="w-4 h-4 text-indigo-400" />
              </button>
            )}

            {/* Exit Focus View */}
            <button
              onClick={onExitFocusView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors text-xs font-bold"
              title="خروج از نمای فوکوس (Esc)"
              id="btn-exit-focus-view"
            >
              <X className="w-3.5 h-3.5" />
              <span>خروج از فوکوس</span>
            </button>
          </div>
        </div>

        {/* Strategic Layer Filters */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
            <span className="text-[11px] text-slate-400 ml-1">فیلتر لایه‌ها:</span>
            
            {/* All Layers */}
            <button
              onClick={() => onChangeLayer('all')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeLayer === 'all'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
              id="layer-btn-all"
            >
              <span>{STRATEGIC_LAYERS.all.icon}</span>
              <span>همه ({totalNeighborsCount})</span>
            </button>

            {/* Military Layer */}
            <button
              onClick={() => onChangeLayer('military')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeLayer === 'military'
                  ? 'bg-rose-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-rose-300 border border-slate-800'
              }`}
              id="layer-btn-military"
            >
              <span>{STRATEGIC_LAYERS.military.icon}</span>
              <span>امنیتی و نظامی ({layeredData.military.length})</span>
            </button>

            {/* Alliance Layer */}
            <button
              onClick={() => onChangeLayer('alliance')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeLayer === 'alliance'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-emerald-300 border border-slate-800'
              }`}
              id="layer-btn-alliance"
            >
              <span>{STRATEGIC_LAYERS.alliance.icon}</span>
              <span>هم‌پیمانی راهبردی ({layeredData.alliance.length})</span>
            </button>

            {/* Economic Layer */}
            <button
              onClick={() => onChangeLayer('economic')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeLayer === 'economic'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-amber-300 border border-slate-800'
              }`}
              id="layer-btn-economic"
            >
              <span>{STRATEGIC_LAYERS.economic.icon}</span>
              <span>ژئواکونومیک و انرژی ({layeredData.economic.length})</span>
            </button>

            {/* Diplomatic Layer */}
            <button
              onClick={() => onChangeLayer('diplomatic')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                activeLayer === 'diplomatic'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-cyan-300 border border-slate-800'
              }`}
              id="layer-btn-diplomatic"
            >
              <span>{STRATEGIC_LAYERS.diplomatic.icon}</span>
              <span>دیپلماسی و نوسانی ({layeredData.diplomatic.length})</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-500 hidden sm:flex items-center gap-1 mr-auto">
            <span>💡 دبل‌کلیک روی هر گره همسایه جهت فوکوس سریع | کلید Esc جهت خروج</span>
          </div>
        </div>
      </div>

      {/* Layered Relationships Inspector Panel (Slide-in Drawer) */}
      {isInspectorOpen && (
        <div
          className="absolute top-28 left-4 sm:left-6 z-30 w-84 sm:w-96 max-h-[calc(100vh-140px)] bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-vazir text-right animate-in fade-in slide-in-from-left-4 duration-200"
          id="focus-layered-inspector"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-extrabold text-slate-200">
                روابط لایه‌بندی‌شده با {focusedActor.nameFa}
              </h3>
            </div>
            <button
              onClick={() => setIsInspectorOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List of Layers and Connected Neighbors */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar text-xs">
            {/* 1. Military Layer */}
            {layeredData.military.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-rose-400 border-b border-rose-950/80 pb-1">
                  <span className="flex items-center gap-1.5">
                    <span>⚔️</span>
                    <span>لایه امنیتی و تقابل نظامی</span>
                  </span>
                  <span className="bg-rose-950 px-1.5 py-0.5 rounded text-[10px] border border-rose-800/60">
                    {layeredData.military.length} رابطه
                  </span>
                </div>

                <div className="space-y-1.5">
                  {layeredData.military.map(({ neighbor, link }) => (
                    <div
                      key={link.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-rose-700/60 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{neighbor.flagEmoji || '🏛️'}</span>
                          <span className="font-bold text-slate-200">{neighbor.nameFa}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/50">
                          شدت {link.intensity}/5
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                        {link.description}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800/60">
                        <button
                          onClick={() => onSelectActorForFocus(neighbor)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-rose-100 text-[10px] transition-colors flex items-center gap-1"
                        >
                          <span>فوکوس روی این گره</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Alliance Layer */}
            {layeredData.alliance.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 border-b border-emerald-950/80 pb-1">
                  <span className="flex items-center gap-1.5">
                    <span>🤝</span>
                    <span>لایه هم‌پیمانی راهبردی و بازدارندگی</span>
                  </span>
                  <span className="bg-emerald-950 px-1.5 py-0.5 rounded text-[10px] border border-emerald-800/60">
                    {layeredData.alliance.length} رابطه
                  </span>
                </div>

                <div className="space-y-1.5">
                  {layeredData.alliance.map(({ neighbor, link }) => (
                    <div
                      key={link.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-700/60 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{neighbor.flagEmoji || '🏛️'}</span>
                          <span className="font-bold text-slate-200">{neighbor.nameFa}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                          شدت {link.intensity}/5
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                        {link.description}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800/60">
                        <button
                          onClick={() => onSelectActorForFocus(neighbor)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-900 text-slate-300 hover:text-emerald-100 text-[10px] transition-colors flex items-center gap-1"
                        >
                          <span>فوکوس روی این گره</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Economic Layer */}
            {layeredData.economic.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 border-b border-amber-950/80 pb-1">
                  <span className="flex items-center gap-1.5">
                    <span>💼</span>
                    <span>لایه ژئواکونومیک، تجارت و انرژی</span>
                  </span>
                  <span className="bg-amber-950 px-1.5 py-0.5 rounded text-[10px] border border-amber-800/60">
                    {layeredData.economic.length} رابطه
                  </span>
                </div>

                <div className="space-y-1.5">
                  {layeredData.economic.map(({ neighbor, link }) => (
                    <div
                      key={link.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-700/60 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{neighbor.flagEmoji || '🏛️'}</span>
                          <span className="font-bold text-slate-200">{neighbor.nameFa}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50">
                          شدت {link.intensity}/5
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                        {link.description}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800/60">
                        <button
                          onClick={() => onSelectActorForFocus(neighbor)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-900 text-slate-300 hover:text-amber-100 text-[10px] transition-colors flex items-center gap-1"
                        >
                          <span>فوکوس روی این گره</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Diplomatic Layer */}
            {layeredData.diplomatic.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400 border-b border-cyan-950/80 pb-1">
                  <span className="flex items-center gap-1.5">
                    <span>🕊️</span>
                    <span>لایه دیپلماسی، میانجی‌گری و رقابت نوسانی</span>
                  </span>
                  <span className="bg-cyan-950 px-1.5 py-0.5 rounded text-[10px] border border-cyan-800/60">
                    {layeredData.diplomatic.length} رابطه
                  </span>
                </div>

                <div className="space-y-1.5">
                  {layeredData.diplomatic.map(({ neighbor, link }) => (
                    <div
                      key={link.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-700/60 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{neighbor.flagEmoji || '🏛️'}</span>
                          <span className="font-bold text-slate-200">{neighbor.nameFa}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                          شدت {link.intensity}/5
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                        {link.description}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800/60">
                        <button
                          onClick={() => onSelectActorForFocus(neighbor)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-900 text-slate-300 hover:text-cyan-100 text-[10px] transition-colors flex items-center gap-1"
                        >
                          <span>فوکوس روی این گره</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
