import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Upload, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface DriverQrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export default function DriverQrScanner({ isOpen, onClose, onScanSuccess }: DriverQrScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        decodedText => {
          handleSuccess(decodedText);
        },
        _error => {
          // Non-critical scan failure while searching for QR in frames
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera QR start error:', err);
      setIsScanning(false);
      setCameraError(
        err?.message ||
          'Camera access failed. Please ensure camera permissions are granted or upload an image file instead.'
      );
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping QR scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleSuccess = async (decodedText: string) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {
        // ignore
      }
    }
    setScanSuccessMessage('QR Code detected successfully!');
    await stopScanner();
    setTimeout(() => {
      onScanSuccess(decodedText);
      onClose();
    }, 600);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCameraError(null);
      const html5QrCode = scannerRef.current || new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      const decodedText = await html5QrCode.scanFile(file, true);
      handleSuccess(decodedText);
    } catch (err: any) {
      console.error('File QR scan error:', err);
      setCameraError('Could not find a valid QR code in the selected image. Please try another image.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleSuccess(manualCode.trim());
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure the DOM node #qr-reader is mounted
      const t = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(t);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-md bg-trackx-900 border border-trackx-600 rounded-3xl p-6 shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-trackx-700">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center text-accent-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Scan Vehicle QR</h3>
              <p className="text-xs text-trackx-400">Point phone camera at the invite QR</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-trackx-800 hover:bg-trackx-700 flex items-center justify-center text-trackx-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="mt-4 flex flex-col items-center">
          {scanSuccessMessage ? (
            <div className="w-full py-12 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-16 h-16 text-accent-400 animate-bounce mb-3" />
              <p className="text-white font-bold text-lg">{scanSuccessMessage}</p>
              <p className="text-xs text-trackx-400 mt-1">Linking vehicle to your driver profile...</p>
            </div>
          ) : (
            <>
              {/* Camera Viewfinder Viewport */}
              <div className="w-full relative rounded-2xl overflow-hidden bg-black aspect-square border-2 border-accent-500/40 shadow-inner flex items-center justify-center">
                <div id="qr-reader" className="w-full h-full" />

                {/* Target Overlay Lines */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-60 h-60 border-2 border-accent-400/80 rounded-2xl relative animate-pulse">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-accent-400" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-accent-400" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-accent-400" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-accent-400" />
                  </div>
                </div>
              </div>

              {cameraError && (
                <div className="w-full mt-3 p-3 bg-danger-500/15 border border-danger-500/30 rounded-xl text-danger-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{cameraError}</p>
                    <button
                      onClick={startScanner}
                      className="mt-2 text-accent-400 underline font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry Camera
                    </button>
                  </div>
                </div>
              )}

              {/* Alternative Options: File Upload & Manual Input */}
              <div className="w-full mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 bg-trackx-800 hover:bg-trackx-700 border border-trackx-600 rounded-xl text-trackx-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 text-accent-400" />
                    Upload QR Image
                  </button>
                </div>

                <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    placeholder="Or type Tracking ID (e.g. TRK-101)"
                    className="flex-1 px-3 py-2.5 bg-trackx-800 border border-trackx-600 rounded-xl text-white text-xs placeholder-trackx-500 font-mono focus:outline-none focus:ring-1 focus:ring-accent-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-accent-500 hover:bg-accent-400 text-trackx-900 font-bold text-xs rounded-xl transition-all"
                  >
                    Link
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

