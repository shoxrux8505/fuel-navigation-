import { useState, useMemo } from 'react';
import { FUEL_STATIONS_DATA, FuelStation, TIER_CONFIG } from './data/fuelStations';
import { ColorMetric, FilterOptions, TripPlanResult, ViewMode } from './types';
import { Header } from './components/Header';
import { StationMap } from './components/StationMap';
import { StationSidebar } from './components/StationSidebar';
import { StationDetailModal } from './components/StationDetailModal';
import { StationTable } from './components/StationTable';
import { TripPlanner } from './components/TripPlanner';
import { AnalyticsView } from './components/AnalyticsView';
import { SerpApiModal } from './components/SerpApiModal';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('map');
  const [selectedStation, setSelectedStation] = useState<FuelStation | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [colorMetric, setColorMetric] = useState<ColorMetric>('best_disc');
  const [activeTrip, setActiveTrip] = useState<TripPlanResult | null>(null);
  const [isSerpApiOpen, setIsSerpApiOpen] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    selectedState: '',
    maxPrice: 10,
    minSavings: 0,
    selectedTiers: TIER_CONFIG.map((t) => t.id),
    sortBy: 'price_asc',
    tankGallons: 120
  });

  const handleUpdateFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleToggleTier = (tierId: string) => {
    setFilters((prev) => {
      const exists = prev.selectedTiers.includes(tierId);
      const updated = exists
        ? prev.selectedTiers.filter((id) => id !== tierId)
        : [...prev.selectedTiers, tierId];
      return { ...prev, selectedTiers: updated.length === 0 ? [tierId] : updated };
    });
  };

  // Filter stations based on search, state, tiers, and corridor (if trip is active)
  const filteredStations = useMemo(() => {
    const baseList = activeTrip ? activeTrip.stationsAlongRoute : FUEL_STATIONS_DATA;

    return baseList
      .filter((s) => {
        // Search query
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase().trim();
          const matchStore = s.store.toString().includes(q);
          const matchCity = s.city.toLowerCase().includes(q);
          const matchState = s.state.toLowerCase().includes(q);
          if (!matchStore && !matchCity && !matchState) return false;
        }

        // State filter
        if (filters.selectedState && s.state !== filters.selectedState) {
          return false;
        }

        // Min savings filter
        if (filters.minSavings > 0 && s.savings < filters.minSavings) {
          return false;
        }

        // Tier filter
        if (filters.selectedTiers.length < TIER_CONFIG.length) {
          const matchTier = TIER_CONFIG.some((tier) => {
            if (!filters.selectedTiers.includes(tier.id)) return false;
            if (tier.min !== undefined && tier.max !== undefined) {
              return s.best_disc > tier.min && s.best_disc <= tier.max;
            }
            if (tier.max !== undefined) return s.best_disc <= tier.max;
            if (tier.min !== undefined) return s.best_disc > tier.min;
            return true;
          });
          if (!matchTier) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'price_asc') return a.best_disc - b.best_disc;
        if (filters.sortBy === 'price_desc') return b.best_disc - a.best_disc;
        if (filters.sortBy === 'savings_desc') return b.savings - a.savings;
        if (filters.sortBy === 'def_asc') return a.def_retail - b.def_retail;
        if (filters.sortBy === 'store_asc') return a.store - b.store;
        return 0;
      });
  }, [filters, activeTrip]);

  const handleApplyTripToMap = (trip: TripPlanResult) => {
    setActiveTrip(trip);
    setCurrentView('map');
  };

  const handleClearActiveTrip = () => {
    setActiveTrip(null);
  };

  const handleLocateOnMap = (station: FuelStation) => {
    setSelectedStation(station);
    setCurrentView('map');
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* Top Bar Navigation */}
      <Header
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
        }}
        filteredStations={filteredStations}
        totalStations={FUEL_STATIONS_DATA.length}
        onOpenSerpApiModal={() => setIsSerpApiOpen(true)}
      />

      {/* Corridor Active Indicator Strip */}
      {activeTrip && currentView === 'map' && (
        <div className="flex items-center justify-between px-5 py-2 bg-gradient-to-r from-blue-900/90 to-indigo-900/90 border-b border-blue-700/60 text-xs text-white z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Route Corridor Filter: <strong className="text-amber-300">{activeTrip.origin.label}</strong> &rarr;{' '}
              <strong className="text-amber-300">{activeTrip.destination.label}</strong> ({activeTrip.stationsAlongRoute.length} stations in {activeTrip.corridorMiles}mi corridor)
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearActiveTrip}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition-colors cursor-pointer"
          >
            Clear Route & Show All
          </button>
        </div>
      )}

      {/* Main Viewport Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {currentView === 'map' && (
          <>
            <StationSidebar
              stations={filteredStations}
              allStations={FUEL_STATIONS_DATA}
              selectedStation={selectedStation}
              onSelectStation={(station) => setSelectedStation(station)}
              filters={filters}
              onUpdateFilters={handleUpdateFilters}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            <div className="flex-1 relative h-full">
              <StationMap
                stations={filteredStations}
                allStations={FUEL_STATIONS_DATA}
                selectedStation={selectedStation}
                onSelectStation={(station) => setSelectedStation(station)}
                colorMetric={colorMetric}
                onChangeColorMetric={setColorMetric}
                activeTiers={filters.selectedTiers}
                onToggleTier={handleToggleTier}
                tankGallons={filters.tankGallons}
                activeTrip={activeTrip}
              />
            </div>
          </>
        )}

        {currentView === 'table' && (
          <StationTable
            stations={filteredStations}
            allStations={FUEL_STATIONS_DATA}
            onSelectStation={(station) => setSelectedStation(station)}
            onLocateOnMap={handleLocateOnMap}
            tankGallons={filters.tankGallons}
          />
        )}

        {currentView === 'trip' && (
          <TripPlanner
            allStations={FUEL_STATIONS_DATA}
            onApplyTripToMap={handleApplyTripToMap}
            onSelectStation={(station) => setSelectedStation(station)}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsView
            stations={FUEL_STATIONS_DATA}
            onSelectStation={(station) => setSelectedStation(station)}
            tankGallons={filters.tankGallons}
          />
        )}
      </main>

      {/* Station Details Inspector Modal */}
      {selectedStation && (
        <StationDetailModal
          station={selectedStation}
          allStations={FUEL_STATIONS_DATA}
          onClose={() => setSelectedStation(null)}
          onSelectStation={(st) => setSelectedStation(st)}
          defaultTankGallons={filters.tankGallons}
        />
      )}

      {/* SerpApi Endpoints Explorer Modal */}
      <SerpApiModal
        isOpen={isSerpApiOpen}
        onClose={() => setIsSerpApiOpen(false)}
      />
    </div>
  );
}
