import React, { useState, useEffect } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { LocationRecord } from '../types';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  X, MapPin, Navigation, Target, Clock, Shield, Route
} from 'lucide-react';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function HistoryMapUpdater({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [points, map]);
  return null;
}

export default function DriverDetails() {
  const { selectedDriver, setSelectedDriver, getLocationHistory, toggleSharing, removeDriver } = useFleet();
  const [history, setHistory] = useState<LocationRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0); // 0 = today
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let active = true;
    if (selectedDriver) {
      setHistory([]);
      setHistoryError(null);
      getLocationHistory(selectedDriver.uid).then(records => {
        if (active) setHistory(records);
      }).catch(reason => {
        if (active) setHistoryError(reason instanceof Error ? reason.message : 'Unable to load location history.');
      });
      setSelectedDay(0); // Reset day selection when driver changes
      setShowHistory(false); // Reset history panel visibility
    }
    return () => { active = false; };
  }, [selectedDriver?.uid, getLocationHistory]);

  if (!selectedDriver) return null;

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return {
      index: i,
      label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : formatDate(date.getTime()),
      date: date.toDateString(),
    };
  });

  const dayHistory = history.filter(h => {
    const recordDate = new Date(h.timestamp).toDateString();
    return recordDate === days[selectedDay].date;
  });

  const routePoints: [number, number][] = dayHistory.map(h => [h.latitude, h.longitude]);

  const routeIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:10px;height:10px;border-radius:50%;background:#00d4aa;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });

  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-trackx-600/50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Driver Details</h3>
        <button
          onClick={() => setSelectedDriver(null)}
          className="w-8 h-8 rounded-lg bg-trackx-700 flex items-center justify-center hover:bg-trackx-600 transition-colors"
        >
          <X className="w-4 h-4 text-trackx-300" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Driver Info */}
        <div className="bg-trackx-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-400/20 flex items-center justify-center border border-accent-500/20">
              <span className="text-xl font-bold text-accent-400">
                {selectedDriver.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold">{selectedDriver.name}</p>
              <p className="text-sm text-trackx-300 font-mono">{selectedDriver.trackingId}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-trackx-700/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-2 h-2 rounded-full ${
                  selectedDriver.status === 'online' ? 'bg-accent-400 status-online' :
                  selectedDriver.status === 'offline' ? 'bg-trackx-400' :
                  selectedDriver.status === 'sharing_disabled' ? 'bg-warning-500' : 'bg-danger-500'
                }`}></div>
                <span className="text-xs text-trackx-400">Status</span>
              </div>
              <p className="text-sm font-medium text-white capitalize">{selectedDriver.status.replace('_', ' ')}</p>
            </div>

            <div className="bg-trackx-700/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Shield className="w-3 h-3 text-trackx-400" />
                <span className="text-xs text-trackx-400">Sharing</span>
              </div>
              <p className="text-sm font-medium text-white">{selectedDriver.sharingEnabled ? 'Active' : 'Disabled'}</p>
            </div>
          </div>
        </div>

        {/* Location Info */}
        <div className="bg-trackx-800/50 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-trackx-300 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent-400" />
            Current Location
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-trackx-400">Latitude</p>
              <p className="text-sm font-mono text-white">{selectedDriver.latitude.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-xs text-trackx-400">Longitude</p>
              <p className="text-sm font-mono text-white">{selectedDriver.longitude.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-xs text-trackx-400 flex items-center gap-1">
                <Navigation className="w-3 h-3" /> Speed
              </p>
              <p className="text-sm font-medium text-white">
                {selectedDriver.speed ? `${Math.round(selectedDriver.speed)} km/h` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-trackx-400 flex items-center gap-1">
                <Target className="w-3 h-3" /> Accuracy
              </p>
              <p className="text-sm font-medium text-white">
                {selectedDriver.accuracy ? `±${Math.round(selectedDriver.accuracy)}m` : '—'}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-trackx-600/50">
            <p className="text-xs text-trackx-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Last Updated
            </p>
            <p className="text-sm text-white">{timeAgo(selectedDriver.lastUpdated)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => toggleSharing(selectedDriver.uid)}
            disabled={!selectedDriver.sharingEnabled}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
              selectedDriver.sharingEnabled
                ? 'bg-warning-500/10 text-warning-500 border border-warning-500/20 hover:bg-warning-500/20'
                : 'bg-trackx-700 text-trackx-400 border border-trackx-600 cursor-not-allowed'
            }`}
          >
            {selectedDriver.sharingEnabled ? 'Disable Sharing' : 'Enable on driver device'}
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove ${selectedDriver.name}?`)) {
                removeDriver(selectedDriver.uid);
              }
            }}
            className="py-2.5 px-3 rounded-xl text-sm font-medium bg-danger-500/10 text-danger-500 border border-danger-500/20 hover:bg-danger-500/20 transition-all"
          >
            Remove
          </button>
        </div>

        {/* Location History */}
        <div className="bg-trackx-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-trackx-300 flex items-center gap-2">
              <Route className="w-4 h-4 text-accent-400" />
              7-Day Location History
            </h4>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-accent-400 hover:text-accent-300"
            >
              {showHistory ? 'Hide' : 'View'}
            </button>
          </div>

          {showHistory && (
            <div className="space-y-3">
              {/* Day selector */}
              <div className="flex gap-1 overflow-x-auto pb-2">
                {days.map(day => (
                  <button
                    key={day.index}
                    onClick={() => setSelectedDay(day.index)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      selectedDay === day.index
                        ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                        : 'bg-trackx-700 text-trackx-300 hover:bg-trackx-600'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              {/* Route Map */}
              {routePoints.length > 0 && (
                <div className="h-48 rounded-xl overflow-hidden">
                  <MapContainer
                    center={routePoints[0] || [28.6139, 77.2090]}
                    zoom={13}
                    className="w-full h-full"
                    zoomControl={false}
                  >
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    <HistoryMapUpdater points={routePoints} />
                    <Polyline
                      positions={routePoints}
                      pathOptions={{ color: '#00d4aa', weight: 3, opacity: 0.8 }}
                    />
                    <Marker position={routePoints[0]} icon={routeIcon} />
                  </MapContainer>
                </div>
              )}

              <p className="text-xs text-trackx-400">
                {historyError || `${dayHistory.length} location records for this day`}
              </p>

              {/* Recent records */}
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {dayHistory.slice(0, 10).map(record => (
                  <div key={record.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-trackx-700/50">
                    <span className="text-xs font-mono text-trackx-300">
                      {record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}
                    </span>
                    <span className="text-xs text-trackx-400">{formatTime(record.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
