import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { FuelStation, TIER_CONFIG } from '../data/fuelStations';
import { ColorMetric, MapTileStyle, TripPlanResult } from '../types';
import { NavigationRoute } from '../utils/routing';

interface StationMapProps {
  stations: FuelStation[];
  allStations: FuelStation[];
  selectedStation: FuelStation | null;
  onSelectStation: (station: FuelStation) => void;
  colorMetric: ColorMetric;
  onChangeColorMetric: (metric: ColorMetric) => void;
  activeTiers: string[];
  onToggleTier: (tierId: string) => void;
  tankGallons: number;
  activeTrip: TripPlanResult | null;
  activeRoute?: NavigationRoute | null;
  isMapPickingPU?: boolean;
  isMapPickingDEL?: boolean;
  onMapClickPoint?: (lat: number, lng: number) => void;
  onCancelMapPick?: () => void;
}

const TILE_PROVIDERS: Record<MapTileStyle, { url: string; attribution: string; maxZoom: number }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  },
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  }
};

export const StationMap: React.FC<StationMapProps> = ({
  stations,
  allStations,
  selectedStation,
  onSelectStation,
  colorMetric,
  onChangeColorMetric,
  activeTiers,
  onToggleTier,
  tankGallons,
  activeTrip,
  activeRoute,
  isMapPickingPU = false,
  isMapPickingDEL = false,
  onMapClickPoint,
  onCancelMapPick
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const mapPickingRef = useRef({ isMapPickingPU, isMapPickingDEL, onMapClickPoint });
  useEffect(() => {
    mapPickingRef.current = { isMapPickingPU, isMapPickingDEL, onMapClickPoint };
  }, [isMapPickingPU, isMapPickingDEL, onMapClickPoint]);

  const [tileStyle, setTileStyle] = useState<MapTileStyle>('dark');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const [currentZoom, setCurrentZoom] = useState(5);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [39.0, -96.5],
      zoom: 5,
      zoomControl: false,
      minZoom: 3,
      maxZoom: 18
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { isMapPickingPU, isMapPickingDEL, onMapClickPoint } = mapPickingRef.current;
      if ((isMapPickingPU || isMapPickingDEL) && onMapClickPoint) {
        onMapClickPoint(e.latlng.lat, e.latlng.lng);
      }
    });

    const initialTile = TILE_PROVIDERS[tileStyle];
    const tileLayer = L.tileLayer(initialTile.url, {
      attribution: initialTile.attribution,
      maxZoom: initialTile.maxZoom
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Fix leaflet size on container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Style
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const cfg = TILE_PROVIDERS[tileStyle];
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const newTile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTile;
    tileLayerRef.current.bringToBack();
  }, [tileStyle]);

  // Helper to get marker color based on metric
  const getMarkerColor = (station: FuelStation): string => {
    if (colorMetric === 'best_disc') {
      if (station.best_disc <= 5.74) return '#10b981'; // emerald
      if (station.best_disc <= 5.90) return '#3b82f6'; // blue
      if (station.best_disc <= 6.07) return '#f97316'; // orange
      return '#ef4444'; // rose/red
    }
    if (colorMetric === 'savings') {
      if (station.savings >= 0.50) return '#10b981';
      if (station.savings >= 0.30) return '#3b82f6';
      if (station.savings > 0.05) return '#f97316';
      return '#64748b'; // slate
    }
    if (colorMetric === 'def_retail') {
      if (station.def_retail > 0 && station.def_retail <= 4.60) return '#10b981';
      if (station.def_retail <= 4.889) return '#3b82f6';
      return '#f97316';
    }
    return station.color || '#3b82f6';
  };

  // Render Station Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    stations.forEach((station) => {
      const isSelected = selectedStation?.store === station.store;
      const markerColor = getMarkerColor(station);

      const marker = L.circleMarker([station.lat, station.lng], {
        radius: isSelected ? 11 : 6.5,
        fillColor: markerColor,
        color: isSelected ? '#ffffff' : '#0f172a',
        weight: isSelected ? 3 : 1.5,
        opacity: 1,
        fillOpacity: isSelected ? 0.95 : 0.82
      });

      // Hover tooltip
      const tooltipContent = `Love's #${station.store} (${station.city}, ${station.state}) · $${station.best_disc.toFixed(3)}/gal`;
      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -6],
        opacity: 0.95
      });

      // Rich popup content
      const fillSavings = (station.savings * tankGallons).toFixed(2);
      const gmapsLink = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

      const popupHtml = `
        <div style="min-width: 210px; font-family: sans-serif;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
            <strong style="color: #f8fafc; font-size: 14px;">Love's #${station.store}</strong>
            <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">${station.city}, ${station.state}</span>
          </div>
          
          <div style="background: #1e293b; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; border: 1px solid #334155;">
            <div style="font-size: 11px; color: #94a3b8;">Discount Fuel Price</div>
            <div style="font-size: 20px; font-weight: 700; color: #10b981; font-family: monospace;">
              $${station.best_disc.toFixed(3)}<span style="font-size: 11px; font-weight: 400; color: #94a3b8;">/gal</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #cbd5e1; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #334155;">
              <span>Retail: $${station.retail.toFixed(3)}</span>
              <span style="color: #38bdf8; font-weight: 600;">Save $${station.savings.toFixed(3)}/gal</span>
            </div>
          </div>

          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>DEF Price: <b style="color: #f1f5f9;">$${station.def_retail > 0 ? station.def_retail.toFixed(3) : 'N/A'}</b></span>
            <span>Est. Tank Save: <b style="color: #facc15;">$${fillSavings}</b></span>
          </div>

          <a href="${gmapsLink}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background: #dc2626; color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; box-shadow: 0 1px 2px rgba(0,0,0,0.2);">
            Get Directions ↗
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });

      marker.on('click', () => {
        onSelectStation(station);
      });

      markersGroup.addLayer(marker);
    });
  }, [stations, selectedStation, colorMetric, tankGallons]);

  // Center on Selected Station
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedStation) return;
    mapInstanceRef.current.flyTo([selectedStation.lat, selectedStation.lng], 10, {
      duration: 1.2
    });
  }, [selectedStation]);

  // Render Driving Navigation Highway Route (activeRoute) OR Corridor Trip (activeTrip)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeGroup = routeLayerRef.current;
    if (!map || !routeGroup) return;

    routeGroup.clearLayers();

    // Priority 1: High-precision Driving Route (PU & DEL navigation)
    if (activeRoute && activeRoute.geometry.length > 0) {
      // Background highway glow line
      const glowPolyline = L.polyline(activeRoute.geometry, {
        color: '#1d4ed8',
        weight: 8,
        opacity: 0.55,
        lineCap: 'round',
        lineJoin: 'round'
      });

      // Foreground crisp highway line
      const corePolyline = L.polyline(activeRoute.geometry, {
        color: '#60a5fa',
        weight: 3.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      });

      routeGroup.addLayer(glowPolyline);
      routeGroup.addLayer(corePolyline);

      // Custom PU Pin Marker
      const puIcon = L.divIcon({
        className: 'pu-marker',
        html: `<div style="display:flex;align-items:center;gap:4px;background:#059669;color:#ffffff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:12px;border:2px solid #ffffff;box-shadow:0 4px 12px rgba(5,150,105,0.6);white-space:nowrap;font-family:sans-serif;">
          <span>🟢 PU</span>
        </div>`,
        iconSize: [56, 26],
        iconAnchor: [28, 13]
      });

      const puMarker = L.marker([activeRoute.puLocation.lat, activeRoute.puLocation.lng], {
        icon: puIcon,
        zIndexOffset: 1000
      }).bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;"><b>Pick-Up (Origin):</b><br/>${activeRoute.puLocation.label}</div>`
      );

      // Custom DEL Pin Marker
      const delIcon = L.divIcon({
        className: 'del-marker',
        html: `<div style="display:flex;align-items:center;gap:4px;background:#dc2626;color:#ffffff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:12px;border:2px solid #ffffff;box-shadow:0 4px 12px rgba(220,38,38,0.6);white-space:nowrap;font-family:sans-serif;">
          <span>🔴 DEL</span>
        </div>`,
        iconSize: [62, 26],
        iconAnchor: [31, 13]
      });

      const delMarker = L.marker([activeRoute.delLocation.lat, activeRoute.delLocation.lng], {
        icon: delIcon,
        zIndexOffset: 1000
      }).bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;"><b>Delivery (Destination):</b><br/>${activeRoute.delLocation.label}</div>`
      );

      routeGroup.addLayer(puMarker);
      routeGroup.addLayer(delMarker);

      // Highlight the Cheapest Fuel Stop on Route with special badge
      if (activeRoute.cheapestStop) {
        const bestStop = activeRoute.cheapestStop;
        const starIcon = L.divIcon({
          className: 'best-fuel-marker',
          html: `<div style="display:flex;align-items:center;gap:4px;background:#0f172a;color:#facc15;font-size:11px;font-weight:800;padding:3px 7px;border-radius:10px;border:2px solid #10b981;box-shadow:0 0 16px rgba(16,185,129,0.8);white-space:nowrap;font-family:monospace;">
            <span>⭐ $${bestStop.station.best_disc.toFixed(3)}</span>
          </div>`,
          iconSize: [78, 24],
          iconAnchor: [39, 32]
        });

        const starMarker = L.marker([bestStop.station.lat, bestStop.station.lng], {
          icon: starIcon,
          zIndexOffset: 990
        });

        starMarker.on('click', () => {
          onSelectStation(bestStop.station);
        });

        routeGroup.addLayer(starMarker);
      }

      // Fit bounds to the route
      map.fitBounds(L.latLngBounds(activeRoute.geometry), { padding: [70, 70] });
      return;
    }

    // Priority 2: Simple Corridor Trip
    if (activeTrip) {
      const latlngs: [number, number][] = [
        [activeTrip.origin.lat, activeTrip.origin.lng],
        [activeTrip.destination.lat, activeTrip.destination.lng]
      ];

      const originMarker = L.circleMarker([activeTrip.origin.lat, activeTrip.origin.lng], {
        radius: 9,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1
      }).bindTooltip(`Start: ${activeTrip.origin.label}`, { permanent: true, direction: 'top' });

      const destMarker = L.circleMarker([activeTrip.destination.lat, activeTrip.destination.lng], {
        radius: 9,
        fillColor: '#ef4444',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1
      }).bindTooltip(`End: ${activeTrip.destination.label}`, { permanent: true, direction: 'top' });

      const polyline = L.polyline(latlngs, {
        color: '#38bdf8',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.85
      });

      routeGroup.addLayer(originMarker);
      routeGroup.addLayer(destMarker);
      routeGroup.addLayer(polyline);

      map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60] });
    }
  }, [activeRoute, activeTrip]);

  // Map Controls Handlers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetView = () => {
    mapInstanceRef.current?.flyTo([39.0, -96.5], 5, { duration: 1 });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocateError('Geolocation not supported by your browser');
      return;
    }
    setIsLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const map = mapInstanceRef.current;
        if (!map) return;

        if (userMarkerRef.current) {
          map.removeLayer(userMarkerRef.current);
        }

        const icon = L.divIcon({
          className: 'user-loc-pin',
          html: `<div style="width:16px;height:16px;background:#38bdf8;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 12px #38bdf8;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const marker = L.marker([latitude, longitude], { icon })
          .addTo(map)
          .bindPopup('<b>Your Current Location</b>')
          .openPopup();

        userMarkerRef.current = marker;
        map.flyTo([latitude, longitude], 8, { duration: 1.2 });
      },
      (err) => {
        setIsLocating(false);
        setLocateError('Could not retrieve location (' + err.message + ')');
        setTimeout(() => setLocateError(null), 4000);
      },
      { timeout: 10000 }
    );
  };

  const [isLegendExpanded, setIsLegendExpanded] = useState(true);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Map DOM Element */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full z-0 ${
          isMapPickingPU || isMapPickingDEL ? 'cursor-crosshair' : ''
        }`}
      />

      {/* Interactive Map Picking Target Banner */}
      {(isMapPickingPU || isMapPickingDEL) && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-xl bg-slate-900/95 text-white text-xs border border-blue-500 shadow-2xl backdrop-blur-md flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full animate-ping bg-blue-400" />
          <span className="font-semibold text-sky-300">
            {isMapPickingPU
              ? 'Click anywhere on the map to set Pick-Up (PU) location'
              : 'Click anywhere on the map to set Delivery (DEL) location'}
          </span>
          {onCancelMapPick && (
            <button
              type="button"
              onClick={onCancelMapPick}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold cursor-pointer border border-slate-700 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Custom Dark Theme Navigation & Zoom Controls Dock (Positioned at Far Right, safely away from left sidebar) */}
      <div className="absolute top-5 right-5 z-20 flex flex-col items-center gap-2.5">
        {/* Style Selector Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowStyleMenu(!showStyleMenu)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/95 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 shadow-xl backdrop-blur-md cursor-pointer transition-all active:scale-95 group"
            title="Switch Map Layers (Dark, Voyager, Satellite, OpenStreet)"
          >
            <svg className="w-4 h-4 text-slate-300 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>

          {showStyleMenu && (
            <div className="absolute right-0 top-12 w-40 py-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md z-30 text-xs divide-y divide-slate-800/80">
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Base Layer
              </div>
              <div className="py-1">
                {(['dark', 'voyager', 'osm', 'satellite'] as MapTileStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      setTileStyle(style);
                      setShowStyleMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 capitalize cursor-pointer transition-colors ${
                      tileStyle === style
                        ? 'bg-red-600/90 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <span>{style === 'osm' ? 'OpenStreetMap' : style === 'dark' ? 'Dark Matter' : style}</span>
                    {tileStyle === style && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Custom Dark Theme Zoom Controls Cluster */}
        <div className="flex flex-col items-center bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden p-0.5">
          {/* Zoom In Button */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={currentZoom >= 18}
            className="flex items-center justify-center w-10 h-10 text-slate-200 hover:text-white hover:bg-slate-800/90 rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Real-time Zoom Level Display */}
          <div className="w-8 py-1 my-0.5 flex items-center justify-center border-y border-slate-800/80 text-[10px] font-mono font-bold text-slate-400 select-none">
            {currentZoom}x
          </div>

          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={currentZoom <= 3}
            className="flex items-center justify-center w-10 h-10 text-slate-200 hover:text-white hover:bg-slate-800/90 rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
            </svg>
          </button>
        </div>

        {/* Map Position Utility Cluster */}
        <div className="flex flex-col items-center bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-xl backdrop-blur-md overflow-hidden p-0.5 divide-y divide-slate-800/80">
          {/* Reset USA View */}
          <button
            type="button"
            onClick={handleResetView}
            className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-white hover:bg-slate-800/90 rounded-lg transition-all cursor-pointer active:scale-95 text-[11px] font-bold font-mono tracking-tight"
            title="Fit Entire Continental USA"
            aria-label="Reset to Full US View"
          >
            USA
          </button>

          {/* Locate Me */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex items-center justify-center w-10 h-10 text-slate-300 hover:text-white hover:bg-slate-800/90 rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Locate nearest stations to my current position"
            aria-label="Find My Location"
          >
            {isLocating ? (
              <svg className="w-4 h-4 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 hover:text-sky-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Geolocation feedback toast */}
      {locateError && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-red-900/95 text-red-200 text-xs border border-red-700/80 shadow-2xl backdrop-blur-md flex items-center gap-2">
          <span>⚠️</span>
          <span>{locateError}</span>
        </div>
      )}

      {/* Color Metric Selector (Positioned to the left of the right-side controls dock) */}
      <div className="absolute top-5 right-20 z-10 hidden sm:flex items-center bg-slate-900/95 border border-slate-700/80 rounded-xl p-1 backdrop-blur-md shadow-xl text-xs">
        <span className="text-slate-400 font-medium px-2.5 hidden lg:inline">Color By:</span>
        <button
          type="button"
          onClick={() => onChangeColorMetric('best_disc')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
            colorMetric === 'best_disc' ? 'bg-red-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white'
          }`}
        >
          Discount Price
        </button>
        <button
          type="button"
          onClick={() => onChangeColorMetric('savings')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
            colorMetric === 'savings' ? 'bg-red-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white'
          }`}
        >
          Savings ($/gal)
        </button>
        <button
          type="button"
          onClick={() => onChangeColorMetric('def_retail')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
            colorMetric === 'def_retail' ? 'bg-red-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white'
          }`}
        >
          DEF Price
        </button>
      </div>

      {/* Interactive Legend Box (Bottom Left with comfortable margin) */}
      <div className="absolute bottom-6 left-5 z-10 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md text-xs max-w-xs transition-all">
        <div className="flex items-center justify-between p-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              {colorMetric === 'best_disc'
                ? 'Discount Price Tiers'
                : colorMetric === 'savings'
                ? 'Diesel Savings / gal'
                : 'DEF Retail Price'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono tabular-nums">
              ({stations.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsLegendExpanded(!isLegendExpanded)}
            className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-[10px] bg-slate-800/80 border border-slate-700 cursor-pointer"
            title={isLegendExpanded ? 'Minimize legend' : 'Expand legend'}
          >
            {isLegendExpanded ? '–' : '+'}
          </button>
        </div>

        {isLegendExpanded && (
          <div className="p-3 pt-2">
            {colorMetric === 'best_disc' ? (
              <div className="space-y-1.5">
                {TIER_CONFIG.map((tier) => {
                  const isTierActive = activeTiers.includes(tier.id);
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => onToggleTier(tier.id)}
                      className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-colors cursor-pointer ${
                        isTierActive ? 'hover:bg-slate-800/80' : 'opacity-40 hover:opacity-75 bg-slate-950/40'
                      }`}
                      title={`Click to filter by ${tier.label}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                          style={{ backgroundColor: tier.color }}
                        />
                        <span className="text-slate-300">{tier.label}</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px] tabular-nums">{tier.range}</span>
                    </button>
                  );
                })}
              </div>
            ) : colorMetric === 'savings' ? (
              <div className="space-y-1 text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>≥ $0.50/gal savings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                  <span>$0.30 - $0.50/gal savings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span>
                  <span>$0.05 - $0.30/gal savings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-500 shrink-0"></span>
                  <span>Minimal / No savings</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>&le; $4.60/gal DEF</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                  <span>$4.60 - $4.89/gal DEF</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span>
                  <span>&gt; $4.89/gal DEF</span>
                </div>
              </div>
            )}

            <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Click dot to inspect</span>
              <span className="text-amber-400 font-medium">Love's Travel Stops</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
