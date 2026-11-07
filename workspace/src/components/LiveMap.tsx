import React, { useEffect, useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Driver } from '../types';
import { Layers, Map as MapIcon } from 'lucide-react';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;

function createDriverIcon(status: Driver['status'], isSelected: boolean): L.DivIcon {
  const colors: Record<Driver['status'], string> = {
    online: '#00d4aa',
    offline: '#5a7ab5',
    sharing_disabled: '#ffa502',
    location_stale: '#ff4757',
  };
  const color = colors[status];
  const size = isSelected ? 20 : 15;
  const borderWidth = isSelected ? 3 : 2;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${status === 'online' ? `<div class="marker-pulse" style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${color};opacity:0.6;"></div>` : ''}
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${borderWidth}px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center && (center[0] !== 0 || center[1] !== 0)) {
      map.flyTo(center, 14, { duration: 1 });
    }
  }, [center, map]);
  return null;
}

type MapTheme = 'googleRoadmap' | 'googleHybrid' | 'darkCarto';

const tileProviders: Record<MapTheme, { name: string; url: string; attribution: string; subdomains?: string[] }> = {
  googleRoadmap: {
    name: 'Google Maps',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
  },
  googleHybrid: {
    name: 'Google Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite',
  },
  darkCarto: {
    name: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB &copy; OpenStreetMap',
    subdomains: ['a', 'b', 'c', 'd'],
  },
};

export default function LiveMap() {
  const { drivers, selectedDriver, setSelectedDriver } = useFleet();
  const [theme, setTheme] = useState<MapTheme>('googleRoadmap');

  const activeDriverWithCoords = drivers.find(d => d.status === 'online' && (d.latitude !== 0 || d.longitude !== 0))
    || drivers.find(d => d.latitude !== 0 || d.longitude !== 0);

  const center: [number, number] | null = selectedDriver && (selectedDriver.latitude !== 0 || selectedDriver.longitude !== 0)
    ? [selectedDriver.latitude, selectedDriver.longitude]
    : activeDriverWithCoords
      ? [activeDriverWithCoords.latitude, activeDriverWithCoords.longitude]
      : null;

  const defaultCenter: [number, number] = center || [28.6139, 77.2090];
  const currentTile = tileProviders[theme];

  return (
    <div className="glass rounded-2xl overflow-hidden h-full min-h-[400px] relative flex flex-col">
      {/* Map Style Selector Overlay */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1 bg-trackx-900/90 backdrop-blur-md p-1.5 rounded-xl border border-trackx-600/70 shadow-lg">
        <Layers className="w-3.5 h-3.5 text-trackx-300 ml-1.5 mr-1" />
        {(Object.keys(tileProviders) as MapTheme[]).map(key => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              theme === key
                ? 'bg-accent-500 text-trackx-900 font-semibold shadow-sm'
                : 'text-trackx-300 hover:text-white hover:bg-trackx-700/60'
            }`}
          >
            {tileProviders[key].name}
          </button>
        ))}
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="w-full h-full flex-1"
        zoomControl={true}
      >
        <TileLayer
          key={theme}
          attribution={currentTile.attribution}
          url={currentTile.url}
          subdomains={currentTile.subdomains || ['mt0', 'mt1', 'mt2', 'mt3']}
          maxZoom={20}
        />
        <MapUpdater center={center} />

        {drivers
          .filter(driver => driver.latitude !== 0 || driver.longitude !== 0)
          .map(driver => (
            <Marker
              key={driver.uid}
              position={[driver.latitude, driver.longitude]}
              icon={createDriverIcon(driver.status, selectedDriver?.uid === driver.uid)}
              eventHandlers={{
                click: () => setSelectedDriver(driver),
              }}
            >
            <Popup>
              <div className="p-1 min-w-[180px]">
                <p className="font-semibold text-white text-sm">{driver.name}</p>
                <p className="text-xs text-gray-400 font-mono">{driver.trackingId}</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${
                    driver.status === 'online' ? 'bg-green-400' :
                    driver.status === 'offline' ? 'bg-gray-400' :
                    driver.status === 'sharing_disabled' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></span>
                  <span className="text-xs capitalize">{driver.status.replace('_', ' ')}</span>
                </div>
                {driver.speed != null && (
                  <p className="text-xs text-gray-300 mt-1">Speed: {Math.round(driver.speed)} km/h</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
