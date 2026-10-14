import React, { useState } from 'react';
import { FuelStation } from '../data/fuelStations';
import { TripPlanResult, TripPoint } from '../types';
import { calculateDistanceMiles, findStationsInCorridor } from '../utils/geo';

interface TripPlannerProps {
  allStations: FuelStation[];
  onApplyTripToMap: (trip: TripPlanResult) => void;
  onSelectStation: (station: FuelStation) => void;
}

const PRESET_CORRIDORS: { label: string; origin: TripPoint; dest: TripPoint; desc: string }[] = [
  {
    label: 'I-40 Cross-Country Corridor (OKC to Nashville)',
    origin: { label: 'Oklahoma City, OK', lat: 35.4579, lng: -97.6885, state: 'OK' },
    dest: { label: 'Nashville, TN', lat: 36.2056, lng: -86.7716, state: 'TN' },
    desc: 'Classic freight route through Arkansas and Tennessee'
  },
  {
    label: 'I-35 North-South Corridor (Dallas to Kansas City)',
    origin: { label: 'Dallas, TX', lat: 32.6408, lng: -96.8393, state: 'TX' },
    dest: { label: 'Kansas City, MO', lat: 39.1538, lng: -94.4754, state: 'MO' },
    desc: 'Major central logistics pipeline through Oklahoma and Kansas'
  },
  {
    label: 'I-10 Southern Corridor (Houston to Jacksonville)',
    origin: { label: 'Houston, TX', lat: 29.7986, lng: -95.269, state: 'TX' },
    dest: { label: 'Jacksonville, FL', lat: 30.2914, lng: -81.9851, state: 'FL' },
    desc: 'Gulf coast freight artery through Louisiana, Mississippi, Alabama, and Florida'
  },
  {
    label: 'I-75 Midwest-Southeast (Detroit/Toledo to Atlanta)',
    origin: { label: 'Perrysburg, OH', lat: 41.5372, lng: -83.4667, state: 'OH' },
    dest: { label: 'Jackson, GA', lat: 33.2081, lng: -84.0585, state: 'GA' },
    desc: 'Heavy commercial transit via Ohio, Kentucky, Tennessee, and Georgia'
  },
  {
    label: 'I-80 Western Transcontinental (Salt Lake City to Omaha)',
    origin: { label: 'Salt Lake City, UT', lat: 40.7699, lng: -111.9399, state: 'UT' },
    dest: { label: 'Omaha, NE', lat: 41.1836, lng: -96.1495, state: 'NE' },
    desc: 'Mountain-to-plains interstate crossing Wyoming and Nebraska'
  }
];

