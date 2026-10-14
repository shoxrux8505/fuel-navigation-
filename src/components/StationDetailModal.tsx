import React, { useState } from 'react';
import { FuelStation } from '../data/fuelStations';
import { calculateDistanceMiles } from '../utils/geo';

interface StationDetailModalProps {
  station: FuelStation | null;
  allStations: FuelStation[];
  onClose: () => void;
  onSelectStation: (station: FuelStation) => void;
  defaultTankGallons: number;
}

export const StationDetailModal: React.FC<StationDetailModalProps> = ({
  station,
  allStations,
  onClose,
  onSelectStation,
  defaultTankGallons
}) => {
  const [gallons, setGallons] = useState(defaultTankGallons);
  const [copied, setCopied] = useState(false);

  if (!station) return null;

  // Calculate nearby stations
  const nearbyStations = allStations
    .filter((s) => s.store !== station.store)
    .map((s) => ({
      station: s,
      distance: calculateDistanceMiles(station.lat, station.lng, s.lat, s.lng)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  const totalRetail = gallons * station.retail;
  const totalDiscounted = gallons * station.best_disc;
  const totalSaved = gallons * station.savings;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const gmapsLink = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-600 text-amber-300 font-bold text-sm shadow-md">
              L♥
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Love's Travel Stop #{station.store}
              </h3>
              <p className="text-xs text-slate-400">
                {station.city}, {station.state} &middot; <span className="font-mono">{station.lat.toFixed(4)}° N, {Math.abs(station.lng).toFixed(4)}° W</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Price Card */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Best Discounted Diesel
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                Save ${station.savings.toFixed(3)}/gal
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-extrabold font-mono text-emerald-400 tabular-nums">
                ${station.best_disc.toFixed(3)}
              </span>
              <span className="text-sm text-slate-400">per gallon</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Standard Retail Diesel</span>
                <span className="text-slate-200 font-mono font-medium text-sm tabular-nums">
                  ${station.retail.toFixed(3)}/gal
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">DEF Retail Price</span>
                <span className="text-slate-200 font-mono font-medium text-sm tabular-nums">
                  {station.def_retail > 0 ? `$${station.def_retail.toFixed(3)}/gal` : 'Unavailable'}
                </span>
              </div>
            </div>
          </div>

          {/* Fill-up Savings Calculator */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">
                Fill-Up Calculator & Savings
              </span>
              <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                {gallons} Gallons
              </span>
            </div>

            <input
              type="range"
              min="20"
              max="300"
              step="5"
              value={gallons}
              onChange={(e) => setGallons(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 mb-3"
            />

            <div className="flex items-center gap-2 mb-4">
              {[35, 75, 120, 150, 220].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGallons(preset)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    gallons === preset
                      ? 'bg-amber-400 text-slate-900 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset} gal
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-900 border border-slate-800 text-center text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Retail Total</span>
                <span className="text-slate-300 font-mono font-medium tabular-nums">
                  ${totalRetail.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Discount Total</span>
                <span className="text-emerald-400 font-mono font-semibold tabular-nums">
                  ${totalDiscounted.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">You Pocket</span>
                <span className="text-amber-300 font-mono font-bold tabular-nums">
                  +${totalSaved.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={gmapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-colors text-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Open in Google Maps ↗
            </a>

            <button
              type="button"
              onClick={handleCopyCoords}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? 'Coordinates Copied!' : 'Copy Coordinates'}
            </button>
          </div>

          {/* Nearby Love's Stops */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Nearest Love's Along Highway
            </h4>
            <div className="space-y-2">
              {nearbyStations.map(({ station: nb, distance }) => (
                <div
                  key={nb.store}
                  onClick={() => onSelectStation(nb)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:bg-slate-800 hover:border-slate-700 transition-colors cursor-pointer text-xs"
                >
                  <div>
                    <span className="font-bold text-white">#{nb.store}</span>{' '}
                    <span className="text-slate-300 font-medium">
                      {nb.city}, {nb.state}
                    </span>
                    <span className="text-slate-500 block text-[11px] font-mono">
                      {Math.round(distance)} miles away
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold font-mono tabular-nums block">
                      ${nb.best_disc.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-blue-400 font-medium">
                      Save ${nb.savings.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
