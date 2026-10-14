import React from 'react';
import { FuelStation, TIER_CONFIG } from '../data/fuelStations';
import { FilterOptions } from '../types';

interface StationSidebarProps {
  stations: FuelStation[];
  allStations: FuelStation[];
  selectedStation: FuelStation | null;
  onSelectStation: (station: FuelStation) => void;
  filters: FilterOptions;
  onUpdateFilters: (newFilters: Partial<FilterOptions>) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const StationSidebar: React.FC<StationSidebarProps> = ({
  stations,
  allStations,
  selectedStation,
  onSelectStation,
  filters,
  onUpdateFilters,
  isCollapsed,
  onToggleCollapse
}) => {
  // Extract all states and counts
  const stateCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    allStations.forEach((s) => {
      counts[s.state] = (counts[s.state] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allStations]);

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 z-20 shrink-0 ${
        isCollapsed ? 'w-12' : 'w-80 md:w-96'
      }`}
    >
      {/* Collapse/Expand Toggle Tab */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="absolute -right-3.5 top-5 flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 shadow-md cursor-pointer z-30 transition-transform"
        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {isCollapsed ? (
        <div className="flex flex-col items-center py-6 gap-6 text-slate-400">
          <div className="rotate-90 text-xs font-semibold whitespace-nowrap tracking-wider">
            STATIONS ({stations.length})
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header Controls */}
          <div className="p-4 border-b border-slate-800 space-y-3 shrink-0 bg-slate-900/90 backdrop-blur-sm">
            {/* Search Input */}
            <div className="relative">
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search store #, city, or state..."
                value={filters.searchQuery}
                onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
                className="w-full pl-9 pr-8 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-red-500 transition-colors"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ searchQuery: '' })}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* State Filter & Sort Bar */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">State</label>
                <select
                  value={filters.selectedState}
                  onChange={(e) => onUpdateFilters({ selectedState: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="">All States ({allStations.length})</option>
                  {stateCounts.map(([st, count]) => (
                    <option key={st} value={st}>
                      {st} ({count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => onUpdateFilters({ sortBy: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="price_asc">Lowest Price ($/gal)</option>
                  <option value="savings_desc">Highest Savings</option>
                  <option value="price_desc">Highest Price</option>
                  <option value="def_asc">Lowest DEF Price</option>
                  <option value="store_asc">Store # (Ascending)</option>
                </select>
              </div>
            </div>

            {/* Tank Capacity Estimator */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Tank Fill Size:</span>
              <div className="flex items-center gap-1.5">
                {[50, 120, 200].map((gal) => (
                  <button
                    key={gal}
                    type="button"
                    onClick={() => onUpdateFilters({ tankGallons: gal })}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                      filters.tankGallons === gal
                        ? 'bg-amber-400 text-slate-900 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {gal} gal
                  </button>
                ))}
              </div>
            </div>

            {/* Results count & Clear filters */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>
                Found <strong className="text-white font-mono">{stations.length}</strong> stations
              </span>
              {(filters.searchQuery || filters.selectedState || filters.minSavings > 0) && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateFilters({
                      searchQuery: '',
                      selectedState: '',
                      minSavings: 0,
                      selectedTiers: TIER_CONFIG.map((t) => t.id)
                    })
                  }
                  className="text-red-400 hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Station List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1.5">
            {stations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <p className="font-semibold text-slate-300 mb-1">No stations match filters</p>
                <p>Try clearing your search query or selecting "All States".</p>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateFilters({
                      searchQuery: '',
                      selectedState: '',
                      minSavings: 0,
                      selectedTiers: TIER_CONFIG.map((t) => t.id)
                    })
                  }
                  className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs cursor-pointer font-medium"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              stations.map((station) => {
                const isSelected = selectedStation?.store === station.store;
                const fillSavings = (station.savings * filters.tankGallons).toFixed(2);

                return (
                  <div
                    key={station.store}
                    onClick={() => onSelectStation(station)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/95 border-red-500 shadow-md ring-1 ring-red-500/50'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            #{station.store}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">
                            {station.city}, {station.state}
                          </span>
                        </div>
                      </div>

                      {/* Best Discount Price */}
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                          ${station.best_disc.toFixed(3)}
                        </div>
                        <div className="text-[10px] text-slate-400">/gallon</div>
                      </div>
                    </div>

                    {/* Pricing breakdown stats */}
                    <div className="grid grid-cols-3 gap-1 pt-2 mt-1 border-t border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Retail</span>
                        <span className="text-slate-300 font-mono tabular-nums">
                          ${station.retail.toFixed(3)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Discount</span>
                        <span className="text-blue-400 font-mono font-medium tabular-nums">
                          -${station.savings.toFixed(3)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px]">{filters.tankGallons}g Fill</span>
                        <span className="text-amber-300 font-mono font-bold tabular-nums">
                          +${fillSavings}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
