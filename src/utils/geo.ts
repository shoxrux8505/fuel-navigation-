import { FuelStation } from '../data/fuelStations';

/**
 * Calculates Haversine distance between two lat/lng coordinates in miles
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds perpendicular distance in miles from a point (station) to a line segment (origin to destination)
 */
export function distanceToSegmentMiles(
  lat: number,
  lng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Convert to Cartesian approximation around reference latitude
  const refLat = ((lat1 + lat2) / 2 * Math.PI) / 180;
  const kx = Math.cos(refLat) * 69.172; // miles per degree longitude
  const ky = 69.172; // miles per degree latitude

  const px = (lng - lng1) * kx;
  const py = (lat - lat1) * ky;
  const dx = (lng2 - lng1) * kx;
  const dy = (lat2 - lat1) * ky;

  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt(px * px + py * py);

  let t = (px * dx + py * dy) / lenSq;
  t = Math.max(0, Math.min(1, t)); // clamp to segment

  const nearestX = t * dx;
  const nearestY = t * dy;

  const distX = px - nearestX;
  const distY = py - nearestY;

  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Filter stations within corridor of route
 */
export function findStationsInCorridor(
  stations: FuelStation[],
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  corridorMiles: number = 40
): FuelStation[] {
  const totalRouteDist = calculateDistanceMiles(originLat, originLng, destLat, destLng);

  return stations.filter((station) => {
    // Check if station is between bounds with margin
    const distFromOrigin = calculateDistanceMiles(originLat, originLng, station.lat, station.lng);
    const distFromDest = calculateDistanceMiles(destLat, destLng, station.lat, station.lng);

    // If point is too far beyond the ends
    if (distFromOrigin > totalRouteDist + corridorMiles * 1.5 || distFromDest > totalRouteDist + corridorMiles * 1.5) {
      return false;
    }

    const perpDist = distanceToSegmentMiles(
      station.lat,
      station.lng,
      originLat,
      originLng,
      destLat,
      destLng
    );

    return perpDist <= corridorMiles;
  });
}

/**
 * Export stations array as CSV file download
 */
export function exportStationsToCSV(stations: FuelStation[], filename = 'loves_fuel_stations.csv') {
  const headers = ['Store #', 'City', 'State', 'Latitude', 'Longitude', 'Retail Diesel ($)', 'Best Discount ($)', 'Savings ($)', 'DEF Retail ($)'];
  
  const rows = stations.map((s) => [
    s.store,
    `"${s.city}"`,
    s.state,
    s.lat,
    s.lng,
    s.retail.toFixed(3),
    s.best_disc.toFixed(3),
    s.savings.toFixed(3),
    s.def_retail.toFixed(3)
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
