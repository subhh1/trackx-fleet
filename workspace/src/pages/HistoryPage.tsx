import React, { useState, useEffect } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { LocationRecord } from '../types';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Clock, ChevronDown } from 'lucide-react';

function HistoryMapUpdater({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryPage() {
  const { drivers, getLocationHistory } = useFleet();
  const [selectedDriverUid, setSelectedDriverUid] = useState<string>(drivers[0]?.uid || '');
  const [selectedDay, setSelectedDay] = useState(0);
  const [history, setHistory] = useState<LocationRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const selectedDriver = drivers.find(d => d.uid === selectedDriverUid);

  useEffect(() => {
    if (drivers.length > 0 && !drivers.some(driver => driver.uid === selectedDriverUid)) {
      setSelectedDriverUid(drivers[0].uid);
    }
  }, [drivers, selectedDriverUid]);

  useEffect(() => {
    let active = true;
    setHistory([]);
    setHistoryError(null);
    if (selectedDriverUid) {
      getLocationHistory(selectedDriverUid).then(records => {
        if (active) setHistory(records);
      }).catch(reason => {
        if (active) setHistoryError(reason instanceof Error ? reason.message : 'Unable to load location history.');
      });
    }
    return () => { active = false; };
  }, [selectedDriverUid, getLocationHistory]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return {
      index: i,
      label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
      date: date.toDateString(),
    };
  });

  const dayHistory = history.filter(h => {
    const recordDate = new Date(h.timestamp).toDateString();
    return recordDate === days[selectedDay].date;
  }).sort((a, b) => a.timestamp - b.timestamp);

  const routePoints: [number, number][] = dayHistory.map(h => [h.latitude, h.longitude]);

  const startIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#00d4aa;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const endIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:#ff4757;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const totalDistance = dayHistory.reduce((acc, curr, idx) => {
    if (idx === 0) return acc;
    const prev = dayHistory[idx - 1];
    const R = 6371;
    const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
    const dLng = (curr.longitude - prev.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-trackx-600/50 bg-trackx-800/50 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-white">Location History</h2>
          <p className="text-xs text-trackx-400">7-day route analysis</p>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col gap-4">
          {/* Controls */}
          <div className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Driver Select */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-trackx-400 mb-1">Driver</label>
                <div className="relative">
                  <select
                    value={selectedDriverUid}
                    onChange={e => setSelectedDriverUid(e.target.value)}
                    className="w-full px-4 py-2.5 bg-trackx-800 border border-trackx-600 rounded-xl text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-accent-500/50"
                  >
                    {drivers.map(d => (
                      <option key={d.uid} value={d.uid}>{d.name} ({d.trackingId})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-trackx-400 pointer-events-none" />
                </div>
              </div>

              {/* Day selector */}
              <div className="flex-1 min-w-[300px]">
                <label className="block text-xs text-trackx-400 mb-1">Date</label>
                <div className="flex gap-1 overflow-x-auto">
                  {days.map(day => (
                    <button
                      key={day.index}
                      onClick={() => setSelectedDay(day.index)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        selectedDay === day.index
                          ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                          : 'bg-trackx-700 text-trackx-300 hover:bg-trackx-600'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-xs text-trackx-400">Records</p>
                  <p className="text-lg font-bold text-white">{dayHistory.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-trackx-400">Distance</p>
                  <p className="text-lg font-bold text-white">{totalDistance.toFixed(1)} km</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map and Timeline */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
            {/* Map */}
            <div className="lg:col-span-8 glass rounded-2xl overflow-hidden min-h-[300px]">
              {routePoints.length > 0 ? (
                <MapContainer
                  center={routePoints[0] || [28.6139, 77.2090]}
                  zoom={13}
                  className="w-full h-full"
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <HistoryMapUpdater points={routePoints} />
                  <Polyline
                    positions={routePoints}
                    pathOptions={{ color: '#00d4aa', weight: 3, opacity: 0.8 }}
                  />
                  {routePoints.length > 0 && (
                    <>
                      <Marker position={routePoints[0]} icon={startIcon} />
                      <Marker position={routePoints[routePoints.length - 1]} icon={endIcon} />
                    </>
                  )}
                </MapContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-trackx-400">No location data for this day</p>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="lg:col-span-4 glass rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-trackx-600/50">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent-400" />
                  Timeline
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {dayHistory.length === 0 ? (
                  <p className="text-trackx-400 text-sm text-center py-8">{historyError || 'No records available'}</p>
                ) : (
                  dayHistory.map((record, idx) => (
                    <div key={record.id} className="flex items-start gap-3 py-2">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          idx === 0 ? 'bg-accent-400' : idx === dayHistory.length - 1 ? 'bg-danger-500' : 'bg-trackx-400'
                        }`}></div>
                        {idx < dayHistory.length - 1 && (
                          <div className="w-px h-8 bg-trackx-600"></div>
                        )}
                      </div>
                      <div className="flex-1 -mt-1">
                        <p className="text-xs font-medium text-white">{formatTime(record.timestamp)}</p>
                        <p className="text-xs text-trackx-400 font-mono">
                          {record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}
                        </p>
                        {record.speed && (
                          <p className="text-xs text-trackx-300">{Math.round(record.speed)} km/h</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
