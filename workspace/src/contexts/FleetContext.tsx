import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { Driver, LocationRecord, RegistrationToken, FleetStats } from '../types';
import { db } from '../firebase';
import { generateToken, mockDrivers } from '../data/mockData';

interface FleetContextType {
  drivers: Driver[];
  stats: FleetStats;
  selectedDriver: Driver | null;
  setSelectedDriver: React.Dispatch<React.SetStateAction<Driver | null>>;
  addDriver: (name: string) => Promise<RegistrationToken>;
  removeDriver: (uid: string) => void;
  toggleSharing: (uid: string) => void;
  getLocationHistory: (uid: string) => Promise<LocationRecord[]>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  tokens: RegistrationToken[];
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  seedDemoDrivers: () => Promise<void>;
  isSimulating: boolean;
  toggleSimulation: () => void;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export function FleetProvider({ children }: { children: ReactNode }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tokens, setTokens] = useState<RegistrationToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    // Real-time Firestore listener for drivers collection
    const driversRef = collection(db, 'drivers');
    const unsubscribeDrivers = onSnapshot(driversRef, snapshot => {
      const nextDrivers: Driver[] = snapshot.docs.map(docSnap => {
        const value = docSnap.data();
        return {
          uid: docSnap.id,
          name: value.name || 'Unknown driver',
          trackingId: value.trackingId || '---',
          status: value.status || 'offline',
          sharingEnabled: value.sharingEnabled === true,
          latitude: typeof value.latitude === 'number' ? value.latitude : (value.lastLocation?.latitude ?? 0),
          longitude: typeof value.longitude === 'number' ? value.longitude : (value.lastLocation?.longitude ?? 0),
          speed: typeof value.speed === 'number' ? value.speed : (value.lastLocation?.speed ?? null),
          accuracy: typeof value.accuracy === 'number' ? value.accuracy : (value.lastLocation?.accuracy ?? null),
          lastUpdated: value.lastUpdated ?? 0,
          lastConnection: value.lastConnection ?? 0,
          registeredAt: value.registeredAt ?? 0,
        };
      });

      setDrivers(nextDrivers);
      setIsLoading(false);
    }, reason => {
      console.error('Unable to load drivers from Firestore:', reason);
      setError('Unable to load driver data. Check Firestore database setup and security rules.');
      setIsLoading(false);
    });

    // Real-time Firestore listener for registrationTokens collection
    const tokensRef = collection(db, 'registrationTokens');
    const unsubscribeTokens = onSnapshot(tokensRef, snapshot => {
      const nextTokens: RegistrationToken[] = snapshot.docs.map(docSnap => {
        const value = docSnap.data();
        return {
          id: docSnap.id,
          trackingId: value.trackingId || '',
          driverName: value.driverName || '',
          token: value.token || '',
          createdAt: value.createdAt || 0,
          expiresAt: value.expiresAt || 0,
          used: value.used === true,
          usedAt: value.usedAt,
        };
      });
      setTokens(nextTokens);
    }, reason => {
      console.error('Unable to load registration tokens:', reason);
      setError('Unable to load registration tokens. Check Firestore permissions.');
    });

