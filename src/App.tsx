import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { RouteNavigationPanel } from './components/RouteNavigationPanel';
import { fetchDrivingRoute, findStationsAlongRoute, NavigationRoute } from './utils/routing';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('map');
  const [selectedStation, setSelectedStation] = useState<FuelStation | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [colorMetric, setColorMetric] = useState<ColorMetric>('best_disc');
  const [activeTrip, setActiveTrip] = useState<TripPlanResult | null>(null);
  const [isSerpApiOpen, setIsSerpApiOpen] = useState(false);

  // PU & DEL Navigation Route State
  const [navigationMode, setNavigationMode] = useState<boolean>(true); // default true for user's explicit request
  const [activeRoute, setActiveRoute] = useState<NavigationRoute | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [corridorBuffer, setCorridorBuffer] = useState<number>(25);
  const [isNavPanelCollapsed, setIsNavPanelCollapsed] = useState<boolean>(false);
  const [isMapPickingPU, setIsMapPickingPU] = useState<boolean>(false);
  const [isMapPickingDEL, setIsMapPickingDEL] = useState<boolean>(false);

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

  // Route calculation handler
  const handleCalculateRoute = useCallback(
    async (
      pu: { label: string; lat: number; lng: number },
      del: { label: string; lat: number; lng: number },
      bufferMiles: number = corridorBuffer
    ) => {
      setIsLoadingRoute(true);
      try {
        const roadData = await fetchDrivingRoute(pu.lat, pu.lng, del.lat, del.lng);
        const stops = findStationsAlongRoute(FUEL_STATIONS_DATA, roadData.coordinates, bufferMiles);

        let cheapest = stops.find((s) => s.isCheapestOnRoute) || null;
        let bestSav = stops.find((s) => s.isMaxSavingsOnRoute) || null;

        const totalSav = stops.reduce((acc, s) => acc + s.station.savings * filters.tankGallons, 0);

        const routeResult: NavigationRoute = {
          puLocation: pu,
          delLocation: del,
          distanceMiles: roadData.distanceMiles,
          durationMinutes: roadData.durationMinutes,
          geometry: roadData.coordinates,
          stops,
          cheapestStop: cheapest,
          bestSavingsStop: bestSav,
          totalPotentialSavings: totalSav
        };

        setActiveRoute(routeResult);
      } catch (err) {
        console.error('Failed to calculate route:', err);
      } finally {
        setIsLoadingRoute(false);
      }
    },
    [corridorBuffer, filters.tankGallons]
  );

  // Initialize initial route on load (Dallas, TX to Atlanta, GA)
  useEffect(() => {
    handleCalculateRoute(
      { label: 'Dallas, TX', lat: 32.7767, lng: -96.7970 },
      { label: 'Atlanta, GA', lat: 33.7490, lng: -84.3880 },
      25
    );
  }, []);

  // Map click handler for picking PU or DEL on the map
  const handleMapClickPoint = (lat: number, lng: number) => {
    if (isMapPickingPU) {
      const label = `PU (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;
      const newPu = { label, lat, lng };
      setIsMapPickingPU(false);
      if (activeRoute) {
        handleCalculateRoute(newPu, activeRoute.delLocation, corridorBuffer);
      }
    } else if (isMapPickingDEL) {
      const label = `DEL (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;
      const newDel = { label, lat, lng };
      setIsMapPickingDEL(false);
      if (activeRoute) {
        handleCalculateRoute(activeRoute.puLocation, newDel, corridorBuffer);
      }
    }
  };

  const handleCancelMapPick = () => {
    setIsMapPickingPU(false);
    setIsMapPickingDEL(false);
  };

  const handleClearRoute = () => {
    setActiveRoute(null);
  };

  // Filter stations based on search, state, tiers, and corridor (if trip is active)
  const filteredStations = useMemo(() => {
    // If navigation mode is active and user has a route, prioritize route stations or full network
    const baseList = activeRoute ? activeRoute.stops.map((s) => s.station) : (activeTrip ? activeTrip.stationsAlongRoute : FUEL_STATIONS_DATA);

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
  }, [filters, activeRoute, activeTrip]);

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
            {/* Left Sidebar (Only visible when navigation mode is disabled) */}
            {!navigationMode && (
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
            )}

            <div className="flex-1 relative h-full">
              {/* Map Canvas */}
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
                activeRoute={activeRoute}
                isMapPickingPU={isMapPickingPU}
                isMapPickingDEL={isMapPickingDEL}
                onMapClickPoint={handleMapClickPoint}
                onCancelMapPick={handleCancelMapPick}
              />

              {/* Mode Switcher Pill (Top Center Left): Switch between PU/DEL Road Navigation and Station Directory */}
              <div className="absolute top-5 left-5 z-20 flex items-center bg-slate-900/95 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md text-xs">
                <button
                  type="button"
                  onClick={() => setNavigationMode(true)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    navigationMode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🛣️</span>
                  <span>PU & DEL Navigation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNavigationMode(false)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    !navigationMode
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>📍</span>
                  <span>Browse All Stations</span>
                </button>
              </div>

              {/* PU & DEL Highway Route Navigation Panel */}
              {navigationMode && (
                <div className="mt-14">
                  <RouteNavigationPanel
                    allStations={FUEL_STATIONS_DATA}
                    activeRoute={activeRoute}
                    isLoadingRoute={isLoadingRoute}
                    onCalculateRoute={handleCalculateRoute}
                    onClearRoute={handleClearRoute}
                    onSelectStation={(station) => setSelectedStation(station)}
                    isMapPickingPU={isMapPickingPU}
                    isMapPickingDEL={isMapPickingDEL}
                    onStartMapPickPU={() => {
                      setIsMapPickingDEL(false);
                      setIsMapPickingPU(true);
                    }}
                    onStartMapPickDEL={() => {
                      setIsMapPickingPU(false);
                      setIsMapPickingDEL(true);
                    }}
                    tankGallons={filters.tankGallons}
                    corridorBuffer={corridorBuffer}
                    onChangeCorridorBuffer={setCorridorBuffer}
                    isCollapsed={isNavPanelCollapsed}
                    onToggleCollapse={() => setIsNavPanelCollapsed(!isNavPanelCollapsed)}
                  />
                </div>
              )}
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
