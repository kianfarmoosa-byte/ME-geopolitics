import React from 'react';
import { FilterState, ActorCategory, RelationType } from '../types';
import { CATEGORY_COLORS, RELATION_CONFIG, ALL_CATEGORIES } from '../data';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  SlidersHorizontal,
  Flame,
  Shield,
  Coins,
  Radio
} from 'lucide-react';

interface FilterControlsProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onApplyPreset: (presetKey: string) => void;
  totalActorsCount: number;
  filteredActorsCount: number;
  totalLinksCount: number;
  filteredLinksCount: number;
}

export const PRESETS = [
  {
    key: 'all',
    title: 'همه بازیگران (شبکه کامل)',
    icon: '🌐',
  },
  {
    key: 'resistance_israel',
    title: 'تقابل محور مقاومت، اسرائیل و آمریکا',
    icon: '⚔️',
  },
  {
    key: 'energy_opec',
    title: 'شریان انرژی، اوپک‌پلاس و شرکت‌های نفتی',
    icon: '🛢️',
  },
  {
    key: 'superpowers',
    title: 'موازنه قدرت‌های فرامنطقه‌ای (آمریکا، چین، روسیه)',
    icon: '🏛️',
  },
  {
    key: 'red_sea',
    title: 'کانون بحران دریای سرخ و باب‌المندب',
    icon: '🚢',
  },
  {
    key: 'caucasus',
    title: 'قفقاز جنوبی و کریدور زنگزور',
    icon: '🏔️',
  },
];

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onFilterChange,
  onApplyPreset,
  totalActorsCount,
  filteredActorsCount,
  totalLinksCount,
  filteredLinksCount,
}) => {
  const toggleCategory = (cat: ActorCategory) => {
    const nextCategories = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onFilterChange({ ...filters, categories: nextCategories });
  };

  const toggleRelationType = (relType: RelationType) => {
    const nextRelationTypes = filters.relationTypes.includes(relType)
      ? filters.relationTypes.filter((r) => r !== relType)
      : [...filters.relationTypes, relType];
    onFilterChange({ ...filters, relationTypes: nextRelationTypes });
  };

  const resetAllFilters = () => {
    onFilterChange({
      searchQuery: '',
      categories: ALL_CATEGORIES,
      relationTypes: ['conflict', 'alliance', 'economic', 'diplomatic', 'proxy_cyber', 'volatile'],
      minInfluence: 1,
      geographies: [],
      alignments: [],
      statuses: [],
    });
  };

  return (
    <div className="w-full flex flex-col gap-4 text-xs font-vazir" id="filter-controls-panel">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
          placeholder="جستجو در بین ۱۱۰+ بازیگر (نام فارسی، انگلیسی، رهبر، ایدئولوژی)..."
          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-xs"
          id="search-actors-input"
        />
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        {filters.searchQuery && (
          <button
            onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
            className="absolute left-3 top-2.5 text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-[11px]"
          >
            پاک کردن
          </button>
        )}
      </div>

      {/* Quick Scenario Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            سناریوهای ژئوپلیتیک برجسته
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => onApplyPreset(preset.key)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-850 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 transition-all text-[11px] flex items-center gap-1.5 shadow-sm"
            >
              <span>{preset.icon}</span>
              <span>{preset.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Categories Filter Pills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            دسته‌بندی بازیگران
          </span>
          <span className="text-[10px] text-slate-500">
            {filters.categories.length}/{ALL_CATEGORIES.length}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {ALL_CATEGORIES.map((cat) => {
            const isSelected = filters.categories.includes(cat);
            const config = CATEGORY_COLORS[cat];
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] transition-all border text-right ${
                  isSelected
                    ? 'bg-slate-900/90 text-slate-200 border-slate-700 shadow-sm'
                    : 'bg-slate-950/40 text-slate-500 border-slate-850 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                    style={{
                      backgroundColor: config.hex,
                      transform: isSelected ? 'scale(1.1)' : 'scale(0.8)',
                    }}
                  />
                  <span className="truncate max-w-[210px]">{cat}</span>
                </div>
                <span
                  className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: isSelected ? `${config.hex}30` : 'transparent',
                    color: isSelected ? config.hex : '#64748b',
                  }}
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Relationship Types Toggles */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            ماهیت روابط پیوندی
          </span>
          <span className="text-[10px] text-slate-500">
            {filteredLinksCount} رابطه فعال
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(RELATION_CONFIG) as RelationType[]).map((relType) => {
            const isSelected = filters.relationTypes.includes(relType);
            const config = RELATION_CONFIG[relType];
            return (
              <button
                key={relType}
                onClick={() => toggleRelationType(relType)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all text-right ${
                  isSelected
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-slate-950/30 border-slate-850 text-slate-500 hover:text-slate-400'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span className="truncate">{config.labelFa.split('/')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Influence Score Slider */}
      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            حداقل شاخص نفوذ راهبردی
          </span>
          <span className="text-amber-400 font-bold text-xs">{filters.minInfluence} از ۵</span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={filters.minInfluence}
          onChange={(e) => onFilterChange({ ...filters, minInfluence: parseInt(e.target.value) })}
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          id="influence-slider"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>همه بازیگران (۱)</span>
          <span>منطقه‌ای (۳)</span>
          <span>ابرقدرت‌ها (۵)</span>
        </div>
      </div>

      {/* Summary and Reset Button */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          نمایش <strong className="text-cyan-400">{filteredActorsCount}</strong> از {totalActorsCount} بازیگر
        </span>
        <button
          onClick={resetAllFilters}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          id="btn-reset-filters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>بازنشانی فیلترها</span>
        </button>
      </div>
    </div>
  );
};
