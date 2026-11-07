import React, { useState, useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import DriverQrScanner from '../components/DriverQrScanner';
import InstallApkModal from '../components/InstallApkModal';
import confetti from 'canvas-confetti';
import {
  Navigation,
  MapPin,
  Gauge,
  ShieldCheck,
  AlertCircle,
  Radio,
  Power,
  CheckCircle2,
  QrCode,
  LogIn,
  UserPlus,
  LogOut,
  Smartphone,
  ArrowRight,
  Shield,
  Download,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DriverProfile {
  uid: string;
  name: string;
  email?: string;
  trackingId: string;
  vehicle?: string;
  phone?: string;
  status: string;
}

export default function DriverPortalPage() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [packetsCount, setPacketsCount] = useState(0);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  // Modals & PWA prompt
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [linkSuccessToast, setLinkSuccessToast] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);
  const latestCoordsRef = useRef<{
    lat: number;
    lng: number;
    speed: number;
    accuracy: number;
    heading: number;
  } | null>(null);

  // Catch PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'drivers', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDriverProfile({
              uid: user.uid,
              name: data.name || user.displayName || 'Driver',
              email: user.email || data.email || '',
              trackingId: data.trackingId || `TRK-${user.uid.slice(0, 4).toUpperCase()}`,
              vehicle: data.vehicle || '',
              phone: data.phone || '',
              status: data.status || 'offline',
            });
          } else {
            const defaultTrackingId = `TRK-${user.uid.slice(0, 4).toUpperCase()}`;
            const initialProfile: DriverProfile = {
              uid: user.uid,
              name: user.displayName || (user.isAnonymous ? 'Guest Driver' : 'Driver'),
              email: user.email || '',
              trackingId: defaultTrackingId,
              status: 'offline',
            };
            await setDoc(docRef, {
              ...initialProfile,
              role: 'driver',
              registeredAt: Date.now(),
              lastUpdated: Date.now(),
            });
            setDriverProfile(initialProfile);
          }
        } catch (err) {
          console.error('Error fetching driver profile:', err);
        }
      } else {
        setDriverProfile(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Parse URL query params (e.g. from invite link/QR scanned by phone camera)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nameParam = params.get('name');
    const idParam = params.get('id');

    if (idParam && currentUser) {
      handleApplyTrackingId(idParam, nameParam || undefined);
    }
  }, [currentUser]);

  // Request Wake Lock to keep phone screen awake during driving
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock error:', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (e) {
        // ignore
      }
    }
  };

  // Sign in driver
  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email || !password) {
      setAuthError('Please enter your email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Driver sign in error:', err);
      const code = err?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setAuthError('Invalid driver email or password. If you need an account, create one below.');
      } else {
        setAuthError(err?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Register new driver
  const handleDriverRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!fullName.trim()) {
      setAuthError('Please enter your full name');
      return;
    }
    if (!email || !password) {
      setAuthError('Please enter your email and password');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;
      const initialTrackingId = `TRK-${uid.slice(0, 4).toUpperCase()}`;

      const newDriverData = {
        uid,
        name: fullName.trim(),
        email: email.trim(),
        vehicle: vehicle.trim() || 'Assigned Vehicle',
        phone: phone.trim() || '',
        trackingId: initialTrackingId,
        role: 'driver',
        status: 'offline',
        sharingEnabled: true,
        registeredAt: Date.now(),
        lastUpdated: Date.now(),
      };

      await setDoc(doc(db, 'drivers', uid), newDriverData);
      setDriverProfile(newDriverData);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error('Driver registration error:', err);
      setAuthError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick anonymous access
  const handleGuestAccess = async () => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error('Guest access error:', err);
      setAuthError(err?.message || 'Guest driver access failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign out driver
  const handleDriverLogout = async () => {
    await handleStopTracking();
    await signOut(auth);
    setDriverProfile(null);
    setCurrentUser(null);
  };

  // Apply scanned Tracking ID or Token
  const handleApplyTrackingId = async (scannedText: string, suggestedName?: string) => {
    if (!currentUser) return;

    let targetId = scannedText.trim();

    if (targetId.includes('http://') || targetId.includes('https://') || targetId.includes('?')) {
      try {
        const url = new URL(targetId.startsWith('http') ? targetId : `https://trackx.io/${targetId}`);
        const idParam = url.searchParams.get('id');
        const tokenParam = url.searchParams.get('token');
        if (idParam) targetId = idParam;
        else if (tokenParam) targetId = `TRK-${tokenParam.slice(0, 4).toUpperCase()}`;
      } catch {
        // use raw text
      }
    }

    if (targetId.startsWith('TRACKX_')) {
      targetId = targetId.replace('TRACKX_', '').split('_')[0];
    }

    try {
      await updateDoc(doc(db, 'drivers', currentUser.uid), {
        trackingId: targetId,
        lastUpdated: Date.now(),
        ...(suggestedName ? { name: suggestedName } : {}),
      });

      setDriverProfile(prev => (prev ? { ...prev, trackingId: targetId } : null));

      setLinkSuccessToast(`Linked to Vehicle / Tracking ID: ${targetId}`);
      setTimeout(() => setLinkSuccessToast(null), 4000);

      confetti({
        particleCount: 70,
        spread: 50,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Error updating driver tracking ID:', err);
      setTrackingError('Failed to link tracking ID to Firestore.');
    }
  };

  // Transmit location to Cloud Firestore
  const transmitLocation = async (lat: number, lng: number, speedKmh: number, accuracyMeters: number, headingVal: number) => {
    if (!currentUser || !driverProfile) return;

    const uid = currentUser.uid;
    const now = Date.now();

    setCoords({ lat, lng });
    setCurrentSpeed(speedKmh);
    setCurrentAccuracy(accuracyMeters);
    setLastSent(new Date());
    setPacketsCount(prev => prev + 1);

    try {
      // 1. Update live driver status in Firestore
      await setDoc(
        doc(db, 'drivers', uid),
        {
          uid,
          name: driverProfile.name,
          email: driverProfile.email || '',
          vehicle: driverProfile.vehicle || '',
          trackingId: driverProfile.trackingId,
          status: 'online',
          sharingEnabled: true,
          latitude: lat,
          longitude: lng,
          speed: speedKmh,
          accuracy: accuracyMeters,
          heading: headingVal,
          lastUpdated: now,
          lastConnection: now,
        },
        { merge: true }
      );

      // 2. Append to location history collection for live path tracking
      await addDoc(collection(db, 'locationHistory'), {
        uid,
        latitude: lat,
        longitude: lng,
        speed: speedKmh,
        accuracy: accuracyMeters,
        heading: headingVal,
        timestamp: now,
      });
    } catch (firestoreErr: any) {
      console.error('Firestore 5-second GPS transmission error:', firestoreErr);
    }
  };

  // Start live GPS tracking with guaranteed 5-second interval
  const handleStartTracking = async () => {
    setTrackingError(null);

    if (!currentUser || !driverProfile) {
      setTrackingError('Please sign in or create an account to start tracking.');
      return;
    }

    if (!navigator.geolocation) {
      setTrackingError('Geolocation is not supported by your mobile browser.');
      return;
    }

    try {
      await requestWakeLock();

      // 1. Start continuous watchPosition to cache fresh GPS fixes
      const watchId = navigator.geolocation.watchPosition(
        position => {
          const { latitude, longitude, speed, accuracy, heading } = position.coords;
          const speedKmh = speed != null ? Math.round(speed * 3.6) : 0;
          const accuracyMeters = Math.round(accuracy);
          const headingVal = heading || 0;

          latestCoordsRef.current = {
            lat: latitude,
            lng: longitude,
            speed: speedKmh,
            accuracy: accuracyMeters,
            heading: headingVal,
          };
        },
        geoErr => {
          console.error('GPS error:', geoErr);
          setTrackingError(`GPS Error: ${geoErr.message}. Ensure location permissions are allowed.`);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 10000,
        }
      );
      watchIdRef.current = watchId;

      // 2. Initial instant transmission
      navigator.geolocation.getCurrentPosition(
        pos => {
          const { latitude, longitude, speed, accuracy, heading } = pos.coords;
          const speedKmh = speed != null ? Math.round(speed * 3.6) : 0;
          const accuracyMeters = Math.round(accuracy);
          const headingVal = heading || 0;
          latestCoordsRef.current = { lat: latitude, lng: longitude, speed: speedKmh, accuracy: accuracyMeters, heading: headingVal };
          transmitLocation(latitude, longitude, speedKmh, accuracyMeters, headingVal);
        },
        err => console.warn('Initial GPS query warning:', err),
        { enableHighAccuracy: true, timeout: 5000 }
      );

      // 3. Guaranteed 5-Second Interval Timer
      setCountdown(5);
      intervalIdRef.current = setInterval(() => {
        setCountdown(5);
        if (latestCoordsRef.current) {
          const { lat, lng, speed, accuracy, heading } = latestCoordsRef.current;
          transmitLocation(lat, lng, speed, accuracy, heading);
        } else {
          // If no cached coords yet, query directly
          navigator.geolocation.getCurrentPosition(
            pos => {
              const { latitude, longitude, speed, accuracy, heading } = pos.coords;
              const speedKmh = speed != null ? Math.round(speed * 3.6) : 0;
              const accuracyMeters = Math.round(accuracy);
              const headingVal = heading || 0;
              latestCoordsRef.current = { lat: latitude, lng: longitude, speed: speedKmh, accuracy: accuracyMeters, heading: headingVal };
              transmitLocation(latitude, longitude, speedKmh, accuracyMeters, headingVal);
            },
            err => console.warn('GPS interval fix error:', err),
            { enableHighAccuracy: true, timeout: 4000 }
          );
        }
      }, 5000);

      // 4. 1-Second countdown ticker
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => (prev <= 1 ? 5 : prev - 1));
      }, 1000);

      setIsTracking(true);
    } catch (err: any) {
      console.error('Start tracking error:', err);
      setTrackingError(err?.message || 'Unable to start GPS tracking.');
    }
  };

  // Stop live GPS tracking
  const handleStopTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    releaseWakeLock();
    setIsTracking(false);
    setCountdown(5);

    if (currentUser) {
      try {
        await updateDoc(doc(db, 'drivers', currentUser.uid), {
          status: 'offline',
          lastUpdated: Date.now(),
        });
      } catch (e) {
        // ignore
      }
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      releaseWakeLock();
    };
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-trackx-900 flex items-center justify-center text-trackx-300">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-accent-400 border-t-transparent rounded-full" />
          <span className="text-sm">Connecting to TRACKX Driver Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-trackx-900 text-white flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Top Header */}
      <div className="w-full pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-400 shadow-md shadow-accent-500/20">
            <Navigation className="w-5 h-5 text-trackx-900" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              TRACKX <span className="text-xs px-2 py-0.5 rounded-md bg-accent-500/20 text-accent-400 font-mono font-semibold">DRIVER</span>
            </h1>
            <p className="text-[11px] text-trackx-400">Live GPS Telemetry Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Install APK Button */}
          <button
            onClick={() => setIsApkModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-accent-500/20 hover:bg-accent-500/30 text-accent-400 border border-accent-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Install Mobile App / Download APK"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install APK</span>
          </button>

          {currentUser ? (
            <button
              onClick={handleDriverLogout}
              className="p-1.5 rounded-xl bg-trackx-800 hover:bg-trackx-700 text-trackx-300 hover:text-white border border-trackx-700 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <a
              href="/"
              className="text-xs text-trackx-400 hover:text-accent-400 font-medium flex items-center gap-1 transition-colors ml-1"
            >
              Admin
              <ArrowRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Success Notification Toast */}
      {linkSuccessToast && (
        <div className="my-2 p-3 bg-accent-500/20 border border-accent-500/40 rounded-2xl text-accent-300 text-xs flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-accent-400 flex-shrink-0" />
          <span>{linkSuccessToast}</span>
        </div>
      )}

      {/* Main Container */}
      {!currentUser ? (
        /* Driver Auth View (Login / Register) */
        <div className="w-full glass rounded-3xl p-6 my-4 border border-trackx-600/60 shadow-2xl">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-trackx-700/60">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent-400" />
              <h2 className="text-base font-bold text-white">
                {authMode === 'register' ? 'Driver Registration' : 'Driver Sign In'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'register' ? 'login' : 'register');
                setAuthError(null);
              }}
              className="text-xs font-semibold text-accent-400 hover:text-accent-300 underline transition-colors"
            >
              {authMode === 'register' ? 'Existing Driver? Sign In' : 'New Driver? Register'}
            </button>
          </div>

          {authError && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-danger-500/15 border border-danger-500/30 rounded-xl text-danger-300 text-xs">
              <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleDriverLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-trackx-300 mb-1.5 uppercase tracking-wider">
                  Driver Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="driver@trackx.io"
                  className="w-full px-4 py-3 bg-trackx-800 border border-trackx-600 rounded-xl text-white placeholder-trackx-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-trackx-300 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-trackx-800 border border-trackx-600 rounded-xl text-white placeholder-trackx-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-accent-500 to-accent-400 text-trackx-900 font-bold rounded-xl hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-500/20 text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-trackx-900 border-t-transparent rounded-full" />
                    Signing In...
                  </span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In as Driver
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleDriverRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-trackx-300 mb-1 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 bg-trackx-800 border border-trackx-600 rounded-xl text-white placeholder-trackx-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-trackx-300 mb-1 uppercase tracking-wider">
                  Driver Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. rahul@fleet.io"
                  className="w-full px-4 py-2.5 bg-trackx-800 border border-trackx-600 rounded-xl text-white placeholder-trackx-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-trackx-300 mb-1 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 bg-trackx-800 border border-trackx-600 rounded-xl text-white placeholder-trackx-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-trackx-300 mb-1 uppercase">
                    Vehicle Model
                  </label>
                  <input
                    type="text"
                    value={vehicle}
                    onChange={e => setVehicle(e.target.value)}
                    placeholder="e.g. Van / Truck"
                    className="w-full px-3 py-2 bg-trackx-800 border border-trackx-600 rounded-xl text-white placeholder-trackx-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-trackx-300 mb-1 uppercase">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765..."
                    className="w-full px-3 py-2 bg-trackx-800 border border-trackx-600 rounded-xl text-white placeholder-trackx-500 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-3.5 px-4 bg-gradient-to-r from-accent-500 to-accent-400 text-trackx-900 font-bold rounded-xl hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-500/20 text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-trackx-900 border-t-transparent rounded-full" />
                    Creating Driver Account...
                  </span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Register Driver Account
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-trackx-700/60 text-center">
            <button
              type="button"
              onClick={handleGuestAccess}
              className="text-xs text-trackx-400 hover:text-white transition-colors"
            >
              Need quick one-time tracking? <span className="text-accent-400 underline font-medium">Continue as Guest</span>
            </button>
          </div>
        </div>
      ) : (
        /* Driver Dashboard & GPS Console */
        <div className="w-full glass rounded-3xl p-6 my-4 border border-trackx-600/60 shadow-2xl">
          {trackingError && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-danger-500/15 border border-danger-500/30 rounded-xl text-danger-300 text-xs">
              <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
              <span>{trackingError}</span>
            </div>
          )}

          {/* Driver Profile Bar */}
          <div className="p-4 rounded-2xl bg-trackx-800/80 border border-trackx-700 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-1.5">
                  {driverProfile?.name}
                </p>
                <p className="text-xs text-trackx-400">{driverProfile?.email || 'Guest Driver'}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-trackx-400 block uppercase">Tracking ID</span>
                <span className="text-xs font-mono font-bold text-accent-400 px-2 py-0.5 rounded-lg bg-accent-500/10 border border-accent-500/30">
                  {driverProfile?.trackingId}
                </span>
              </div>
            </div>

            {/* QR Scan Button */}
            <div className="mt-3 pt-3 border-t border-trackx-700/60 flex items-center justify-between">
              <div className="text-xs text-trackx-400">
                Vehicle: <span className="text-white font-medium">{driverProfile?.vehicle || 'Unlinked'}</span>
              </div>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-1.5 bg-accent-500/20 hover:bg-accent-500/30 text-accent-400 border border-accent-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5" />
                Scan Vehicle QR
              </button>
            </div>
          </div>

          {!isTracking ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-b from-trackx-800/50 to-trackx-800/20 border border-trackx-700 text-center">
                <div className="w-12 h-12 rounded-full bg-accent-500/10 text-accent-400 flex items-center justify-center mx-auto mb-2">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-white">5-Second Live Transmission Ready</h3>
                <p className="text-xs text-trackx-400 mt-1">
                  Transmits GPS location to the fleet map strictly every 5 seconds. Keep on vehicle mount.
                </p>
              </div>

              <button
                onClick={handleStartTracking}
                className="w-full py-4 px-6 bg-gradient-to-r from-accent-500 to-accent-400 text-trackx-900 font-bold rounded-2xl hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xl shadow-accent-500/20 text-base"
              >
                <Radio className="w-5 h-5" />
                Start 5-Second Live GPS
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Live Status Header with 5-Second Cadence Indicator */}
              <div className="flex items-center justify-between pb-3 border-b border-trackx-700">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-500"></span>
                  </span>
                  <span className="text-xs font-bold text-accent-400 uppercase tracking-wider">
                    5s INTERVAL LIVE
                  </span>
                </div>
                {/* 5-Second Sync Countdown Ticker */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-500/15 border border-accent-500/30 text-accent-400 text-[11px] font-mono">
                  <Clock className="w-3 h-3 animate-spin" />
                  <span>Next sync: {countdown}s</span>
                </div>
              </div>

              {/* Speedometer Gauge */}
              <div className="flex flex-col items-center justify-center py-6 bg-trackx-800/80 rounded-2xl border border-trackx-700 shadow-inner">
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-black font-mono text-white tracking-tight">
                    {currentSpeed ?? 0}
                  </span>
                  <span className="text-sm font-bold text-accent-400 uppercase">km/h</span>
                </div>
                <p className="text-xs text-trackx-400 mt-1 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-accent-400" />
                  Live Ground Speed
                </p>
              </div>

              {/* Telemetry Stats Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-trackx-800/50 p-3 rounded-xl border border-trackx-700/60">
                  <span className="text-trackx-400 block mb-1">GPS Accuracy</span>
                  <span className="text-white font-mono font-bold">
                    {currentAccuracy ? `±${currentAccuracy} meters` : 'Acquiring GPS...'}
                  </span>
                </div>
                <div className="bg-trackx-800/50 p-3 rounded-xl border border-trackx-700/60">
                  <span className="text-trackx-400 block mb-1">Total Transmitted</span>
                  <span className="text-white font-mono font-bold">
                    {packetsCount} packets
                  </span>
                </div>
              </div>

              {/* Current Coordinates */}
              {coords && (
                <div className="text-center font-mono text-[11px] text-trackx-300 bg-trackx-800/30 py-2.5 px-3 rounded-xl border border-trackx-700/40 flex items-center justify-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-accent-400 flex-shrink-0" />
                  <span>
                    Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
                  </span>
                </div>
              )}

              {/* Stop Button */}
              <button
                onClick={handleStopTracking}
                className="w-full py-3.5 px-4 bg-danger-500/20 hover:bg-danger-500/30 text-danger-400 border border-danger-500/40 font-bold rounded-xl active:scale-98 transition-all flex items-center justify-center gap-2 text-sm shadow-md"
              >
                <Power className="w-4 h-4" />
                Stop Broadcasting
              </button>
            </div>
          )}
        </div>
      )}

      {/* QR Scanner Modal */}
      <DriverQrScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={scannedText => handleApplyTrackingId(scannedText)}
      />

      {/* APK Installation Modal */}
      <InstallApkModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />

      {/* Footer Info */}
      <div className="w-full text-center pb-2 text-[11px] text-trackx-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-accent-400" />
        <span>Syncing to Firestore Every 5 Seconds</span>
      </div>
    </div>
  );
}
