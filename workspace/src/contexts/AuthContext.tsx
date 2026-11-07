import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, limit, query } from 'firebase/firestore';
import { AdminUser } from '../types';
import { auth, db } from '../firebase';

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getAdminUser(firebaseUser: User): Promise<AdminUser | null> {
  const adminDocRef = doc(db, 'admins', firebaseUser.uid);
  const adminSnap = await getDoc(adminDocRef);

  if (adminSnap.exists()) {
    const data = adminSnap.data() as { name?: unknown; email?: unknown };
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || (typeof data.email === 'string' ? data.email : ''),
      name: typeof data.name === 'string' ? data.name : 'Fleet Administrator',
      role: 'admin',
    };
  }

  // If no admin document exists in the system yet, bootstrap this user as admin
  try {
    const adminsCollection = collection(db, 'admins');
    const existingAdmins = await getDocs(query(adminsCollection, limit(1)));
    if (existingAdmins.empty) {
      const newAdmin = {
        email: firebaseUser.email || '',
        name: 'Fleet Administrator',
        role: 'admin',
        createdAt: Date.now(),
      };
      await setDoc(adminDocRef, newAdmin);
      return {
        uid: firebaseUser.uid,
        email: newAdmin.email,
        name: newAdmin.name,
        role: 'admin',
      };
    }
  } catch (e) {
    console.warn('Unable to bootstrap admin:', e);
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, async firebaseUser => {
    if (!firebaseUser) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const adminUser = await getAdminUser(firebaseUser);
      if (!adminUser) {
        const isDriverRoute =
          window.location.pathname.startsWith('/driver') ||
          new URLSearchParams(window.location.search).get('mode') === 'driver';

        if (!isDriverRoute) {
          // If on admin view, check if this is a registered driver
          try {
            const driverSnap = await getDoc(doc(db, 'drivers', firebaseUser.uid));
            if (driverSnap.exists()) {
              setError('Driver account detected. Please use the Driver Portal to transmit telemetry.');
            } else {
              await signOut(auth);
              setError('This account is not authorized as a fleet administrator.');
            }
          } catch {
            await signOut(auth);
            setError('This account is not authorized as a fleet administrator.');
          }
        }
        setUser(null);
      } else {
        setUser(adminUser);
      }
    } catch (reason) {
      console.error('Unable to verify administrator access:', reason);
      setUser(null);
      setError('Unable to verify administrator access. Check Firebase configuration and Firestore rules.');
    } finally {
      setIsLoading(false);
    }
  }), []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const adminUser = await getAdminUser(credential.user);
      if (!adminUser) {
        await signOut(auth);
        setError('This account is not authorized as a fleet administrator.');
        return false;
      }
      setUser(adminUser);
      return true;
    } catch (reason: any) {
      console.error('Administrator sign-in failed:', reason);
      const code = reason?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError('Invalid email or password. If you do not have an account, create one below.');
      } else {
        setError(reason?.message || 'Sign-in failed. Check your credentials and Firebase Authentication setup.');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const adminData = {
        email: credential.user.email || email,
        name: name?.trim() || 'Fleet Administrator',
        role: 'admin',
        createdAt: Date.now(),
      };
      await setDoc(doc(db, 'admins', credential.user.uid), adminData);
      setUser({
        uid: credential.user.uid,
        email: adminData.email,
        name: adminData.name,
        role: 'admin',
      });
      return true;
    } catch (reason: any) {
      console.error('Administrator registration failed:', reason);
      setError(reason?.message || 'Registration failed. Check your details and try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      signup,
      logout,
      isLoading,
      error,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
