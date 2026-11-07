import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import AddDriverModal from '../components/AddDriverModal';
import { UserPlus, Search, UserCircle, Clock, MoreVertical, Trash2, Shield, ShieldOff } from 'lucide-react';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DriversPage() {
  const { drivers, searchQuery, setSearchQuery, removeDriver, toggleSharing } = useFleet();
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filteredDrivers = drivers.filter(d => {
    const query = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(query) || d.trackingId.toLowerCase().includes(query);
  });

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="h-16 border-b border-trackx-600/50 bg-trackx-800/50 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-white">All Drivers</h2>
          <p className="text-xs text-trackx-400">{drivers.length} registered drivers</p>
        </div>
        <button
          onClick={() => setShowAddDriver(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-500 to-accent-400 text-trackx-900 font-semibold rounded-xl hover:opacity-90 transition-all text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Driver
        </button>
      </header>

      <main className="flex-1 overflow-hidden p-6">
        <div className="glass rounded-2xl overflow-hidden h-full flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-trackx-600/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-trackx-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or tracking ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-trackx-800 border border-trackx-600 rounded-xl text-sm text-white placeholder-trackx-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              />
            </div>
          </div>

          {/* Driver Cards */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDrivers.map(driver => (
                <div
                  key={driver.uid}
                  className="bg-trackx-800/50 rounded-xl p-4 border border-trackx-600/30 hover:border-trackx-500/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-trackx-600 to-trackx-700 flex items-center justify-center">
                        <span className="text-sm font-bold text-accent-400">{driver.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{driver.name}</p>
                        <p className="text-xs font-mono text-trackx-300">{driver.trackingId}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === driver.uid ? null : driver.uid)}
                        className="w-7 h-7 rounded-lg hover:bg-trackx-700 flex items-center justify-center transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-trackx-400" />
                      </button>
                      {menuOpen === driver.uid && (
                        <div className="absolute right-0 top-8 z-10 w-44 bg-trackx-700 border border-trackx-600 rounded-xl shadow-xl overflow-hidden">
                          <button
                            onClick={() => { toggleSharing(driver.uid); setMenuOpen(null); }}
                            disabled={!driver.sharingEnabled}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-trackx-200 hover:bg-trackx-600 transition-colors"
                          >
                            {driver.sharingEnabled ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                            {driver.sharingEnabled ? 'Disable Sharing' : 'Enable on driver device'}
                          </button>
                          <button
                            onClick={() => { if (confirm(`Remove ${driver.name}?`)) { removeDriver(driver.uid); } setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger-500 hover:bg-danger-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove Driver
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        driver.status === 'online' ? 'bg-accent-400 status-online' :
                        driver.status === 'offline' ? 'bg-trackx-400' :
                        driver.status === 'sharing_disabled' ? 'bg-warning-500' : 'bg-danger-500'
                      }`}></span>
                      <span className="text-xs text-trackx-300 capitalize">{driver.status.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-trackx-400">
                      <Clock className="w-3 h-3" />
                      {timeAgo(driver.lastUpdated)}
                    </div>
                  </div>

                  {driver.speed && (
                    <div className="mt-2 pt-2 border-t border-trackx-600/30">
                      <span className="text-xs text-trackx-300">
                        🚗 {Math.round(driver.speed)} km/h • ±{Math.round(driver.accuracy || 0)}m
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {filteredDrivers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-trackx-400">No drivers found</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <AddDriverModal isOpen={showAddDriver} onClose={() => setShowAddDriver(false)} />
    </div>
  );
}
