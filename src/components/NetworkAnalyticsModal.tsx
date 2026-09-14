import React, { useState, useMemo } from 'react';
import { ActorData, GeopoliticalRelationship } from '../types';
import { analyzeGeopoliticalNetwork, FullNetworkAnalytics } from '../utils/networkAnalytics';
import { CATEGORY_COLORS, RELATION_CONFIG } from '../data';
import { 
  BarChart3, 
  X, 
  Zap, 
  ShieldAlert, 
  Layers, 
  GitMerge, 
  History, 
  Flame, 
  Compass, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Scale
} from 'lucide-react';

interface NetworkAnalyticsModalProps {
  actors: ActorData[];
  relationships: GeopoliticalRelationship[];
  onClose: () => void;
  onSelectActorAndHighlight: (actor: ActorData) => void;
  onHighlightCluster: (actorIds: string[]) => void;
}

export const NetworkAnalyticsModal: React.FC<NetworkAnalyticsModalProps> = ({
  actors,
  relationships,
  onClose,
  onSelectActorAndHighlight,
  onHighlightCluster,
}) => {
  const [activeTab, setActiveTab] = useState<'leverage' | 'clusters' | 'balance' | 'trends'>('leverage');

  const analytics: FullNetworkAnalytics = useMemo(() => {
    return analyzeGeopoliticalNetwork(actors, relationships);
  }, [actors, relationships]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 font-vazir text-right"
      id="network-analytics-backdrop"
    >
      <div
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        id="network-analytics-card"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-100">
                  ماژول تجزیه و تحلیل پیشرفته شبکه ژئوپلیتیک ۲۰۲۶
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  تحلیل چندبعدی ماتریس روابط
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                شناسایی نقاط اهرمی، خوشه‌های متراکم، توازن وزن و شدت روابط، و روندهای تاریخی تکرارشونده
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            id="btn-close-analytics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI Overview Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800 shrink-0 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px] mb-1">شاخص شکنندگی و ریسک منازعه</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-rose-400">
                {analytics.balance.fragilityIndex}٪
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50">
                تنش بحرانی
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px] mb-1">نسبت تقابل به هم‌پیمانی</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-amber-400">
                {analytics.balance.conflictRatio}٪ در برابر {analytics.balance.allianceRatio}٪
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px] mb-1">پیوندهای با شدت بالا (سطح ۴ و ۵)</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-cyan-400">
                {analytics.balance.highIntensityCount} پیوند
              </span>
              <span className="text-[10px] text-slate-500">
                ({Math.round((analytics.balance.highIntensityCount / analytics.balance.totalRelationships) * 100)}٪ کل)
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
            <span className="text-slate-400 text-[11px] mb-1">میانگین شدت پیوندهای شبکه</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-emerald-400">
                {analytics.balance.averageIntensity} از ۵
              </span>
              <span className="text-[10px] text-slate-500">درجه تعامل بالا</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('leverage')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'leverage'
                ? 'bg-cyan-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            id="tab-analytics-leverage"
          >
            <Zap className="w-4 h-4" />
            <span>بازیگران کلیدی و نقاط اهرمی ({analytics.leverageNodes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('clusters')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'clusters'
                ? 'bg-cyan-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            id="tab-analytics-clusters"
          >
            <Layers className="w-4 h-4" />
            <span>خوشه‌های متراکم و بلوک‌های قدرت ({analytics.clusters.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('balance')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'balance'
                ? 'bg-cyan-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            id="tab-analytics-balance"
          >
            <Scale className="w-4 h-4" />
            <span>توازن وزن، جهت و شدت روابط</span>
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'trends'
                ? 'bg-cyan-600 text-white font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            id="tab-analytics-trends"
          >
            <History className="w-4 h-4" />
            <span>روندهای تاریخی و الگوهای تکرارشونده ({analytics.historicalTrends.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar text-xs">
          {/* TAB 1: KEY LEVERAGE NODES */}
          {activeTab === 'leverage' && (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 leading-relaxed text-slate-300">
                <h3 className="text-xs font-bold text-cyan-400 mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  تحلیل نقاط اهرمی و بازیگران دارای بالاترین وزن راهبردی
                </h3>
                <p>
                  نقاط اهرمی (Leverage Nodes) بازیگرانی هستند که به دلیل تجمیع بالاترین درجه اتصالات مستقیم، شدت تعارضات و نفوذ فرامرزی، بیشترین اثر دومینویی را بر کل ساختار امنیت منطقه وارد می‌کنند. همچنین بازیگران «پل میانجی‌گری» به عنوان شاهراه‌های هدایت پیام و کاهش تنش عمل می‌نمایند.
                </p>
              </div>

              {/* Top 10 Leverage Actors Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-200 mb-3 flex items-center justify-between">
                  <span>۱۰ بازیگر دارای بالاترین شاخص اهرمی (Strategic Leverage Score)</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    مرتب‌شده بر اساس نفوذ، پیوندها و شدت منازعه
                  </span>
                </h4>

                <div className="space-y-2.5">
                  {analytics.leverageNodes.slice(0, 10).map((item, idx) => {
                    const categoryConfig = CATEGORY_COLORS[item.actor.category];
                    return (
                      <div
                        key={item.actor.id}
                        className="p-3.5 bg-slate-950/50 hover:bg-slate-850/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-center font-bold text-slate-500">#{idx + 1}</span>
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                            {item.actor.flagEmoji || '🏛️'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-100 text-sm">{item.actor.nameFa}</span>
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-semibold"
                                style={{
                                  backgroundColor: `${categoryConfig?.hex}20`,
                                  color: categoryConfig?.hex,
                                }}
                              >
                                {item.roleType}
                              </span>
                            </div>
                            <span className="text-slate-400 text-[11px] font-sans">{item.actor.nameEn}</span>
                          </div>
                        </div>

                        {/* Metrics Badges */}
                        <div className="flex items-center gap-3 self-end sm:self-center flex-wrap">
                          <div className="flex items-center gap-2 text-[11px] bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400">اتصالات کل:</span>
                            <strong className="text-slate-200">{item.degree}</strong>
                            <span className="text-slate-600">|</span>
                            <span className="text-rose-400">⚔️ {item.conflictsCount}</span>
                            <span className="text-emerald-400">🤝 {item.alliancesCount}</span>
                            <span className="text-amber-400">💼 {item.economicCount}</span>
                          </div>

                          <div className="bg-cyan-950/60 border border-cyan-800/50 px-3 py-1.5 rounded-lg text-center min-w-[70px]">
                            <span className="text-[10px] text-cyan-400 block">امتیاز اهرم</span>
                            <strong className="text-xs text-cyan-200 font-bold">{item.leverageScore}</strong>
                          </div>

                          <button
                            onClick={() => {
                              onSelectActorAndHighlight(item.actor);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                            title="هایلایت و مشاهده در گراف"
                          >
                            <span>هایلایت</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bridge Actors (Betweenness Centrality) Section */}
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/40">
                <h4 className="text-xs font-bold text-indigo-300 mb-2 flex items-center gap-2">
                  <GitMerge className="w-4 h-4" />
                  بازیگران پل (Bridge Actors) و کانال‌های میانجی‌گری
                </h4>
                <p className="text-slate-300 mb-3 leading-relaxed">
                  این بازیگران در کوتاه‌ترین مسیرهای ارتباطی بین جناح‌های متخاصم قرار دارند و بیشترین پتانسیل را برای میانجی‌گری، انتقال پیام‌های اضطراری و مهار تنش ایفا می‌کنند:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {analytics.bridgeActors.slice(0, 3).map((b) => (
                    <div
                      key={b.actor.id}
                      onClick={() => {
                        onSelectActorAndHighlight(b.actor);
                        onClose();
                      }}
                      className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl hover:border-cyan-500/50 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{b.actor.flagEmoji || '🏛️'}</span>
                        <div>
                          <span className="font-bold text-slate-200 block text-xs">{b.actor.nameFa}</span>
                          <span className="text-[10px] text-slate-500">شاخص بینابینی: {b.betweennessScore}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DENSE RELATIONSHIP CLUSTERS */}
          {activeTab === 'clusters' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 leading-relaxed text-slate-300">
                <h3 className="text-xs font-bold text-purple-400 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  شناسایی خوشه‌های متراکم و بلوک‌های قدرت همگرا
                </h3>
                <p>
                  الگوریتم تشخیص جامعه روابط متراکم ژئوپلیتیک، شبکه بازیگران را بر مبنای اشتراک منافع عمیق دفاعی، وابستگی متقابل انرژی، یا تقابل جبهه‌ای مشترک به ۵ کانون اصلی تقسیم کرده است.
                </p>
              </div>

              <div className="space-y-4">
                {analytics.clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3 relative overflow-hidden"
                    style={{ borderRightWidth: '4px', borderRightColor: cluster.color }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{cluster.icon}</span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">{cluster.nameFa}</h4>
                          <span className="text-xs text-slate-400 font-sans">{cluster.nameEn}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 border border-slate-700 text-cyan-300">
                          ضریب چگالی: {cluster.densityScore}٪
                        </span>
                        <button
                          onClick={() => {
                            onHighlightCluster(cluster.actorIds);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors flex items-center gap-1 text-xs shadow-md"
                        >
                          <span>هایلایت کل خوشه در گراف</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-slate-300 leading-relaxed text-justify bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                      {cluster.strategicDescription}
                    </p>

                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1.5">بازیگران کانونی این بلوک:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {cluster.keyActors.map((actorName, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-slate-200 border border-slate-700/80"
                          >
                            {actorName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: WEIGHT & DIRECTIONAL BALANCE */}
          {activeTab === 'balance' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 leading-relaxed text-slate-300">
                <h3 className="text-xs font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                  <Scale className="w-4 h-4" />
                  ماتریس توازن وزن، شدت و جهت روابط
                </h3>
                <p>
                  تحلیل آماری و جهت‌داری پیوندها نشان می‌دهد که معماری روابط بین‌المللی خاورمیانه در ۲۰۲۶ دارای عدم‌تقارن شدید و گرایش فزاینده به درگیری‌های شدید با شدت ۵/۵ است.
                </p>
              </div>

              {/* Visual Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Distribution by Type */}
                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 mb-2">توزیع انواع روابط در شبکه</h4>
                  
                  {/* Conflict */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-rose-400 font-bold">خصومت و تقابل نظامی</span>
                      <span>{analytics.balance.conflictCount} پیوند ({analytics.balance.conflictRatio}٪)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${analytics.balance.conflictRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Alliance */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-emerald-400 font-bold">هم‌پیمانی و حمایت راهبردی</span>
                      <span>{analytics.balance.allianceCount} پیوند ({analytics.balance.allianceRatio}٪)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${analytics.balance.allianceRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Economic */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-amber-400 font-bold">همکاری اقتصادی و انرژی</span>
                      <span>{analytics.balance.economicCount} پیوند</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${(analytics.balance.economicCount / analytics.balance.totalRelationships) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Diplomatic */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-cyan-400 font-bold">دیپلماسی و میانجی‌گری</span>
                      <span>{analytics.balance.diplomaticCount} پیوند</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full"
                        style={{ width: `${(analytics.balance.diplomaticCount / analytics.balance.totalRelationships) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Volatile */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-orange-400 font-bold">نوسانی و رقابت مهارشده</span>
                      <span>{analytics.balance.volatileCount} پیوند</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-orange-500 h-full rounded-full"
                        style={{ width: `${(analytics.balance.volatileCount / analytics.balance.totalRelationships) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Conflict Vulnerability & High-Intensity Hotspots */}
                <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      نقاط بحرانی با شدت حداکثری (شدت ۵)
                    </h4>
                    <p className="text-slate-300 text-xs leading-relaxed mb-3">
                      پیوندهای سطح ۵ نشان‌دهنده جنگ فعال، تبادل آتش بالستیک، انسداد آبراه‌ها، یا اتحادهای متعهد به ورود به جنگ فراگیر هستند:
                    </p>

                    <div className="space-y-2">
                      <div className="p-2.5 bg-rose-950/30 border border-rose-900/40 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-bold text-rose-300">ایران ⚔️ اسرائیل</span>
                        <span className="text-[10px] bg-rose-900 text-rose-200 px-2 py-0.5 rounded">تقابل موشکی مستقیم</span>
                      </div>
                      <div className="p-2.5 bg-rose-950/30 border border-rose-900/40 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-bold text-rose-300">انصارالله یمن ⚔️ آمریکا و اسرائیل</span>
                        <span className="text-[10px] bg-rose-900 text-rose-200 px-2 py-0.5 rounded">انسداد باب‌المندب</span>
                      </div>
                      <div className="p-2.5 bg-emerald-950/30 border border-emerald-900/40 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-300">ایران 🤝 حزب‌الله لبنان</span>
                        <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded">هم‌پیمانی راهبردی عمیق</span>
                      </div>
                      <div className="p-2.5 bg-emerald-950/30 border border-emerald-900/40 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-300">آمریکا 🤝 اسرائیل</span>
                        <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded">چتر پدافندی و تسلیحاتی مطلق</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-800">
                    شاخص قطبش شبکه: بیش از ۷۲٪ پیوندها دارای ماهیت قطبی دوطرفه هستند.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HISTORICAL TRENDS & RECURRING PATTERNS */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 leading-relaxed text-slate-300">
                <h3 className="text-xs font-bold text-cyan-400 mb-1.5 flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  تشخیص روندهای تاریخی و الگوهای رفتاری تکرارشونده
                </h3>
                <p>
                  بررسی خطوط زمانی (F14) و متغیرهای تعیین‌کننده رفتاری (F15) نشان‌دهنده چرخه‌های تکرارشونده در پاسخ بازیگران به بحران‌ها، دگرگونی دکترین‌های دفاعی و تثبیت موازنه‌های نوین در افق ۲۰۲۶ است:
                </p>
              </div>

              <div className="space-y-4">
                {analytics.historicalTrends.map((trend) => (
                  <div
                    key={trend.id}
                    className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100">{trend.titleFa}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                            {trend.category}
                          </span>
                        </div>
                        <span className="text-xs text-amber-400 mt-1 block">
                          دوره زمانی: {trend.period} | سطح ریسک: {trend.severity}
                        </span>
                      </div>

                      <div className="text-left">
                        <span className="text-[10px] text-slate-500 block">الگوی چرخه‌ای رفتار:</span>
                        <span className="text-xs font-semibold text-slate-300">{trend.patternCycle}</span>
                      </div>
                    </div>

                    <p className="text-slate-300 leading-relaxed text-justify bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                      {trend.narrativeSummary}
                    </p>

                    <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40">
                      <span className="text-xs font-bold text-indigo-300 block mb-1 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        چشم‌انداز راهبردی و سناریوی افق ۲۰۲۶:
                      </span>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        {trend.futureOutlook2026}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400">بازیگران درگیر در این روند:</span>
                      <div className="flex flex-wrap gap-1">
                        {trend.actorsInvolved.map((act, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[11px] border border-slate-800"
                          >
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
