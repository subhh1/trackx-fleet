import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FleetProvider, useFleet } from './contexts/FleetContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DriversPage from './pages/DriversPage';
import MapPage from './pages/MapPage';
import HistoryPage from './pages/HistoryPage';
import DriverPortalPage from './pages/DriverPortalPage';
import Sidebar from './components/Sidebar';

function AppContent() {
  const isDriverRoute =
    window.location.pathname.startsWith('/driver') ||
    new URLSearchParams(window.location.search).get('mode') === 'driver';

  if (isDriverRoute) {
    return <DriverPortalPage />;
  }

  const { isAuthenticated, isLoading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-trackx-900 text-trackx-300">
        Checking administrator session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardPage />;
      case 'drivers':
        return <DriversPage />;
      case 'map':
        return <MapPage />;
      case 'history':
        return <HistoryPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <FleetProvider>
      <FleetApp activeView={activeView} onViewChange={setActiveView} renderView={renderView} />
    </FleetProvider>
  );
}

function FleetApp({ activeView, onViewChange, renderView }: {
  activeView: string;
  onViewChange: (view: string) => void;
  renderView: () => React.ReactNode;
}) {
  const { error, clearError, isLoading } = useFleet();

  return (
    <div className="flex h-screen bg-trackx-900 overflow-hidden">
      <Sidebar activeView={activeView} onViewChange={onViewChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div role="alert" className="fixed top-3 right-3 z-[1000] max-w-lg rounded-xl border border-danger-500/30 bg-trackx-800 p-4 text-sm text-danger-400 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <span>{error}</span>
              <button onClick={clearError} className="text-trackx-300 hover:text-white" aria-label="Dismiss error">×</button>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-trackx-300">Loading fleet data...</div>
        ) : renderView()}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
