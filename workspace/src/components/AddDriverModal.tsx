import React, { useState, useEffect } from 'react';
import { useFleet } from '../contexts/FleetContext';
import { RegistrationToken } from '../types';
import QRCode from 'qrcode';
import { X, UserPlus, Download, Copy, Check, AlertCircle, Link, Share2 } from 'lucide-react';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddDriverModal({ isOpen, onClose }: AddDriverModalProps) {
  const { addDriver } = useFleet();
  const [driverName, setDriverName] = useState('');
  const [token, setToken] = useState<RegistrationToken | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const driverUrl = token
    ? `${window.location.origin}/driver?token=${token.token}&id=${token.trackingId}&name=${encodeURIComponent(token.driverName)}`
    : '';

  useEffect(() => {
    if (token) {
      const url = `${window.location.origin}/driver?token=${token.token}&id=${token.trackingId}&name=${encodeURIComponent(token.driverName)}`;

      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: { dark: '#0a0e17', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }).then(u => setQrDataUrl(u));
    }
  }, [token]);

  const handleGenerate = async () => {
    if (!driverName.trim()) {
      setError('Please enter a driver name');
      return;
    }
    if (driverName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setError('');
    setIsCreating(true);
    try {
      const newToken = await addDriver(driverName.trim());
      setToken(newToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create registration QR code.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `TRACKX_${token?.trackingId}_Driver_Invite.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handleCopyLink = () => {
    if (!driverUrl) return;
    navigator.clipboard.writeText(driverUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleReset = () => {
    setDriverName('');
    setToken(null);
    setQrDataUrl('');
    setError('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose}></div>

      <div className="relative w-full max-w-md glass rounded-2xl p-6 max-h-[90vh] overflow-y-auto border border-trackx-600/70 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Add Driver</h2>
              <p className="text-xs text-trackx-400">Invite driver to stream live GPS</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-trackx-700 flex items-center justify-center hover:bg-trackx-600 transition-colors"
          >
            <X className="w-4 h-4 text-trackx-300" />
          </button>
        </div>

        {!token ? (
          /* Step 1: Enter name */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-trackx-200 mb-1.5">Driver Full Name</label>
              <input
                type="text"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-4 py-3 bg-trackx-800 border border-trackx-600 rounded-xl text-white placeholder-trackx-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-danger-500 flex-shrink-0" />
                <p className="text-sm text-danger-500">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isCreating}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-accent-500 to-accent-400 text-trackx-900 font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent-500/20"
            >
              {isCreating ? 'Generating Invite...' : 'Generate Driver Invite & QR Code'}
            </button>
          </div>
        ) : (
          /* Step 2: Show QR code & Link */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 flex flex-col items-center shadow-inner">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Driver Registration QR Code" className="w-56 h-56" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-trackx-900 border-t-transparent rounded-full"></div>
                </div>
              )}
              <div className="mt-3 text-center">
                <p className="text-trackx-900 font-bold text-base">{token.driverName}</p>
                <p className="text-trackx-900/70 font-mono text-xs font-semibold">{token.trackingId}</p>
              </div>
            </div>

            {/* Quick Share Link */}
            <div className="bg-trackx-800/70 rounded-xl p-3 border border-trackx-600">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-trackx-300 flex items-center gap-1">
                  <Link className="w-3.5 h-3.5 text-accent-400" />
                  Driver Mobile Link
                </span>
                <span className="text-[10px] text-accent-400 font-mono">No App Install Needed</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={driverUrl}
                  className="text-xs font-mono text-trackx-200 bg-trackx-900/80 px-2.5 py-2 rounded-lg truncate flex-1 border border-trackx-700 select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-lg bg-accent-500 text-trackx-900 font-semibold text-xs hover:bg-accent-400 transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-warning-500/10 border border-warning-500/20 rounded-xl p-3">
              <p className="text-xs text-warning-400">
                📱 The driver points any phone camera at this QR code or opens the link to start streaming GPS live to your map.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-accent-500 to-accent-400 text-trackx-900 font-semibold rounded-xl hover:opacity-90 transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                Download QR
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 px-4 bg-trackx-700 text-white font-medium rounded-xl hover:bg-trackx-600 transition-all text-sm"
              >
                Add Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
