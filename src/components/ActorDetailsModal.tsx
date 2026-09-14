import React from 'react';
import { ActorData, GeopoliticalRelationship } from '../types';
import { CATEGORY_COLORS, RELATION_CONFIG } from '../data';
import { 
  X, 
  ShieldAlert, 
  Globe2, 
  Flame, 
  Handshake, 
  Zap, 
  Coins, 
  Radio, 
  ChevronLeft,
  Share2,
  Route
} from 'lucide-react';

interface ActorDetailsModalProps {
  actor: ActorData;
  relationships: GeopoliticalRelationship[];
  allActorsMap: Map<string, ActorData>;
  onClose: () => void;
  onSelectActor: (actor: ActorData) => void;
  onSetPathStart?: (actorId: string) => void;
  onSetPathEnd?: (actorId: string) => void;
}

export const ActorDetailsModal: React.FC<ActorDetailsModalProps> = ({
  actor,
  relationships,
  allActorsMap,
  onClose,
  onSelectActor,
  onSetPathStart,
  onSetPathEnd,
}) => {
  if (!actor) return null;

  const categoryConfig = CATEGORY_COLORS[actor.category];

  // Get direct relationships for this actor
  const directRelationships = relationships.filter(
    (rel) => rel.source === actor.id || rel.target === actor.id
  );

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[540px] bg-slate-900/98 border-l border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col transition-all duration-300 overflow-hidden"
      id="actor-details-drawer"
    >
      {/* Top Header Bar */}
      <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/60">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-2xl shadow-inner shrink-0">
            {actor.flagEmoji || '🏛️'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-100 font-vazir leading-tight">
                {actor.nameFa}
              </h2>
              {actor.acronym && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-cyan-400 border border-slate-700">
                  {actor.acronym}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">{actor.nameEn}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0"
          id="btn-close-details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Action Quickbar */}
      <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span 
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border"
            style={{
              backgroundColor: `${categoryConfig?.hex}18`,
              borderColor: `${categoryConfig?.hex}40`,
              color: categoryConfig?.hex,
            }}
          >
            {actor.category}
          </span>
          <span className="text-slate-400 px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/50">
            {actor.alignment}
          </span>
        </div>

        {/* Path finding buttons */}
        <div className="flex items-center gap-1.5">
          {onSetPathStart && (
            <button
              onClick={() => onSetPathStart(actor.id)}
              className="px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/40 transition-colors flex items-center gap-1"
              title="تعیین به عنوان مبدأ تحلیل مسیر ارتباطی"
            >
              <Route className="w-3 h-3" />
              <span>مبدأ</span>
            </button>
          )}
          {onSetPathEnd && (
            <button
              onClick={() => onSetPathEnd(actor.id)}
              className="px-2.5 py-1 rounded bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-700/40 transition-colors flex items-center gap-1"
              title="تعیین به عنوان مقصد تحلیل مسیر ارتباطی"
            >
              <Route className="w-3 h-3" />
              <span>مقصد</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Core Attributes Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl text-center">
            <span className="text-[11px] text-slate-500 block mb-1">شاخص نفوذ راهبردی</span>
            <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-base">
              <span>{actor.influenceScore}</span>
              <span className="text-xs text-slate-500 font-normal">/ ۵</span>
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl text-center">
            <span className="text-[11px] text-slate-500 block mb-1">جغرافیا و حوزه نفوذ</span>
            <span className="text-xs font-semibold text-slate-200 block truncate font-vazir">
              {actor.geography}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl text-center">
            <span className="text-[11px] text-slate-500 block mb-1">وضعیت عملیاتی</span>
            <span className="text-xs font-semibold text-emerald-400 block truncate font-vazir">
              {actor.status === 'sanctioned'
                ? 'تحت تحریم'
                : actor.status === 'contested'
                ? 'متنازع‌فیه'
                : actor.status === 'non_state'
                ? 'غیردولتی'
                : 'فعال رسمی'}
            </span>
          </div>
        </div>

        {/* Leadership or Headquarters */}
        {(actor.leader || actor.headquarters) && (
          <div className="bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-xl flex items-center justify-between text-xs">
            {actor.leader && (
              <div>
                <span className="text-slate-500 block text-[10px]">رهبری / مدیریت کلان:</span>
                <span className="text-slate-200 font-bold font-vazir">{actor.leader}</span>
              </div>
            )}
            {actor.headquarters && (
              <div className="text-left">
                <span className="text-slate-500 block text-[10px]">مقر اصلی / پایتخت:</span>
                <span className="text-slate-200 font-semibold font-vazir">{actor.headquarters}</span>
              </div>
            )}
          </div>
        )}

        {/* Geopolitical Role & Strategic Stance */}
        <div>
          <h3 className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <Globe2 className="w-4 h-4" />
            نقش ژئوپلیتیک و جایگاه در چشم‌انداز ۲۰۲۶
          </h3>
          <p className="text-xs leading-relaxed text-slate-300 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 text-justify font-vazir">
            {actor.geopoliticalRole}
          </p>
        </div>

        {/* Military and Strategic Capabilities */}
        {actor.militaryCapabilities && (
          <div>
            <h3 className="text-xs font-bold text-rose-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              توانمندی‌های نظامی، دفاعی و بازدارندگی
            </h3>
            <p className="text-xs leading-relaxed text-slate-300 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 text-justify font-vazir">
              {actor.militaryCapabilities}
            </p>
          </div>
        )}

        {/* Economic and Energy Leverage */}
        {actor.economicLeverage && (
          <div>
            <h3 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Coins className="w-4 h-4" />
              اهرم‌های اقتصادی، انرژی و شریان‌های ترانزیتی
            </h3>
            <p className="text-xs leading-relaxed text-slate-300 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 text-justify font-vazir">
              {actor.economicLeverage}
            </p>
          </div>
        )}

        {/* Strategic Alliances & Fronts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Alliances List */}
          {actor.alliances && actor.alliances.length > 0 && (
            <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl">
              <h4 className="text-xs font-bold text-emerald-400 mb-2.5 flex items-center gap-1.5">
                <Handshake className="w-3.5 h-3.5" />
                هم‌پیمانان و ائتلاف‌های کلیدی
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {actor.alliances.map((allyName, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded bg-emerald-950/40 text-emerald-300 text-[11px] border border-emerald-800/40 font-vazir"
                  >
                    {allyName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Active Conflicts List */}
          {actor.activeConflicts && actor.activeConflicts.length > 0 && (
            <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl">
              <h4 className="text-xs font-bold text-rose-400 mb-2.5 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                جبهه‌های منازعه و تقابل
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {actor.activeConflicts.map((conflictName, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded bg-rose-950/40 text-rose-300 text-[11px] border border-rose-800/40 font-vazir"
                  >
                    {conflictName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Key Chokepoints and Geostrategic Assets */}
        {actor.chokepoints && actor.chokepoints.length > 0 && (
          <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl">
            <h4 className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              تنگه‌های راهبردی و زیرساخت‌های کلیدی تحت کنترل
            </h4>
            <div className="flex flex-wrap gap-2">
              {actor.chokepoints.map((cp, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950/50 text-cyan-300 text-xs border border-cyan-800/50 font-vazir"
                >
                  {cp}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Direct Network Relationships Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-200 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-cyan-400" />
              روابط ثبت‌شده در ماتریس شبکه ({directRelationships.length})
            </span>
          </h3>

          {directRelationships.length === 0 ? (
            <div className="text-xs text-slate-500 bg-slate-950/40 p-4 rounded-xl border border-slate-800 text-center">
              ارتباط مستقیمی با سایر بازیگران فیلترشده در این سطح ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-2">
              {directRelationships.map((rel) => {
                const isSource = rel.source === actor.id;
                const otherActorId = isSource ? rel.target : rel.source;
                const otherActor = allActorsMap.get(otherActorId);
                const relConfig = RELATION_CONFIG[rel.type];

                return (
                  <div
                    key={rel.id}
                    onClick={() => otherActor && onSelectActor(otherActor)}
                    className="p-3 bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{otherActor?.flagEmoji || '🏛️'}</span>
                        <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors font-vazir">
                          {otherActor?.nameFa || otherActorId}
                        </span>
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-transform group-hover:-translate-x-1" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${relConfig?.color}20`,
                            color: relConfig?.color,
                          }}
                        >
                          {rel.typeFa}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          شدت {rel.intensity}/۵
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed font-vazir">
                      {rel.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
