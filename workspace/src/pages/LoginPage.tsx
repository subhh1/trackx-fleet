import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Shield, AlertCircle, UserPlus, LogIn, Navigation, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login, signup, isLoading, error: authError } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (isRegistering) {
      if (!name.trim()) {
        setError('Please enter your full name');
        return;
      }
      await signup(email, password, name);
    } else {
      await login(email, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-trackx-900 p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-info-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-400 mb-4">
            <MapPin className="w-8 h-8 text-trackx-900" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TRACKX</h1>
          <p className="text-trackx-300 mt-2">Fleet Tracking Management System</p>
        </div>

        {/* Login / Register Card */}
        <div className="glass rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent-500" />
              <h2 className="text-lg font-semibold text-white">
                {isRegistering ? 'Create Admin Account' : 'Administrator Login'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-xs text-accent-400 hover:text-accent-300 underline transition-colors"
            >
              {isRegistering ? 'Sign In Instead' : 'Create Admin Account'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-sm font-medium text-trackx-200 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-trackx-800 border border-trackx-600 rounded-xl text-white placeholder-trackx-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all"
                  placeholder="Fleet Administrator"
                  required={isRegistering}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-trackx-200 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-trackx-800 border border-trackx-600 rounded-xl text-white placeholder-trackx-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all"
                placeholder="admin@trackx.io"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-trackx-200 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-trackx-800 border border-trackx-600 rounded-xl text-white placeholder-trackx-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {(error || authError) && (
              <div className="flex items-center gap-2 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-danger-500 flex-shrink-0" />
                <p className="text-sm text-danger-500">{error || authError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-accent-500 to-accent-400 text-trackx-900 font-semibold rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-500/50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isRegistering ? 'Registering...' : 'Signing in...'}
                </span>
              ) : isRegistering ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-3 bg-trackx-800/50 rounded-xl border border-trackx-600/50">
            <p className="text-xs text-trackx-300 text-center">
              Protected by Firebase Authentication (Email / Password).
            </p>
          </div>
        </div>

        {/* Switch to Driver Portal */}
        <div className="mt-6">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-500/10 via-trackx-800/80 to-accent-400/10 border border-accent-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="text-left">
              <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-accent-400" />
                Are you a Driver?
              </p>
              <p className="text-xs text-trackx-400 mt-0.5">Sign in to driver account, scan QR code, and broadcast live GPS.</p>
            </div>
            <a
              href="/driver"
              className="w-full sm:w-auto px-4 py-2.5 bg-accent-500 hover:bg-accent-400 text-trackx-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-accent-500/20 transition-all flex-shrink-0"
            >
              Driver Login & QR
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <p className="text-center text-trackx-400 text-xs mt-6">
          TRACKX Fleet Management • Powered by Firebase & Firestore
        </p>
      </div>
    </div>
  );
}
