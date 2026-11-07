import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, LayoutDashboard, Users, Map, History, LogOut, Shield, Radio, ExternalLink } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'map', label: 'Live Map', icon: Map },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <aside className="w-64 h-screen bg-trackx-800 border-r border-trackx-600/50 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-trackx-600/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-trackx-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">TRACKX</h1>
            <p className="text-[10px] text-trackx-400 uppercase tracking-wider">Fleet Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                  : 'text-trackx-300 hover:bg-trackx-700 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Driver Mobile Link shortcut */}
      <div className="px-4 pb-2">
        <a
          href="/driver"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-accent-400 bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/20 transition-all"
          title="Open mobile driver tracking portal"
        >
          <span className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5" />
            Driver Phone Portal
          </span>
          <ExternalLink className="w-3 h-3 text-trackx-400" />
        </a>
      </div>

      {/* User section */}
      <div className="p-4 border-t border-trackx-600/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-trackx-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-accent-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-trackx-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-trackx-300 hover:bg-danger-500/10 hover:text-danger-500 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
