import React, { useState, useMemo } from 'react';
import { FuelStation } from '../data/fuelStations';

interface StationTableProps {
  stations: FuelStation[];
  allStations: FuelStation[];
  onSelectStation: (station: FuelStation) => void;
  onLocateOnMap: (station: FuelStation) => void;
  tankGallons: number;
}

type SortField = 'store' | 'city' | 'state' | 'retail' | 'best_disc' | 'savings' | 'def_retail';

export const StationTable: React.FC<StationTableProps> = ({
  allStations,
  onSelectStation,
  onLocateOnMap,
  tankGallons
}) => {
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [sortField, setSortField] = useState<SortField>('best_disc');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const states = useMemo(() => {
    const list = Array.from(new Set(allStations.map((s) => s.state))).sort();
    return list;
  }, [allStations]);

  const filtered = useMemo(() => {
    return allStations.filter((s) => {
      const matchSearch =
        !search ||
        s.store.toString().includes(search) ||
        s.city.toLowerCase().includes(search.toLowerCase()) ||
        s.state.toLowerCase().includes(search.toLowerCase());
      const matchState = !selectedState || s.state === selectedState;
      return matchSearch && matchState;
    });
  }, [allStations, search, selectedState]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let vA = a[sortField];
      let vB = b[sortField];
      if (typeof vA === 'string' && typeof vB === 'string') {
        return sortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortAsc ? Number(vA) - Number(vB) : Number(vB) - Number(vA);
    });
  }, [filtered, sortField, sortAsc]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setPage(1);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search store, city, or state..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 pl-8 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-red-500"
              />
              <svg
                className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400"
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
            </div>

            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="">All States ({states.length})</option>
              {states.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>
              Showing <b className="text-white font-mono">{sorted.length}</b> stations
            </span>
            <span>&middot;</span>
            <span>Fill Size: <b className="text-amber-400 font-mono">{tankGallons} gal</b></span>
          </div>
        </div>

        {/* High Density Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-700">
              <tr>
                <th
                  onClick={() => handleSort('store')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  Store #{' '}
                  {sortField === 'store' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('city')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  Location{' '}
                  {sortField === 'city' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('state')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  State{' '}
                  {sortField === 'state' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('best_disc')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                >
                  Discount Price{' '}
                  {sortField === 'best_disc' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('retail')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                >
                  Retail Price{' '}
                  {sortField === 'retail' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('savings')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                >
                  Savings/Gal{' '}
                  {sortField === 'savings' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-3 px-4 text-right">
                  {tankGallons}g Savings
                </th>
                <th
                  onClick={() => handleSort('def_retail')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                >
                  DEF Price{' '}
                  {sortField === 'def_retail' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No stations match the search query.
                  </td>
                </tr>
              ) : (
                paginated.map((st) => {
                  const fillSavings = (st.savings * tankGallons).toFixed(2);
                  return (
                    <tr
                      key={st.store}
                      className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                      onClick={() => onSelectStation(st)}
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-white">
                        #{st.store}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-200">
                        {st.city}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-slate-400 font-semibold">{st.state}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums">
                        ${st.best_disc.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400 tabular-nums">
                        ${st.retail.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-blue-400 tabular-nums">
                        -${st.savings.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-300 tabular-nums">
                        +${fillSavings}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400 tabular-nums">
                        {st.def_retail > 0 ? `$${st.def_retail.toFixed(3)}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onLocateOnMap(st)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Show on map"
                          >
                            Map
                          </button>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${st.lat},${st.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-medium transition-colors"
                            title="Directions via Google Maps"
                          >
                            GPS ↗
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 py-2">
          <span>
            Page <strong className="text-white font-mono">{page}</strong> of{' '}
            <strong className="text-white font-mono">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