export const TripPlanner: React.FC<TripPlannerProps> = ({
  allStations,
  onApplyTripToMap,
  onSelectStation
}) => {
  const [originStore, setOriginStore] = useState<string>('203'); // OKC
  const [destStore, setDestStore] = useState<string>('429'); // Nashville
  const [corridorMiles, setCorridorMiles] = useState<number>(45);
  const [activePlan, setActivePlan] = useState<TripPlanResult | null>(null);

  // Compute stations along route
  const handleCalculateRoute = (
    origLat: number,
    origLng: number,
    origLabel: string,
    origState: string,
    destLat: number,
    destLng: number,
    destLabel: string,
    destState: string,
    corridor: number
  ) => {
    const totalDistance = calculateDistanceMiles(origLat, origLng, destLat, destLng);
    const corridorStations = findStationsInCorridor(
      allStations,
      origLat,
      origLng,
      destLat,
      destLng,
      corridor
    );

    // Sort stations by distance from origin
    corridorStations.sort((a, b) => {
      const distA = calculateDistanceMiles(origLat, origLng, a.lat, a.lng);
      const distB = calculateDistanceMiles(origLat, origLng, b.lat, b.lng);
      return distA - distB;
    });

    let cheapest: FuelStation | null = null;
    let bestSavings: FuelStation | null = null;

    if (corridorStations.length > 0) {
      cheapest = corridorStations.reduce((prev, curr) =>
        curr.best_disc < prev.best_disc ? curr : prev
      );
      bestSavings = corridorStations.reduce((prev, curr) =>
        curr.savings > prev.savings ? curr : prev
      );
    }

    const plan: TripPlanResult = {
      origin: { label: origLabel, lat: origLat, lng: origLng, state: origState },
      destination: { label: destLabel, lat: destLat, lng: destLng, state: destState },
      stationsAlongRoute: corridorStations,
      cheapestStation: cheapest,
      bestSavingsStation: bestSavings,
      corridorMiles: corridor,
      totalDistanceMiles: Math.round(totalDistance)
    };

    setActivePlan(plan);
  };

  const handleApplyPreset = (preset: typeof PRESET_CORRIDORS[0]) => {
    handleCalculateRoute(
      preset.origin.lat,
      preset.origin.lng,
      preset.origin.label,
      preset.origin.state,
      preset.dest.lat,
      preset.dest.lng,
      preset.dest.label,
      preset.dest.state,
      corridorMiles
    );
  };

  const handleCustomCalculate = () => {
    const orig = allStations.find((s) => s.store === Number(originStore));
    const dest = allStations.find((s) => s.store === Number(destStore));

    if (!orig || !dest) return;

    handleCalculateRoute(
      orig.lat,
      orig.lng,
      `Love's #${orig.store} (${orig.city}, ${orig.state})`,
      orig.state,
      dest.lat,
      dest.lng,
      `Love's #${dest.store} (${dest.city}, ${dest.state})`,
      dest.state,
      corridorMiles
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Title Header */}
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            Highway Route & Fuel Stop Corridor Planner
          </h2>
          <p className="text-sm text-slate-400">
            Identify all Love's stations along your route corridor, compare diesel prices along the way, and find the cheapest stop to maximize fuel tank savings.
          </p>
        </div>

        {/* Corridor Presets Grid */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Quick Route Corridors
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESET_CORRIDORS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/80 hover:bg-slate-800/80 text-left transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-slate-200 group-hover:text-red-400 mb-1 transition-colors">
                  {preset.label}
                </div>
                <div className="text-[11px] text-slate-400 mb-2">{preset.desc}</div>
                <div className="flex items-center gap-2 text-[10px] text-amber-400 font-medium">
                  <span>{preset.origin.label}</span>
                  <span>&rarr;</span>
                  <span>{preset.dest.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Station-to-Station Selector */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold text-white">Custom Station-to-Station Route</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Origin Station</label>
              <select
                value={originStore}
                onChange={(e) => setOriginStore(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
              >
                {allStations.map((s) => (
                  <option key={`orig-${s.store}`} value={s.store}>
                    #{s.store} - {s.city}, {s.state} (${s.best_disc.toFixed(3)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Destination Station</label>
              <select
                value={destStore}
                onChange={(e) => setDestStore(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
              >
                {allStations.map((s) => (
                  <option key={`dest-${s.store}`} value={s.store}>
                    #{s.store} - {s.city}, {s.state} (${s.best_disc.toFixed(3)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">
                Corridor Width: <strong className="text-amber-400">{corridorMiles} miles</strong>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={corridorMiles}
                  onChange={(e) => setCorridorMiles(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <button
                  type="button"
                  onClick={handleCustomCalculate}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  Find Fuel Stops
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Display */}
        {activePlan && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activePlan.origin.label}</span>
                  <span className="text-slate-500">&rarr;</span>
                  <span>{activePlan.destination.label}</span>
                </h4>
                <div className="text-xs text-slate-400 mt-0.5">
                  Direct Highway Distance: <span className="font-mono text-slate-200">{activePlan.totalDistanceMiles} miles</span> &middot;{' '}
                  Corridor: <span className="font-mono text-slate-200">&plusmn;{activePlan.corridorMiles} miles</span> &middot;{' '}
                  <span className="text-emerald-400 font-semibold">{activePlan.stationsAlongRoute.length} Love's Fuel Stops Located</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onApplyTripToMap(activePlan)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                View Route on Map
              </button>
            </div>

            {/* Recommendations Row */}
            {activePlan.cheapestStation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cheapest stop recommendation */}
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                      Cheapest Fuel Stop on Route
                    </span>
                    <span className="text-xs font-bold font-mono text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded">
                      ${activePlan.cheapestStation.best_disc.toFixed(3)}/gal
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mb-1">
                    Love's #{activePlan.cheapestStation.store} - {activePlan.cheapestStation.city}, {activePlan.cheapestStation.state}
                  </div>
                  <div className="text-xs text-slate-300 flex items-center justify-between mt-2 pt-2 border-t border-emerald-900/50">
                    <span>Retail: ${activePlan.cheapestStation.retail.toFixed(3)}</span>
                    <span className="text-emerald-400 font-semibold">
                      Save ${activePlan.cheapestStation.savings.toFixed(3)}/gal
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectStation(activePlan.cheapestStation!)}
                      className="text-amber-400 hover:underline font-medium cursor-pointer"
                    >
                      View Details &rarr;
                    </button>
                  </div>
                </div>

                {/* Maximum savings stop */}
                {activePlan.bestSavingsStation && (
                  <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wider font-bold text-blue-400">
                        Top Discount Off Retail
                      </span>
                      <span className="text-xs font-bold font-mono text-blue-300 bg-blue-900/80 px-2 py-0.5 rounded">
                        -${activePlan.bestSavingsStation.savings.toFixed(3)}/gal
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white mb-1">
                      Love's #{activePlan.bestSavingsStation.store} - {activePlan.bestSavingsStation.city}, {activePlan.bestSavingsStation.state}
                    </div>
                    <div className="text-xs text-slate-300 flex items-center justify-between mt-2 pt-2 border-t border-blue-900/50">
                      <span>Discount Price: ${activePlan.bestSavingsStation.best_disc.toFixed(3)}</span>
                      <span className="text-amber-300 font-semibold">
                        (Retail ${activePlan.bestSavingsStation.retail.toFixed(3)})
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectStation(activePlan.bestSavingsStation!)}
                        className="text-amber-400 hover:underline font-medium cursor-pointer"
                      >
                        View Details &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* List of stations along the route in geographical order */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                All Fuel Stops Along Route (Origin &rarr; Destination)
              </h4>

              {activePlan.stationsAlongRoute.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  No Love's stations found within {activePlan.corridorMiles} miles of this route. Try increasing the corridor width.
                </div>
              ) : (
                <div className="space-y-2">
                  {activePlan.stationsAlongRoute.map((st, idx) => (
                    <div
                      key={st.store}
                      onClick={() => onSelectStation(st)}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700 transition-colors cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-white">#{st.store}</span>{' '}
                          <span className="text-slate-200">{st.city}, {st.state}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <span className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                            ${st.best_disc.toFixed(3)}
                          </span>
                          <span className="text-slate-500 text-[10px] block">/gal</span>
                        </div>
                        <div className="hidden sm:block">
                          <span className="text-blue-400 font-mono text-xs tabular-nums">
                            -${st.savings.toFixed(3)}
                          </span>
                          <span className="text-slate-500 text-[10px] block">discount</span>
                        </div>
                        <div className="hidden md:block">
                          <span className="text-slate-400 font-mono text-xs tabular-nums">
                            {st.def_retail > 0 ? `$${st.def_retail.toFixed(3)}` : 'N/A'}
                          </span>
                          <span className="text-slate-500 text-[10px] block">DEF</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
