import React, { useState, useMemo } from 'react';
import { FuelStation } from '../data/fuelStations';
import { NavigationRoute, POPULAR_FREIGHT_HUBS } from '../utils/routing';

interface RouteNavigationPanelProps {
  allStations: FuelStation[];
  activeRoute: NavigationRoute | null;
  isLoadingRoute: boolean;
  onCalculateRoute: (
    pu: { label: string; lat: number; lng: number },
    del: { label: string; lat: number; lng: number },
    corridorBuffer: number
  ) => void;
  onClearRoute: () => void;
  onSelectStation: (station: FuelStation) => void;
  isMapPickingPU: boolean;
  isMapPickingDEL: boolean;
  onStartMapPickPU: () => void;
  onStartMapPickDEL: () => void;
  tankGallons: number;
  corridorBuffer: number;
  onChangeCorridorBuffer: (miles: number) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const RouteNavigationPanel: React.FC<RouteNavigationPanelProps> = ({
  allStations,
  activeRoute,
  isLoadingRoute,
  onCalculateRoute,
  onClearRoute,
  onSelectStation,
  isMapPickingPU,
  isMapPickingDEL,
  onStartMapPickPU,
  onStartMapPickDEL,
  tankGallons,
  corridorBuffer,
  onChangeCorridorBuffer,
  isCollapsed,
  onToggleCollapse
}) => {
  const [puQuery, setPuQuery] = useState('Dallas, TX');
  const [delQuery, setDelQuery] = useState('Atlanta, GA');

  const [selectedPu, setSelectedPu] = useState<{ label: string; lat: number; lng: number }>({
    label: 'Dallas, TX',
    lat: 32.7767,
    lng: -96.7970
  });

  const [selectedDel, setSelectedDel] = useState<{ label: string; lat: number; lng: number }>({
    label: 'Atlanta, GA',
    lat: 33.7490,
    lng: -84.3880
  });

  const [showPuDropdown, setShowPuDropdown] = useState(false);
  const [showDelDropdown, setShowDelDropdown] = useState(false);

  // Filter freight hubs and stations for autocomplete
  const puSuggestions = useMemo(() => {
    const q = puQuery.toLowerCase().trim();
    const hubs = POPULAR_FREIGHT_HUBS.filter((h) => h.label.toLowerCase().includes(q));
    const stations = allStations
      .filter((s) => s.city.toLowerCase().includes(q) || s.store.toString().includes(q) || s.state.toLowerCase() === q)
      .slice(0, 8)
      .map((s) => ({ label: `Love's #${s.store} (${s.city}, ${s.state})`, lat: s.lat, lng: s.lng }));
    return [...hubs, ...stations].slice(0, 10);
  }, [puQuery, allStations]);

  const delSuggestions = useMemo(() => {
    const q = delQuery.toLowerCase().trim();
    const hubs = POPULAR_FREIGHT_HUBS.filter((h) => h.label.toLowerCase().includes(q));
    const stations = allStations
      .filter((s) => s.city.toLowerCase().includes(q) || s.store.toString().includes(q) || s.state.toLowerCase() === q)
      .slice(0, 8)
      .map((s) => ({ label: `Love's #${s.store} (${s.city}, ${s.state})`, lat: s.lat, lng: s.lng }));
    return [...hubs, ...stations].slice(0, 10);
  }, [delQuery, allStations]);

  const handleApplyRoute = (
    pu = selectedPu,
    del = selectedDel,
    buf = corridorBuffer
  ) => {
    if (!pu || !del) return;
    onCalculateRoute(pu, del, buf);
  };

  const handleSwap = () => {
    const tempP = selectedPu;
    const tempPQ = puQuery;
    setSelectedPu(selectedDel);
    setPuQuery(delQuery);
    setSelectedDel(tempP);
    setDelQuery(tempPQ);
    onCalculateRoute(selectedDel, tempP, corridorBuffer);
  };

  const formatHoursMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div
      className={`absolute top-5 left-5 z-20 flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-300 max-h-[calc(100vh-80px)] ${
        isCollapsed ? 'w-auto' : 'w-84 sm:w-96'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-600 text-white font-bold text-xs">
            🛣️
          </span>
          <span className="text-xs font-bold text-white tracking-wide">
            Route Fuel Navigation
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {activeRoute && (
            <button
              type="button"
              onClick={onClearRoute}
              className="text-[11px] text-slate-400 hover:text-red-400 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear Route Navigation"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer text-xs"
            title={isCollapsed ? 'Expand Route Navigator' : 'Collapse Route Navigator'}
          >
            {isCollapsed ? '+' : '–'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex flex-col overflow-y-auto">
          {/* PU and DEL Input Form */}
          <div className="p-4 space-y-3 border-b border-slate-800 bg-slate-950/40">
            {/* Pick-Up (PU) Location */}
            <div className="relative">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
                  PU (Pick-Up Origin)
                </span>
                <button
                  type="button"
                  onClick={onStartMapPickPU}
                  className={`text-[10px] font-medium transition-colors cursor-pointer ${
                    isMapPickingPU
                      ? 'text-emerald-300 font-bold underline animate-pulse'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                  title="Click anywhere on the map to set Pick-up location"
                >
                  {isMapPickingPU ? 'Click on map now...' : 'Pick on Map'}
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={puQuery}
                  onFocus={() => setShowPuDropdown(true)}
                  onChange={(e) => {
                    setPuQuery(e.target.value);
                    setShowPuDropdown(true);
                  }}
                  placeholder="Enter city or store #..."
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />

                {showPuDropdown && puSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-9 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-800/80 text-xs">
                    {puSuggestions.map((item, idx) => (
                      <button
                        key={`pu-${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedPu(item);
                          setPuQuery(item.label);
                          setShowPuDropdown(false);
                          handleApplyRoute(item, selectedDel, corridorBuffer);
                        }}
                        className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex items-center justify-center -my-1">
              <button
                type="button"
                onClick={handleSwap}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-transform active:rotate-180 cursor-pointer shadow"
                title="Swap Pick-up and Delivery"
              >
                ⇅
              </button>
            </div>

            {/* Delivery (DEL) Location */}
            <div className="relative">
              <div className="flex items-center justify-between text-[11px] font-semibold text-rose-400 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/30" />
                  DEL (Delivery Destination)
                </span>
                <button
                  type="button"
                  onClick={onStartMapPickDEL}
                  className={`text-[10px] font-medium transition-colors cursor-pointer ${
                    isMapPickingDEL
                      ? 'text-rose-300 font-bold underline animate-pulse'
                      : 'text-slate-400 hover:text-rose-300'
                  }`}
                  title="Click anywhere on the map to set Delivery location"
                >
                  {isMapPickingDEL ? 'Click on map now...' : 'Pick on Map'}
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={delQuery}
                  onFocus={() => setShowDelDropdown(true)}
                  onChange={(e) => {
                    setDelQuery(e.target.value);
                    setShowDelDropdown(true);
                  }}
                  placeholder="Enter city or store #..."
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />

                {showDelDropdown && delSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-9 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-800/80 text-xs">
                    {delSuggestions.map((item, idx) => (
                      <button
                        key={`del-${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedDel(item);
                          setDelQuery(item.label);
                          setShowDelDropdown(false);
                          handleApplyRoute(selectedPu, item, corridorBuffer);
                        }}
                        className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Corridor Buffer & Action Button */}
            <div className="pt-2 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Corridor:</span>
                {[15, 25, 40].map((dist) => (
                  <button
                    key={dist}
                    type="button"
                    onClick={() => {
                      onChangeCorridorBuffer(dist);
                      handleApplyRoute(selectedPu, selectedDel, dist);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      corridorBuffer === dist
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {dist}mi
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={isLoadingRoute}
                onClick={() => handleApplyRoute()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoadingRoute ? (
                  <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                ) : (
                  <span>Route Highway</span>
                )}
              </button>
            </div>
          </div>

          {/* Active Navigation Summary & Stops Along Route */}
          {activeRoute && (
            <div className="p-4 space-y-3">
              {/* Route KPI bar */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">Distance</span>
                  <span className="text-xs font-bold font-mono text-white tabular-nums">
                    {activeRoute.distanceMiles} mi
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Drive Time</span>
                  <span className="text-xs font-bold font-mono text-sky-400 tabular-nums">
                    {formatHoursMinutes(activeRoute.durationMinutes)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Fuel Stops</span>
                  <span className="text-xs font-bold font-mono text-emerald-400 tabular-nums">
                    {activeRoute.stops.length} on road
                  </span>
                </div>
              </div>

              {/* Recommended Refueling Deal Banner */}
              {activeRoute.cheapestStop && (
                <div
                  onClick={() => onSelectStation(activeRoute.cheapestStop!.station)}
                  className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-600/60 shadow-lg cursor-pointer hover:border-emerald-500 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <span>⭐</span> Best Fuel Stop On Road
                    </span>
                    <span className="text-xs font-bold font-mono text-emerald-300 tabular-nums">
                      ${activeRoute.cheapestStop.station.best_disc.toFixed(3)}/gal
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                    Love's #{activeRoute.cheapestStop.station.store} - {activeRoute.cheapestStop.station.city}, {activeRoute.cheapestStop.station.state}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1.5 border-t border-emerald-900/50">
                    <span className="font-mono text-slate-400">
                      Mile {activeRoute.cheapestStop.mileMarker} ({activeRoute.cheapestStop.distanceOffRouteMiles}mi off road)
                    </span>
                    <span className="text-amber-300 font-bold font-mono tabular-nums">
                      Save ${(activeRoute.cheapestStop.station.savings * tankGallons).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Sequential Fuel Stops along the Road */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Fuel Stops by Mile Marker
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    PU &rarr; DEL ({activeRoute.stops.length})
                  </span>
                </div>

                {activeRoute.stops.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
                    No Love's stations within {corridorBuffer} miles of this highway route. Try increasing corridor width.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {activeRoute.stops.map((stop) => {
                      const isBest = stop.isCheapestOnRoute;
                      return (
                        <div
                          key={`route-stop-${stop.station.store}`}
                          onClick={() => onSelectStation(stop.station)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            isBest
                              ? 'bg-emerald-950/40 border-emerald-600/80 ring-1 ring-emerald-500/30'
                              : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono font-bold text-slate-300">
                              M{stop.mileMarker}
                            </span>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>#{stop.station.store}</span>
                                <span className="font-medium text-slate-300 truncate max-w-[120px]">
                                  {stop.station.city}, {stop.station.state}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {stop.distanceOffRouteMiles} mi off highway
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`font-mono font-bold text-xs tabular-nums block ${
                              isBest ? 'text-emerald-400 font-extrabold' : 'text-slate-200'
                            }`}>
                              ${stop.station.best_disc.toFixed(3)}
                            </span>
                            <span className="text-[10px] text-blue-400 font-mono">
                              -${stop.station.savings.toFixed(3)}/gal
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Google Maps External Turn-by-Turn Link */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                  activeRoute.puLocation.label
                )}&destination=${encodeURIComponent(
                  activeRoute.delLocation.label
                )}${
                  activeRoute.cheapestStop
                    ? `&waypoints=${activeRoute.cheapestStop.station.lat},${activeRoute.cheapestStop.station.lng}`
                    : ''
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow transition-colors text-center"
              >
                <span>Navigate Full Route in Google Maps ↗</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