    return () => {
      unsubscribeDrivers();
      unsubscribeTokens();
    };
  }, []);

  useEffect(() => {
    setSelectedDriver(current => current
      ? drivers.find(driver => driver.uid === current.uid) || null
      : null);
  }, [drivers]);

  // Live telemetry simulator
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(async () => {
      const onlineDrivers = drivers.filter(d => d.status === 'online');
      if (onlineDrivers.length === 0) return;

      for (const d of onlineDrivers) {
        const latDelta = (Math.random() - 0.5) * 0.003;
        const lngDelta = (Math.random() - 0.5) * 0.003;
        const newLat = d.latitude + latDelta;
        const newLng = d.longitude + lngDelta;
        const now = Date.now();
        const newSpeed = Math.floor(Math.random() * 45) + 25;

        try {
          await updateDoc(doc(db, 'drivers', d.uid), {
            latitude: newLat,
            longitude: newLng,
            speed: newSpeed,
            lastUpdated: now,
          });

          const historyRef = doc(collection(db, 'locationHistory'));
          await setDoc(historyRef, {
            uid: d.uid,
            latitude: newLat,
            longitude: newLng,
            speed: newSpeed,
            accuracy: 6,
            timestamp: now,
          });
        } catch (e) {
          console.warn('Simulation update skipped:', e);
        }
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isSimulating, drivers]);

  const toggleSimulation = useCallback(() => {
    setIsSimulating(prev => !prev);
  }, []);

  const stats: FleetStats = {
    total: drivers.length,
    online: drivers.filter(d => d.status === 'online').length,
    offline: drivers.filter(d => d.status === 'offline').length,
    sharingDisabled: drivers.filter(d => d.status === 'sharing_disabled').length,
    stale: drivers.filter(d => d.status === 'location_stale').length,
  };

  const seedDemoDrivers = useCallback(async () => {
    setIsLoading(true);
    try {
      const sample = mockDrivers.slice(0, 6);
      for (const d of sample) {
        await setDoc(doc(db, 'drivers', d.uid), d);
      }
    } catch (err: any) {
      console.error('Failed to seed demo drivers:', err);
      setError(err?.message || 'Failed to seed demo drivers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addDriver = useCallback(async (name: string): Promise<RegistrationToken> => {
    try {
      let highestNum = 0;
      drivers.forEach(d => {
        const match = /^TRK-(\d+)$/.exec(d.trackingId);
        if (match) highestNum = Math.max(highestNum, Number(match[1]));
      });
      tokens.forEach(t => {
        const match = /^TRK-(\d+)$/.exec(t.trackingId);
        if (match) highestNum = Math.max(highestNum, Number(match[1]));
      });

      const nextTrackingNumber = highestNum + 1;
      const trackingId = `TRK-${String(nextTrackingNumber).padStart(3, '0')}`;
      const now = Date.now();
      const tokenDoc = doc(collection(db, 'registrationTokens'));

      const registrationToken: RegistrationToken = {
        id: tokenDoc.id,
        trackingId,
        driverName: name.trim(),
        token: generateToken(),
        createdAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000,
        used: false,
      };

      await setDoc(tokenDoc, registrationToken);
      return registrationToken;
    } catch (reason: any) {
      console.error('Unable to create registration token in Firestore:', reason);
      const msg = reason?.message || 'Unable to create registration token.';
      setError(msg);
      throw reason;
    }
  }, [drivers, tokens]);

  const removeDriver = useCallback(async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'drivers', uid));
      setSelectedDriver(current => current?.uid === uid ? null : current);
    } catch (reason: any) {
      console.error('Unable to remove driver from Firestore:', reason);
      setError(reason?.message || 'Unable to remove driver.');
    }
  }, []);

  const toggleSharing = useCallback(async (uid: string) => {
    const driver = drivers.find(candidate => candidate.uid === uid);
    if (!driver) return;
    if (!driver.sharingEnabled) {
      setError('Drivers must enable location sharing from their device.');
      return;
    }

    try {
      await updateDoc(doc(db, 'drivers', uid), {
        sharingEnabled: false,
        status: 'sharing_disabled',
      });
    } catch (reason: any) {
      console.error('Unable to update driver sharing:', reason);
      setError(reason?.message || 'Unable to update driver sharing.');
    }
  }, [drivers]);

  const getLocationHistory = useCallback(async (uid: string): Promise<LocationRecord[]> => {
    try {
      const records: LocationRecord[] = [];
      const historyQuery = query(
        collection(db, 'locationHistory'),
        where('uid', '==', uid)
      );

      const snapshot = await getDocs(historyQuery);
      snapshot.forEach(docSnap => {
        const val = docSnap.data();
        records.push({
          id: docSnap.id,
          uid,
          latitude: val.latitude,
          longitude: val.longitude,
          speed: val.speed ?? null,
          accuracy: val.accuracy ?? null,
          timestamp: val.timestamp,
        });
      });

      // Sort client-side by timestamp ascending to avoid requiring Firestore composite index
      records.sort((a, b) => a.timestamp - b.timestamp);
      return records;
    } catch (reason: any) {
      console.error('Unable to load location history from Firestore:', reason);
      setError(reason?.message || 'Unable to load location history.');
      return [];
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <FleetContext.Provider value={{
      drivers,
      stats,
      selectedDriver,
      setSelectedDriver,
      addDriver,
      removeDriver,
      toggleSharing,
      getLocationHistory,
      searchQuery,
      setSearchQuery,
      tokens,
      isLoading,
      error,
      clearError,
      seedDemoDrivers,
      isSimulating,
      toggleSimulation,
    }}>
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
}
