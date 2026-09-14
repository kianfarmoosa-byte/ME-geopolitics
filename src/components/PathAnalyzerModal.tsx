import React, { useState } from 'react';
import { ActorData, GeopoliticalRelationship } from '../types';
import { findPathBetweenActors } from '../utils/graphHelpers';
import { RELATION_CONFIG } from '../data';
import { Route, X, ArrowLeft, GitCommit, Sparkles, Check } from 'lucide-react';

interface PathAnalyzerModalProps {
  actors: ActorData[];
  relationships: GeopoliticalRelationship[];
  allActorsMap: Map<string, ActorData>;
  startActorId: string;
  endActorId: string;
  onSetStartActorId: (id: string) => void;
  onSetEndActorId: (id: string) => void;
  onHighlightPath: (nodeIds: string[]) => void;
  onClose: () => void;
  onSelectActor: (actor: ActorData) => void;
}

export const PathAnalyzerModal: React.FC<PathAnalyzerModalProps> = ({
  actors,
  relationships,
  allActorsMap,
  startActorId,
  endActorId,
  onSetStartActorId,
  onSetEndActorId,
  onHighlightPath,
  onClose,
  onSelectActor,
}) => {
  const pathResult = startActorId && endActorId && startActorId !== endActorId
    ? findPathBetweenActors(startActorId, endActorId, relationships)
    : null;

  const startActor = allActorsMap.get(startActorId);
  const endActor = allActorsMap.get(endActorId);

  // Quick pairs
  const quickPairs = [
    { start: 'REG-002', end: 'REG-001', label: 'ایران ↔ عربستان' },
    { start: 'REG-002', end: 'PWR-001', label: 'ایران ↔ ایالات متحده' },
    { start: 'REG-003', end: 'NSA-004', label: 'اسرائیل ↔ انصارالله یمن' },
    { start: 'REG-004', end: 'REG-029', label: 'ترکیه ↔ جمهوری آذربایجان' },
    { start: 'PWR-003', end: 'REG-002', label: 'چین ↔ ایران' },
    { start: 'REG-008', end: 'PWR-001', label: 'عراق ↔ ایالات متحده' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
      id="path-analyzer-backdrop"
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-vazir text-right"
        id="path-analyzer-card"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                تحلیل‌گر زنجیره ارتباطات و مسیر ژئوپلیتیک
              </h2>
              <p className="text-xs text-slate-400">
                کشف کوتاه‌ترین زنجیره نفوذ، میانجی‌گری یا تقابل بین دو بازیگر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selection Area */}
        <div className="p-5 space-y-4 border-b border-slate-800 bg-slate-950/30">
          {/* Quick Pairs */}
          <div>
            <span className="text-xs text-slate-400 mb-1.5 block">زوج‌های کلیدی پیش‌فرض:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPairs.map((pair, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSetStartActorId(pair.start);
                    onSetEndActorId(pair.end);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-cyan-300 border border-slate-700 transition-colors"
                >
                  {pair.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actor Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Actor */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                بازیگر مبدأ (A):
              </label>
              <select
                value={startActorId}
                onChange={(e) => onSetStartActorId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">انتخاب بازیگر مبدأ...</option>
                {actors.map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.flagEmoji || '🏛️'} {actor.nameFa} ({actor.nameEn})
                  </option>
                ))}
              </select>
            </div>

            {/* End Actor */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                بازیگر مقصد (B):
              </label>
              <select
                value={endActorId}
                onChange={(e) => onSetEndActorId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">انتخاب بازیگر مقصد...</option>
                {actors.map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.flagEmoji || '🏛️'} {actor.nameFa} ({actor.nameEn})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Path Results */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {startActorId && endActorId ? (
            pathResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-800/40 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>
                      مسیر ارتباطی در <strong>{pathResult.pathNodeIds.length - 1} گام (Hop)</strong> پیدا شد!
                    </span>
                  </div>
                  <button
                    onClick={() => onHighlightPath(pathResult.pathNodeIds)}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                  >
                    هایلایت روی گراف تعاملی
                  </button>
                </div>

                {/* Timeline chain representation */}
                <div className="space-y-3 relative before:absolute before:right-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-700">
                  {pathResult.pathNodeIds.map((nodeId, idx) => {
                    const nodeActor = allActorsMap.get(nodeId);
                    const linkToNext = idx < pathResult.pathLinks.length ? pathResult.pathLinks[idx] : null;
                    const relConfig = linkToNext ? RELATION_CONFIG[linkToNext.type] : null;

                    return (
                      <div key={nodeId} className="relative flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl shadow-lg shrink-0 z-10">
                          {nodeActor?.flagEmoji || '🏛️'}
                        </div>

                        <div className="flex-1 bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span
                              onClick={() => nodeActor && onSelectActor(nodeActor)}
                              className="font-bold text-sm text-slate-100 hover:text-cyan-400 cursor-pointer transition-colors"
                            >
                              {nodeActor?.nameFa || nodeId}
                            </span>
                            <span className="text-[10px] text-slate-500">{nodeActor?.geography}</span>
                          </div>

                          {linkToNext && (
                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs">
                              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-semibold"
                                style={{
                                  backgroundColor: `${relConfig?.color}20`,
                                  color: relConfig?.color,
                                }}
                              >
                                {linkToNext.typeFa}
                              </span>
                              <span className="text-slate-400 text-[11px] truncate">
                                {linkToNext.description}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-slate-800">
                <GitCommit className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  هیچ زنجیره ارتباطی مستقیمی بین این دو بازیگر در ماتریس داده‌های فعلی ثبت نشده است.
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-10 text-xs text-slate-500">
              لطفاً بازیگر مبدأ و مقصد را انتخاب کنید تا شبکه تحلیل شود.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
