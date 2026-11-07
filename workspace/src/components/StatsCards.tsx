import React from 'react';
import { useFleet } from '../contexts/FleetContext';
import { Users, Wifi, WifiOff, AlertTriangle, MapPin } from 'lucide-react';

export default function StatsCards() {
  const { stats } = useFleet();

  const cards = [
    {
      label: 'Total Drivers',
      value: stats.total,
      icon: Users,
      color: 'from-trackx-500 to-trackx-400',
      bgColor: 'bg-trackx-500/10',
      textColor: 'text-trackx-200',
    },
    {
      label: 'Online',
      value: stats.online,
      icon: Wifi,
      color: 'from-accent-500 to-accent-400',
      bgColor: 'bg-accent-500/10',
      textColor: 'text-accent-400',
    },
    {
      label: 'Offline',
      value: stats.offline,
      icon: WifiOff,
      color: 'from-trackx-400 to-trackx-300',
      bgColor: 'bg-trackx-400/10',
      textColor: 'text-trackx-300',
    },
    {
      label: 'Sharing Disabled',
      value: stats.sharingDisabled,
      icon: AlertTriangle,
      color: 'from-warning-500 to-yellow-400',
      bgColor: 'bg-warning-500/10',
      textColor: 'text-warning-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="glass rounded-2xl p-5 hover:border-trackx-500/50 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${card.textColor}`} />
              </div>
              <span className={`text-2xl font-bold ${card.textColor}`}>{card.value}</span>
            </div>
            <p className="text-sm text-trackx-300">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}
