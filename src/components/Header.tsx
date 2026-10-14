import { ViewMode } from '../types';
import { FuelStation } from '../data/fuelStations';
import { exportStationsToCSV } from '../utils/geo';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  filteredStations: FuelStation[];
  totalStations: number;
  onOpenSerpApiModal: () => void;
}

export function Header({ currentView, onViewChange, filteredStations, onOpenSerpApiModal }: HeaderProps) {
  const handleExport = () => {
    exportStationsToCSV(filteredStations, `loves_fuel_stations_${filteredStations.length}.csv`);
  };

  return (
    <header className="flex items-center justify-between gap-8 px-5 py-3.5 bg-slate-900 border-b border-slate-800 shrink-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onViewChange('map');
        }}
        className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-600 text-amber-300 font-extrabold text-sm shadow-inner">
          L♥
        </span>
        <span className="text-white font-semibold">Love's Fuel Navigator</span>
      </a>

      {/* Zone 2: 4 clean single-line navigation links */}
      <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          type="button"
          onClick={() => onViewChange('map')}
          className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
            currentView === 'map'
              ? 'text-white border-red-500 font-semibold'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Map Explorer
        </button>

        <button
          type="button"
          onClick={() => onViewChange('table')}
          className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
            currentView === 'table'
              ? 'text-white border-red-500 font-semibold'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Station Directory
        </button>

        <button
          type="button"
          onClick={() => onViewChange('trip')}
          className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
            currentView === 'trip'
              ? 'text-white border-red-500 font-semibold'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Route Corridor
        </button>

        <button
          type="button"
          onClick={() => onViewChange('analytics')}
          className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
            currentView === 'analytics'
              ? 'text-white border-red-500 font-semibold'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          Price Insights
        </button>
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenSerpApiModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="SerpApi Google Maps Endpoints Explorer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          SerpApi Endpoints
        </button>

        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Download filtered stations as CSV spreadsheet"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV ({filteredStations.length})
        </button>
      </div>
    </header>
  );
}
