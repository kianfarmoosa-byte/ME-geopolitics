import React, { useState, useMemo, useCallback } from 'react';
import { allActors, allRelationships, ALL_CATEGORIES } from './data';
import { prepareGraphData } from './utils/graphHelpers';
import { ActorData, FilterState } from './types';
import { GraphCanvas } from './components/GraphCanvas';
import { ActorDetailsModal } from './components/ActorDetailsModal';
import { FilterControls } from './components/FilterControls';
import { PathAnalyzerModal } from './components/PathAnalyzerModal';
import { NetworkAnalyticsModal } from './components/NetworkAnalyticsModal';
import { ActorDirectory } from './components/ActorDirectory';
import { Header } from './components/Header';
import { LegendModal } from './components/LegendModal';
import { 
  Filter, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles,
  BarChart2,
  Route,
  Info
} from 'lucide-react';

export function App() {
  // Navigation & View Mode
  const [currentView, setCurrentView] = useState<'graph' | 'directory'>('graph');
  const [clusterMode, setClusterMode] = useState<'free' | 'category'>('free');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isPathAnalyzerOpen, setIsPathAnalyzerOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);

  // Selected Actor for Animated Graph Highlighting & Inspection
  const [selectedActor, setSelectedActor] = useState<ActorData | null>(null);

  // Path Analysis State
  const [pathStartId, setPathStartId] = useState<string>('REG-002'); // Iran default
  const [pathEndId, setPathEndId] = useState<string>('REG-003'); // Israel default
  const [highlightedPathNodeIds, setHighlightedPathNodeIds] = useState<string[]>([]);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    categories: ALL_CATEGORIES,
    relationTypes: ['conflict', 'alliance', 'economic', 'diplomatic', 'proxy_cyber', 'volatile'],
    minInfluence: 1,
    geographies: [],
    alignments: [],
    statuses: [],
  });

  // Fast Actor Lookup Map
  const allActorsMap = useMemo(() => {
    const map = new Map<string, ActorData>();
    allActors.forEach((actor) => map.set(actor.id, actor));
    return map;
  }, []);

  // Filter and prepare Graph Nodes & Links
  const { nodes, links } = useMemo(() => {
    return prepareGraphData(allActors, allRelationships, filters);
  }, [filters]);

  // Scenario Presets Handler
  const handleApplyPreset = useCallback((presetKey: string) => {
    setHighlightedPathNodeIds([]);
    setSelectedActor(null);
    switch (presetKey) {
      case 'resistance_israel':
        setFilters((prev) => ({
          ...prev,
          searchQuery: '',
          categories: ALL_CATEGORIES,
          relationTypes: ['conflict', 'alliance', 'proxy_cyber'],
          minInfluence: 3,
        }));
        break;
      case 'energy_opec':
        setFilters((prev) => ({
          ...prev,
          searchQuery: '',
          categories: ['بازیگران اقتصادی/انرژی/مالی', 'دولت‌ها/اقتدارهای سطح دولتی منطقه‌ای', 'قدرت‌ها/بازیگران دولتی فرامنطقه‌ای'],
          relationTypes: ['economic', 'alliance', 'diplomatic'],
          minInfluence: 2,
        }));
        break;
      case 'superpowers':
        setFilters((prev) => ({
          ...prev,
          searchQuery: '',
          categories: ['قدرت‌ها/بازیگران دولتی فرامنطقه‌ای', 'سازمان‌های بین‌المللی/منطقه‌ای'],
          relationTypes: ['conflict', 'alliance', 'economic', 'diplomatic', 'volatile'],
          minInfluence: 4,
        }));
        break;
      case 'red_sea':
        setFilters((prev) => ({
          ...prev,
          searchQuery: 'یمن',
          categories: ALL_CATEGORIES,
          relationTypes: ['conflict', 'alliance', 'volatile'],
          minInfluence: 1,
        }));
        break;
      case 'caucasus':
        setFilters((prev) => ({
          ...prev,
          searchQuery: 'قفقاز',
          categories: ALL_CATEGORIES,
          relationTypes: ['conflict', 'alliance', 'economic', 'volatile'],
          minInfluence: 1,
        }));
        break;
      case 'all':
      default:
        setFilters({
          searchQuery: '',
          categories: ALL_CATEGORIES,
          relationTypes: ['conflict', 'alliance', 'economic', 'diplomatic', 'proxy_cyber', 'volatile'],
          minInfluence: 1,
          geographies: [],
          alignments: [],
          statuses: [],
        });
        break;
    }
  }, []);

  // Switch to graph view with actor centered and highlighted
  const handleSwitchToGraphWithActor = useCallback((actor: ActorData) => {
    setCurrentView('graph');
    setSelectedActor(actor);
  }, []);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-vazir select-none">
      {/* Top Application Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        clusterMode={clusterMode}
        onToggleClusterMode={() => setClusterMode((m) => (m === 'free' ? 'category' : 'free'))}
        onOpenPathAnalyzer={() => setIsPathAnalyzerOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenLegend={() => setIsLegendOpen(true)}
        totalActors={allActors.length}
        totalRelationships={allRelationships.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Collapsible Filter Sidebar (Only in Graph View) */}
        {currentView === 'graph' && (
          <aside
            className={`transition-all duration-300 ease-in-out border-l border-slate-800/80 bg-slate-950/95 backdrop-blur-xl flex flex-col z-20 shrink-0 ${
              isSidebarOpen ? 'w-80 md:w-96' : 'w-0 border-l-0'
            }`}
            id="filters-sidebar"
          >
            {isSidebarOpen && (
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <FilterControls
                  filters={filters}
                  onFilterChange={setFilters}
                  onApplyPreset={handleApplyPreset}
                  totalActorsCount={allActors.length}
                  filteredActorsCount={nodes.length}
                  totalLinksCount={allRelationships.length}
                  filteredLinksCount={links.length}
                />
              </div>
            )}
          </aside>
        )}

        {/* Sidebar Toggle Handle Button */}
        {currentView === 'graph' && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-4 right-0 z-30 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 p-2 rounded-r-none rounded-l-xl shadow-xl transition-all"
            title={isSidebarOpen ? 'بستن پنل فیلترها' : 'باز کردن پنل فیلترها'}
            id="btn-toggle-sidebar"
          >
            {isSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}

        {/* Primary Viewport: Either D3 Graph Canvas OR Actor Directory */}
        <main className="flex-1 relative h-full w-full overflow-hidden" id="primary-viewport">
          {currentView === 'graph' ? (
            <GraphCanvas
              nodes={nodes}
              links={links}
              allActorsMap={allActorsMap}
              selectedActor={selectedActor}
              onSelectActor={setSelectedActor}
              onOpenDetailsModal={(actor) => {
                setSelectedActor(actor);
                setIsDetailsDrawerOpen(true);
              }}
              highlightedPathNodeIds={highlightedPathNodeIds}
              searchQuery={filters.searchQuery}
              clusterMode={clusterMode}
            />
          ) : (
            <ActorDirectory
              actors={allActors}
              onSelectActor={(actor) => {
                setSelectedActor(actor);
                setIsDetailsDrawerOpen(true);
              }}
              onSwitchToGraphWithActor={handleSwitchToGraphWithActor}
            />
          )}
        </main>
      </div>

      {/* Selected Actor Details Full Drawer (Opened on click or demand) */}
      {selectedActor && isDetailsDrawerOpen && (
        <ActorDetailsModal
          actor={selectedActor}
          relationships={allRelationships}
          allActorsMap={allActorsMap}
          onClose={() => setIsDetailsDrawerOpen(false)}
          onSelectActor={(actor) => {
            setSelectedActor(actor);
          }}
          onSetPathStart={(id) => {
            setPathStartId(id);
            setIsPathAnalyzerOpen(true);
          }}
          onSetPathEnd={(id) => {
            setPathEndId(id);
            setIsPathAnalyzerOpen(true);
          }}
        />
      )}

      {/* Advanced Network Analytics Modal */}
      {isAnalyticsOpen && (
        <NetworkAnalyticsModal
          actors={allActors}
          relationships={allRelationships}
          onClose={() => setIsAnalyticsOpen(false)}
          onSelectActorAndHighlight={(actor) => {
            setSelectedActor(actor);
            setCurrentView('graph');
          }}
          onHighlightCluster={(actorIds) => {
            setHighlightedPathNodeIds(actorIds);
            setCurrentView('graph');
          }}
        />
      )}

      {/* Path Analyzer Modal */}
      {isPathAnalyzerOpen && (
        <PathAnalyzerModal
          actors={allActors}
          relationships={allRelationships}
          allActorsMap={allActorsMap}
          startActorId={pathStartId}
          endActorId={pathEndId}
          onSetStartActorId={setPathStartId}
          onSetEndActorId={setPathEndId}
          onHighlightPath={(pathNodeIds) => {
            setHighlightedPathNodeIds(pathNodeIds);
            setIsPathAnalyzerOpen(false);
            setCurrentView('graph');
          }}
          onClose={() => setIsPathAnalyzerOpen(false)}
          onSelectActor={(act) => {
            setSelectedActor(act);
            setIsPathAnalyzerOpen(false);
          }}
        />
      )}

      {/* Visual Guide / Legend Modal */}
      {isLegendOpen && <LegendModal onClose={() => setIsLegendOpen(false)} />}
    </div>
  );
}

export default App;
