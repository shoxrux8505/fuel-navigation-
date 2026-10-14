import { FuelStation } from '../data/fuelStations';
import { calculateDistanceMiles } from './geo';

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

export interface RouteStop {
  station: FuelStation;
  mileMarker: number; // Miles from PU along the route
  distanceOffRouteMiles: number; // Miles off the highway
  isCheapestOnRoute: boolean;
  isMaxSavingsOnRoute: boolean;
}

export interface NavigationRoute {
  puLocation: { label: string; lat: number; lng: number };
  delLocation: { label: string; lat: number; lng: number };
  distanceMiles: number;
  durationMinutes: number;
  geometry: [number, number][]; // [lat, lng]
  stops: RouteStop[];
  cheapestStop: RouteStop | null;
  bestSavingsStop: RouteStop | null;
  totalPotentialSavings: number;
}

/**
 * Common US Freight Hub Cities for quick PU/DEL selection
 */
export const POPULAR_FREIGHT_HUBS = [
  { label: 'Dallas, TX', lat: 32.7767, lng: -96.7970, state: 'TX' },
  { label: 'Atlanta, GA', lat: 33.7490, lng: -84.3880, state: 'GA' },
  { label: 'Chicago, IL', lat: 41.8781, lng: -87.6298, state: 'IL' },
  { label: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437, state: 'CA' },
  { label: 'Houston, TX', lat: 29.7604, lng: -95.3698, state: 'TX' },
  { label: 'Memphis, TN', lat: 35.1495, lng: -90.0490, state: 'TN' },
  { label: 'Indianapolis, IN', lat: 39.7684, lng: -86.1581, state: 'IN' },
  { label: 'Kansas City, MO', lat: 39.0997, lng: -94.5786, state: 'MO' },
  { label: 'Oklahoma City, OK', lat: 35.4676, lng: -97.5164, state: 'OK' },
  { label: 'Denver, CO', lat: 39.7392, lng: -104.9903, state: 'CO' },
  { label: 'Phoenix, AZ', lat: 33.4484, lng: -112.0740, state: 'AZ' },
  { label: 'Nashville, TN', lat: 36.1627, lng: -86.7816, state: 'TN' },
  { label: 'Charlotte, NC', lat: 35.2271, lng: -80.8431, state: 'NC' },
  { label: 'Salt Lake City, UT', lat: 40.7608, lng: -111.8910, state: 'UT' },
  { label: 'Jacksonville, FL', lat: 30.3322, lng: -81.6557, state: 'FL' },
  { label: 'Detroit, MI', lat: 42.3314, lng: -83.0458, state: 'MI' },
  { label: 'St. Louis, MO', lat: 38.6270, lng: -90.1994, state: 'MO' },
  { label: 'Columbus, OH', lat: 39.9612, lng: -82.9988, state: 'OH' },
  { label: 'Seattle, WA', lat: 47.6062, lng: -122.3321, state: 'WA' },
  { label: 'San Antonio, TX', lat: 29.4241, lng: -98.4936, state: 'TX' }
];

/**
 * Fetch real driving road geometry from OSRM with graceful fallback
 */
export async function fetchDrivingRoute(
  puLat: number,
  puLng: number,
  delLat: number,
  delLng: number
): Promise<{ coordinates: [number, number][]; distanceMiles: number; durationMinutes: number }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${puLng},${puLat};${delLng},${delLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        // OSRM returns coordinates as [lng, lat]
        const coords: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );
        const distanceMiles = Math.round((route.distance / 1609.344) * 10) / 10;
        const durationMinutes = Math.round(route.duration / 60);

        return {
          coordinates: coords,
          distanceMiles,
          durationMinutes
        };
      }
    }
  } catch (err) {
    console.warn('OSRM router unavailable, using highway line interpolation', err);
  }

  // Graceful Fallback: Generate interpolated highway route
  const steps = 30;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const lat = puLat + (delLat - puLat) * frac;
    const lng = puLng + (delLng - puLng) * frac;
    coords.push([lat, lng]);
  }
  const directDist = Math.round(calculateDistanceMiles(puLat, puLng, delLat, delLng) * 1.15); // highway tortuosity approx
  const estMins = Math.round((directDist / 60) * 60); // approx 60 mph average truck speed

  return {
    coordinates: coords,
    distanceMiles: directDist,
    durationMinutes: estMins
  };
}

