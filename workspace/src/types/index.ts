export interface Driver {
  uid: string;
  name: string;
  trackingId: string;
  status: 'online' | 'offline' | 'sharing_disabled' | 'location_stale';
  sharingEnabled: boolean;
  latitude: number;
  longitude: number;
  speed: number | null;
  accuracy: number | null;
  lastUpdated: number;
  lastConnection: number;
  registeredAt: number;
}

export interface LocationRecord {
  id: string;
  uid: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
}

export interface RegistrationToken {
  id: string;
  trackingId: string;
  driverName: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
}

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin';
}

export type DriverStatus = Driver['status'];

export interface FleetStats {
  total: number;
  online: number;
  offline: number;
  sharingDisabled: number;
  stale: number;
}
