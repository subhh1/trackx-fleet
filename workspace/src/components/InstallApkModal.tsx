import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  X,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

interface InstallApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
}

export default function InstallApkModal({ isOpen, onClose, deferredPrompt }: InstallApkModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [installSuccess, setInstallSuccess] = useState(false);

  const driverLiveUrl = 'https://track-x-fleet-902f6.web.app/driver';
  const pwaBuilderUrl = `https://www.pwabuilder.com/?site=${encodeURIComponent('https://track-x-fleet-902f6.web.app')}`;

  useEffect(() => {
    QRCode.toDataURL(driverLiveUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#0a0e17', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(u => setQrCodeUrl(u));
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstallSuccess(true);
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      // Fallback instructions
      alert(
        "To install on your Android phone:\n1. Open this page in Chrome\n2. Tap the ⋮ (three dots) menu in the top right\n3. Tap 'Install App' or 'Add to Home Screen'\nAndroid will mint and install the native WebAPK package!"
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-md bg-trackx-900 border border-trackx-600 rounded-3xl p-6 shadow-2xl overflow-hidden z-10 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-trackx-700">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center text-trackx-900 font-bold shadow-md shadow-accent-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Install Phone App (APK)</h3>
              <p className="text-xs text-trackx-400">TRACKX Driver Mobile Installer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-trackx-800 hover:bg-trackx-700 flex items-center justify-center text-trackx-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {installSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-16 h-16 text-accent-400 animate-bounce mb-3" />
            <h4 className="text-lg font-bold text-white">App Installed Successfully!</h4>
            <p className="text-xs text-trackx-400 mt-1">
              You can now launch TRACKX Driver directly from your Android phone home screen or app drawer.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Option 1: Native 1-Tap Phone Install */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-500/20 via-trackx-800/80 to-accent-400/15 border-2 border-accent-400/60 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-accent-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-accent-400 animate-pulse" />
                  Direct Phone Installation
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-500/20 text-accent-300 font-bold">
                  Signed WebAPK
                </span>
              </div>
              <p className="text-xs text-trackx-200 mb-3">
                Do not download third-party unsigned ZIPs. Install directly from your phone browser — Google automatically certifies and signs the app package for Android.
              </p>
              <button
                onClick={handleNativeInstall}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-accent-500 to-accent-400 text-trackx-900 font-extrabold rounded-xl hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent-500/30 text-sm"
              >
                <Download className="w-4 h-4" />
                {deferredPrompt ? 'Tap to Install on Phone' : 'Install Directly to Home Screen'}
              </button>
            </div>

            {/* Simple Step-by-Step Instructions */}
            <div className="p-4 rounded-2xl bg-trackx-800/70 border border-trackx-700">
              <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-accent-400" />
                3-Step Direct Phone Setup:
              </h4>
              <ol className="text-xs text-trackx-300 space-y-2 list-decimal list-inside">
                <li>
                  Open Chrome or Edge on your phone and go to:
                  <div className="mt-1 font-mono text-[11px] text-accent-400 bg-trackx-900/80 p-2 rounded-lg border border-trackx-700 select-all">
                    https://track-x-fleet-902f6.web.app/driver
                  </div>
                </li>
                <li>
                  Tap the <strong className="text-white">⋮ (three vertical dots)</strong> menu in the top right of Chrome.
                </li>
                <li>
                  Tap <strong className="text-accent-400">"Install app"</strong> (or <strong className="text-accent-400">"Add to Home screen"</strong>).
                </li>
              </ol>
              <p className="text-[11px] text-trackx-400 mt-2.5 pt-2 border-t border-trackx-700/60">
                ✅ This generates an official Google Play signed package that installs without "Package appears to be invalid" errors!
              </p>
            </div>

            {/* Option 3: Scan QR to Open on Mobile */}
            <div className="p-4 rounded-2xl bg-trackx-800/40 border border-trackx-700/60 flex flex-col items-center text-center">
              <p className="text-xs font-bold text-white mb-1">Testing on Computer? Open on Phone</p>
              <p className="text-[11px] text-trackx-400 mb-3">
                Scan with your phone's camera to open the Driver Portal and install immediately:
              </p>
              {qrCodeUrl && (
                <div className="bg-white p-2.5 rounded-xl shadow-md">
                  <img src={qrCodeUrl} alt="Open on phone" className="w-36 h-36" />
                </div>
              )}
              <p className="text-[10px] text-trackx-400 mt-2 font-mono truncate max-w-full">
                {driverLiveUrl}
              </p>
            </div>

            {/* Chrome Instructions hint */}
            <div className="p-3 rounded-xl bg-trackx-800/30 border border-trackx-700/40 flex items-start gap-2 text-[11px] text-trackx-400">
              <Info className="w-4 h-4 text-accent-400 flex-shrink-0 mt-0.5" />
              <span>
                On Android Chrome: You can also tap the <strong>⋮ (three dots)</strong> menu in the top-right corner and select <strong>"Install app"</strong>.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