/**
 * Find stations along the actual driving route polyline
 */
export function findStationsAlongRoute(
  stations: FuelStation[],
  routeCoordinates: [number, number][],
  corridorBufferMiles: number = 25
): RouteStop[] {
  if (routeCoordinates.length < 2) return [];

  // Calculate cumulative mileages along the route
  const cumulativeMiles: number[] = [0];
  for (let i = 1; i < routeCoordinates.length; i++) {
    const [pLat, pLng] = routeCoordinates[i - 1];
    const [cLat, cLng] = routeCoordinates[i];
    const segDist = calculateDistanceMiles(pLat, pLng, cLat, cLng);
    cumulativeMiles.push(cumulativeMiles[i - 1] + segDist);
  }
  const totalRouteDist = cumulativeMiles[cumulativeMiles.length - 1];

  const matchedStops: RouteStop[] = [];

  stations.forEach((station) => {
    let minPerpDist = Infinity;
    let closestMileMarker = 0;

    // Sample route segments to find closest point on route
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const [lat1, lng1] = routeCoordinates[i];
      const [lat2, lng2] = routeCoordinates[i + 1];

      // Quick bounding check to skip distant segments
      const latMin = Math.min(lat1, lat2) - 0.5;
      const latMax = Math.max(lat1, lat2) + 0.5;
      const lngMin = Math.min(lng1, lng2) - 0.5;
      const lngMax = Math.max(lng1, lng2) + 0.5;
      if (
        station.lat < latMin ||
        station.lat > latMax ||
        station.lng < lngMin ||
        station.lng > lngMax
      ) {
        continue;
      }

      // Perpendicular projection calculation
      const refLat = ((lat1 + lat2) / 2 * Math.PI) / 180;
      const kx = Math.cos(refLat) * 69.172;
      const ky = 69.172;

      const px = (station.lng - lng1) * kx;
      const py = (station.lat - lat1) * ky;
      const dx = (lng2 - lng1) * kx;
      const dy = (lat2 - lat1) * ky;

      const lenSq = dx * dx + dy * dy;
      let t = lenSq === 0 ? 0 : (px * dx + py * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const nearestX = t * dx;
      const nearestY = t * dy;
      const distX = px - nearestX;
      const distY = py - nearestY;
      const perpDist = Math.sqrt(distX * distX + distY * distY);

      if (perpDist < minPerpDist) {
        minPerpDist = perpDist;
        const segLen = Math.sqrt(dx * dx + dy * dy);
        closestMileMarker = cumulativeMiles[i] + t * segLen;
      }
    }

    if (minPerpDist <= corridorBufferMiles && closestMileMarker <= totalRouteDist + 15) {
      matchedStops.push({
        station,
        mileMarker: Math.round(closestMileMarker),
        distanceOffRouteMiles: Math.round(minPerpDist * 10) / 10,
        isCheapestOnRoute: false,
        isMaxSavingsOnRoute: false
      });
    }
  });

  // Sort sequentially from PU to DEL
  matchedStops.sort((a, b) => a.mileMarker - b.mileMarker);

  // Identify cheapest and max savings
  if (matchedStops.length > 0) {
    let minPrice = Infinity;
    let minIdx = -1;
    let maxSavings = -Infinity;
    let maxSavIdx = -1;

    matchedStops.forEach((stop, idx) => {
      if (stop.station.best_disc < minPrice) {
        minPrice = stop.station.best_disc;
        minIdx = idx;
      }
      if (stop.station.savings > maxSavings) {
        maxSavings = stop.station.savings;
        maxSavIdx = idx;
      }
    });

    if (minIdx !== -1) matchedStops[minIdx].isCheapestOnRoute = true;
    if (maxSavIdx !== -1) matchedStops[maxSavIdx].isMaxSavingsOnRoute = true;
  }

  return matchedStops;
}
