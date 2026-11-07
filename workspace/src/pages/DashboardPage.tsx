import React, { useState } from 'react';
import { useFleet } from '../contexts/FleetContext';
import StatsCards from '../components/StatsCards';
import DriverTable from '../components/DriverTable';
import LiveMap from '../components/LiveMap';
import DriverDetails from '../components/DriverDetails';
import AddDriverModal from '../components/AddDriverModal';
import { UserPlus, Bell, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { selectedDriver, isSimulating, toggleSimulation, drivers } = useFleet();
  const [showAddDriver, setShowAddDriver] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 border-b border-trackx-600/50 bg-trackx-800/50 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-white">Fleet Dashboard</h2>
          <p className="text-xs text-trackx-400">Real-time driver monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {drivers.length > 0 && (
            <button
              onClick={toggleSimulation}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isSimulating
                  ? 'bg-accent-500 text-trackx-900 border-accent-400 shadow-lg shadow-accent-500/20'
                  : 'bg-trackx-700/60 hover:bg-trackx-700 text-trackx-200 border-trackx-600'
              }`}
              title="Simulate driver movement in real time"
            >
              <Activity className={`w-3.5 h-3.5 ${isSimulating ? 'animate-pulse' : ''}`} />
              {isSimulating ? 'Simulating Live GPS' : 'Simulate Live GPS'}
            </button>
          )}
          <button className="relative w-9 h-9 rounded-xl bg-trackx-700 flex items-center justify-center hover:bg-trackx-600 transition-colors">
            <Bell className="w-4 h-4 text-trackx-300" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-danger-500 rounded-full border-2 border-trackx-800"></span>
          </button>
          <button
            onClick={() => setShowAddDriver(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-500 to-accent-400 text-trackx-900 font-semibold rounded-xl hover:opacity-90 transition-all text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Driver
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col gap-4">
          {/* Stats */}
          <StatsCards />

          {/* Content Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
            {/* Driver Table */}
            <div className="lg:col-span-4 xl:col-span-3 overflow-hidden">
              <DriverTable />
            </div>

            {/* Map */}
            <div className={`lg:col-span-5 xl:col-span-5 overflow-hidden ${selectedDriver ? 'hidden lg:block' : ''}`}>
              <LiveMap />
            </div>

            {/* Driver Details */}
            {selectedDriver && (
              <div className={`lg:col-span-3 xl:col-span-4 overflow-hidden ${!selectedDriver ? 'hidden lg:block' : ''}`}>
                <DriverDetails />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Driver Modal */}
      <AddDriverModal isOpen={showAddDriver} onClose={() => setShowAddDriver(false)} />
    </div>
  );
}
