import { FuelStation } from './data/fuelStations';

export type ViewMode = 'map' | 'table' | 'trip' | 'analytics';

export type MapTileStyle = 'dark' | 'voyager' | 'osm' | 'satellite';

export type ColorMetric = 'best_disc' | 'savings' | 'def_retail';

export interface FilterOptions {
  searchQuery: string;
  selectedState: string;
  maxPrice: number;
  minSavings: number;
  selectedTiers: string[];
  sortBy: 'price_asc' | 'price_desc' | 'savings_desc' | 'def_asc' | 'store_asc';
  tankGallons: number;
}

export interface TripPoint {
  label: string;
  lat: number;
  lng: number;
  state: string;
}

export interface TripPlanResult {
  origin: TripPoint;
  destination: TripPoint;
  stationsAlongRoute: FuelStation[];
  cheapestStation: FuelStation | null;
  bestSavingsStation: FuelStation | null;
  corridorMiles: number;
  totalDistanceMiles: number;
}
