import React, { useState, useMemo } from 'react';
import { ActorData, ActorCategory } from '../types';
import { CATEGORY_COLORS } from '../data';
import { Search, ArrowUpDown, Filter, Shield, Zap, ExternalLink, Globe } from 'lucide-react';

interface ActorDirectoryProps {
  actors: ActorData[];
  onSelectActor: (actor: ActorData) => void;
  onSwitchToGraphWithActor?: (actor: ActorData) => void;
}

export const ActorDirectory: React.FC<ActorDirectoryProps> = ({
  actors,
  onSelectActor,
  onSwitchToGraphWithActor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'influence' | 'name' | 'category'>('influence');

  const filteredActors = useMemo(() => {
    return actors
      .filter((actor) => {
        if (selectedCategory !== 'all' && actor.category !== selectedCategory) {
          return false;
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          return (
            actor.nameFa.toLowerCase().includes(q) ||
            actor.nameEn.toLowerCase().includes(q) ||
            (actor.acronym && actor.acronym.toLowerCase().includes(q)) ||
            (actor.leader && actor.leader.toLowerCase().includes(q)) ||
            actor.geopoliticalRole.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'influence') return b.influenceScore - a.influenceScore;
        if (sortBy === 'name') return a.nameFa.localeCompare(b.nameFa, 'fa');
        if (sortBy === 'category') return a.category.localeCompare(b.category, 'fa');
        return 0;
      });
  }, [actors, searchTerm, selectedCategory, sortBy]);

  const categories = useMemo(() => {
    return Array.from(new Set(actors.map((a) => a.category)));
  }, [actors]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 font-vazir text-right overflow-hidden p-6">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در نام، رهبر، یا نقش ژئوپلیتیک..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 pr-10 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5 pointer-events-none" />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">تمام دسته‌بندی‌ها ({actors.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
            <button
              onClick={() => setSortBy('influence')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                sortBy === 'influence' ? 'bg-cyan-600 text-white font-bold' : 'hover:text-slate-200'
              }`}
            >
              نفوذ
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                sortBy === 'name' ? 'bg-cyan-600 text-white font-bold' : 'hover:text-slate-200'
              }`}
            >
              الفبا
            </button>
            <button
              onClick={() => setSortBy('category')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                sortBy === 'category' ? 'bg-cyan-600 text-white font-bold' : 'hover:text-slate-200'
              }`}
            >
              دسته
            </button>
          </div>
        </div>
      </div>

      {/* Directory Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActors.map((actor) => {
            const catConfig = CATEGORY_COLORS[actor.category];
            return (
              <div
                key={actor.id}
                onClick={() => onSelectActor(actor)}
                className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all shadow-sm hover:shadow-xl cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                        {actor.flagEmoji || '🏛️'}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-400 transition-colors">
                          {actor.nameFa}
                        </h3>
                        <p className="text-[11px] text-slate-400">{actor.nameEn}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-amber-400 font-bold text-xs">
                        ★ {actor.influenceScore}/۵
                      </span>
                      {actor.acronym && (
                        <span className="text-[10px] text-cyan-400 font-mono font-semibold">
                          {actor.acronym}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-medium border mb-2.5"
                    style={{
                      backgroundColor: `${catConfig?.hex}15`,
                      borderColor: `${catConfig?.hex}30`,
                      color: catConfig?.hex,
                    }}
                  >
                    {actor.category}
                  </span>

                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed mb-3">
                    {actor.geopoliticalRole}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{actor.geography}</span>
                  <div className="flex items-center gap-2">
                    {onSwitchToGraphWithActor && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSwitchToGraphWithActor(actor);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        title="نمایش و هایلایت در گراف روابط"
                      >
                        <span>گراف</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
