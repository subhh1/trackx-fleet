import React from 'react';
import { useFleet } from '../contexts/FleetContext';
import { Driver } from '../types';
import { Search, UserCircle, Clock, Sparkles } from 'lucide-react';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatusBadge({ status }: { status: Driver['status'] }) {
  const config = {
    online: { bg: 'bg-accent-500/10', text: 'text-accent-400', border: 'border-accent-500/20', label: 'Online' },
    offline: { bg: 'bg-trackx-500/10', text: 'text-trackx-300', border: 'border-trackx-500/20', label: 'Offline' },
    sharing_disabled: { bg: 'bg-warning-500/10', text: 'text-warning-500', border: 'border-warning-500/20', label: 'Disabled' },
    location_stale: { bg: 'bg-danger-500/10', text: 'text-danger-500', border: 'border-danger-500/20', label: 'Stale' },
  };
  const c = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-accent-400 status-online' : status === 'location_stale' ? 'bg-danger-500' : status === 'sharing_disabled' ? 'bg-warning-500' : 'bg-trackx-400'}`}></span>
      {c.label}
    </span>
  );
}

export default function DriverTable() {
  const { drivers, selectedDriver, setSelectedDriver, searchQuery, setSearchQuery, seedDemoDrivers } = useFleet();

  const filteredDrivers = drivers.filter(d => {
    const query = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(query) || d.trackingId.toLowerCase().includes(query);
  });

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-trackx-600/50">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">Drivers</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-trackx-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name or ID..."
              className="pl-10 pr-4 py-2 bg-trackx-800 border border-trackx-600 rounded-xl text-sm text-white placeholder-trackx-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50 w-64"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
        <table className="w-full">
          <thead className="sticky top-0 bg-trackx-800/95 backdrop-blur-sm">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-medium text-trackx-400 uppercase tracking-wider">Driver</th>
              <th className="px-4 py-3 text-xs font-medium text-trackx-400 uppercase tracking-wider">Tracking ID</th>
              <th className="px-4 py-3 text-xs font-medium text-trackx-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-trackx-400 uppercase tracking-wider">Last Updated</th>
              <th className="px-4 py-3 text-xs font-medium text-trackx-400 uppercase tracking-wider">Speed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-trackx-600/30">
            {filteredDrivers.map(driver => (
              <tr
                key={driver.uid}
                onClick={() => setSelectedDriver(driver)}
                className={`cursor-pointer transition-all hover:bg-trackx-700/50 ${
                  selectedDriver?.uid === driver.uid ? 'bg-accent-500/5 border-l-2 border-l-accent-500' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-trackx-600 flex items-center justify-center">
                      <UserCircle className="w-4 h-4 text-trackx-300" />
                    </div>
                    <span className="text-sm font-medium text-white">{driver.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-mono text-trackx-200">{driver.trackingId}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={driver.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-sm text-trackx-300">
                    <Clock className="w-3.5 h-3.5" />
                    {timeAgo(driver.lastUpdated)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-trackx-200">
                    {driver.speed ? `${Math.round(driver.speed)} km/h` : '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDrivers.length === 0 && (
          <div className="p-8 text-center text-trackx-400">
            {drivers.length === 0 ? (
              <div className="space-y-3">
                <p className="text-white font-medium">No drivers in fleet yet</p>
                <p className="text-xs text-trackx-400">Add a driver using the button above or load sample fleet data into Firestore.</p>
                <button
                  onClick={seedDemoDrivers}
                  className="px-4 py-2 bg-accent-500/10 hover:bg-accent-500/20 text-accent-400 border border-accent-500/30 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Sample Fleet into Firestore
                </button>
              </div>
            ) : (
              <p>No drivers found matching "{searchQuery}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
