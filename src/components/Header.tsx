import React from 'react';
import { 
  Network, 
  LayoutGrid, 
  Route, 
  Layers, 
  Info, 
  BarChart3,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  currentView: 'graph' | 'directory';
  onViewChange: (view: 'graph' | 'directory') => void;
  clusterMode: 'free' | 'category';
  onToggleClusterMode: () => void;
  onOpenPathAnalyzer: () => void;
  onOpenAnalytics: () => void;
  onOpenLegend: () => void;
  totalActors: number;
  totalRelationships: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  clusterMode,
  onToggleClusterMode,
  onOpenPathAnalyzer,
  onOpenAnalytics,
  onOpenLegend,
  totalActors,
  totalRelationships,
}) => {
  return (
    <header
      className="w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 font-vazir text-right z-30 shrink-0"
      id="main-app-header"
    >
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
          <Network className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-100 tracking-tight">
              سامانه اطلس ژئوپلیتیک و گراف روابط بازیگران بین‌المللی ۲۰۲۶
            </h1>
            <span className="hidden lg:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              نسخه تحلیلی ۲۰۲۶
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans hidden md:block mt-0.5">
            تحلیل چندبعدی، نقاط اهرمی، ماتریس تنش‌ها، خوشه‌های متراکم و روندهای تاریخی
          </p>
        </div>
      </div>

      {/* Center/Right Action Controls */}
      <div className="flex items-center gap-2 flex-wrap mr-auto">
        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => onViewChange('graph')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'graph'
                ? 'bg-cyan-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="tab-view-graph"
          >
            <Network className="w-3.5 h-3.5" />
            <span>گراف شبکه</span>
          </button>
          <button
            onClick={() => onViewChange('directory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              currentView === 'directory'
                ? 'bg-cyan-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            id="tab-view-directory"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>فهرست بازیگران</span>
          </button>
        </div>

        {/* Advanced Network Analytics Button */}
        <button
          onClick={onOpenAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-950 to-slate-900 hover:from-indigo-900 hover:to-slate-850 text-indigo-300 hover:text-indigo-200 border border-indigo-700/50 shadow-sm transition-all text-xs font-bold"
          title="ماژول تجزیه و تحلیل پیشرفته شبکه (نقاط اهرمی، خوشه‌ها، روندهای تاریخی)"
          id="btn-open-analytics"
        >
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span>تجزیه و تحلیل پیشرفته</span>
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping hidden sm:inline-block" />
        </button>

        {/* Path Analyzer Button */}
        <button
          onClick={onOpenPathAnalyzer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-cyan-300 border border-slate-800 transition-colors text-xs font-semibold"
          title="تحلیل مسیر و زنجیره ارتباطی بین دو بازیگر"
          id="btn-open-path-analyzer"
        >
          <Route className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">تحلیل مسیر</span>
        </button>

        {/* Cluster Mode Toggle (Only in Graph view) */}
        {currentView === 'graph' && (
          <button
            onClick={onToggleClusterMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              clusterMode === 'category'
                ? 'bg-purple-950/60 border-purple-800 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
            }`}
            title={clusterMode === 'category' ? 'چیدمان آزاد' : 'خوشه‌بندی دسته‌ای'}
            id="btn-toggle-cluster"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="hidden xl:inline">
              {clusterMode === 'category' ? 'خوشه‌ای' : 'آزاد'}
            </span>
          </button>
        )}

        {/* Legend Button */}
        <button
          onClick={onOpenLegend}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
          title="راهنمای دسته‌بندی‌ها و رنگ‌ها"
          id="btn-open-legend"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
