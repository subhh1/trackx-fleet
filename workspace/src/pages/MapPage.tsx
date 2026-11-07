import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import LiveMap from '../components/LiveMap';
import DriverDetails from '../components/DriverDetails';

export default function MapPage() {
  const { drivers, stats } = useFleet();
  const [filter, setFilter] = useState<string>('all');

  const filteredStats = {
    all: drivers.length,
    online: stats.online,
    offline: stats.offline,
    stale: stats.stale,
  };

  // Apply filter to drivers for display count
  const filteredDrivers = filter === 'all' 
    ? drivers 
    : drivers.filter(d => {
        if (filter === 'online') return d.status === 'online';
        if (filter === 'offline') return d.status === 'offline';
        if (filter === 'stale') return d.status === 'location_stale';
        return true;
      });

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="h-16 border-b border-trackx-600/50 bg-trackx-800/50 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-white">Live Map</h2>
          <p className="text-xs text-trackx-400">{filteredDrivers.length} drivers shown</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-trackx-800 rounded-xl p-1 border border-trackx-600">
            {['all', 'online', 'offline', 'stale'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-accent-500/20 text-accent-400'
                    : 'text-trackx-300 hover:text-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6">
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 xl:col-span-9">
            <LiveMap />
          </div>
          <div className="lg:col-span-4 xl:col-span-3">
            <DriverDetails />
          </div>
        </div>
      </main>
    </div>
  );
}
