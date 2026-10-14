import React, { useMemo } from 'react';
import { FuelStation, TIER_CONFIG } from '../data/fuelStations';

interface AnalyticsViewProps {
  stations: FuelStation[];
  onSelectStation: (station: FuelStation) => void;
  tankGallons: number;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stations,
  onSelectStation,
  tankGallons
}) => {
  const stats = useMemo(() => {
    if (stations.length === 0) return null;

    let minPriceStation = stations[0];
    let maxSavingsStation = stations[0];
    let totalDiscountPrice = 0;
    let totalRetailPrice = 0;
    let totalSavings = 0;

    stations.forEach((s) => {
      if (s.best_disc < minPriceStation.best_disc) minPriceStation = s;
      if (s.savings > maxSavingsStation.savings) maxSavingsStation = s;
      totalDiscountPrice += s.best_disc;
      totalRetailPrice += s.retail;
      totalSavings += s.savings;
    });

    const avgDiscountPrice = totalDiscountPrice / stations.length;
    const avgRetailPrice = totalRetailPrice / stations.length;
    const avgSavings = totalSavings / stations.length;
    const avgFillSavings = avgSavings * tankGallons;

    // Top 5 cheapest
    const cheapest5 = [...stations]
      .sort((a, b) => a.best_disc - b.best_disc)
      .slice(0, 5);

    // Top 5 max savings
    const savings5 = [...stations]
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 5);

    // State averages
    const stateMap: Record<string, { count: number; totalDisc: number; totalSav: number }> = {};
    stations.forEach((s) => {
      if (!stateMap[s.state]) {
        stateMap[s.state] = { count: 0, totalDisc: 0, totalSav: 0 };
      }
      stateMap[s.state].count++;
      stateMap[s.state].totalDisc += s.best_disc;
      stateMap[s.state].totalSav += s.savings;
    });

    const stateAverages = Object.entries(stateMap)
      .map(([st, data]) => ({
        state: st,
        count: data.count,
        avgPrice: data.totalDisc / data.count,
        avgSavings: data.totalSav / data.count
      }))
      .sort((a, b) => a.avgPrice - b.avgPrice);

    return {
      minPriceStation,
      maxSavingsStation,
      avgDiscountPrice,
      avgRetailPrice,
      avgSavings,
      avgFillSavings,
      cheapest5,
      savings5,
      stateAverages
    };
  }, [stations, tankGallons]);

  if (!stats) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            Fuel Price Analytics & Fleet Savings Intelligence
          </h2>
          <p className="text-sm text-slate-400">
            Comprehensive price distribution across all {stations.length} Love's Travel Stop locations, identifying high-yield refueling corridors.
          </p>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Lowest Price */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs uppercase font-medium text-slate-400 block mb-1">
              Lowest Price Nationwide
            </span>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 tabular-nums">
              ${stats.minPriceStation.best_disc.toFixed(3)}
              <span className="text-xs text-slate-400 font-sans font-normal"> /gal</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 truncate">
              Love's #{stats.minPriceStation.store} &middot; {stats.minPriceStation.city}, {stats.minPriceStation.state}
            </p>
          </div>

          {/* Highest Savings */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs uppercase font-medium text-slate-400 block mb-1">
              Max Per-Gallon Discount
            </span>
            <div className="text-2xl font-extrabold font-mono text-blue-400 tabular-nums">
              -${stats.maxSavingsStation.savings.toFixed(3)}
              <span className="text-xs text-slate-400 font-sans font-normal"> /gal</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 truncate">
              Love's #{stats.maxSavingsStation.store} &middot; {stats.maxSavingsStation.city}, {stats.maxSavingsStation.state}
            </p>
          </div>

          {/* Average Discount Price */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs uppercase font-medium text-slate-400 block mb-1">
              Network Avg Discount
            </span>
            <div className="text-2xl font-extrabold font-mono text-slate-200 tabular-nums">
              ${stats.avgDiscountPrice.toFixed(3)}
              <span className="text-xs text-slate-400 font-sans font-normal"> /gal</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Retail Avg: ${stats.avgRetailPrice.toFixed(3)}/gal
            </p>
          </div>

          {/* Avg Tank Fill Savings */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs uppercase font-medium text-slate-400 block mb-1">
              Avg Savings ({tankGallons}g Fill)
            </span>
            <div className="text-2xl font-extrabold font-mono text-amber-400 tabular-nums">
              +${stats.avgFillSavings.toFixed(2)}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Based on ${stats.avgSavings.toFixed(3)}/gal avg discount
            </p>
          </div>
        </div>

        {/* Tier Distribution Bar */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Price Quartile Distribution</h3>
            <span className="text-xs text-slate-400 font-mono">{stations.length} stations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TIER_CONFIG.map((tier) => {
              const count = stations.filter((s) => {
                if (tier.min !== undefined && tier.max !== undefined) {
                  return s.best_disc > tier.min && s.best_disc <= tier.max;
                }
                if (tier.max !== undefined) return s.best_disc <= tier.max;
                if (tier.min !== undefined) return s.best_disc > tier.min;
                return true;
              }).length;
              const pct = ((count / stations.length) * 100).toFixed(1);

              return (
                <div
                  key={tier.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: tier.color }}
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{tier.label}</div>
                      <div className="text-[11px] font-mono text-slate-400">{tier.range}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-white tabular-nums">{count}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{pct}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2 Column Comparison: Top 5 Lowest vs Top 5 Highest Savings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top 5 Lowest Fuel Prices */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              Top 5 Lowest Diesel Prices
            </h3>
            <div className="divide-y divide-slate-800">
              {stats.cheapest5.map((s, idx) => (
                <div
                  key={s.store}
                  onClick={() => onSelectStation(s)}
                  className="flex items-center justify-between py-2.5 hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-white">#{s.store}</span>{' '}
                      <span className="text-slate-300">{s.city}, {s.state}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                      ${s.best_disc.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Save ${s.savings.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Highest Discounts */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
              Top 5 Highest Savings vs Retail
            </h3>
            <div className="divide-y divide-slate-800">
              {stats.savings5.map((s, idx) => (
                <div
                  key={s.store}
                  onClick={() => onSelectStation(s)}
                  className="flex items-center justify-between py-2.5 hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-white">#{s.store}</span>{' '}
                      <span className="text-slate-300">{s.city}, {s.state}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-blue-400 text-sm tabular-nums">
                      -${s.savings.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Pay ${s.best_disc.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* State Average Price Comparison */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Average Discount Price by State</h3>
            <span className="text-xs text-slate-400">Sorted Lowest to Highest</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
            {stats.stateAverages.map((st) => (
              <div
                key={st.state}
                className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-200">{st.state}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({st.count})</span>
                </div>
                <div className="font-mono font-semibold text-emerald-400 tabular-nums">
                  ${st.avgPrice.toFixed(3)}
                </div>
                <div className="text-[10px] text-blue-400 font-mono mt-0.5">
                  Save ${st.avgSavings.toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
