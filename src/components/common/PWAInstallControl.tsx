import React, { useState } from 'react';
import { Download, WifiOff, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../../hooks/usePWA';

interface PWAInstallButtonProps {
  onOpenInstallGuide?: () => void;
  variant?: 'header' | 'compact';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenInstallGuide,
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, isOfflineReady, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    if (onOpenInstallGuide) {
      onOpenInstallGuide();
      return;
    }
    if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={
          isInstallable
            ? 'Klik untuk langsung menginstal Aplikasi Rapor ke Laptop / Desktop (Mode Offline)'
            : 'Buka menu Instalasi Laptop & Unduh Mode Offline'
        }
        className={
          className ||
          (variant === 'compact'
            ? 'inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer'
            : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:via-indigo-500 hover:to-emerald-500 text-white text-xs font-black shadow-xs transition-all hover:scale-102 cursor-pointer ring-1 ring-blue-400/40')
        }
      >
        <Download size={12} className="text-amber-300" />
        <span className="tracking-wide">
          {isInstallable ? 'INSTAL DI LAPTOP' : 'MODE OFFLINE / INSTAL'}
        </span>
        {isOfflineReady && (
          <CheckCircle2 size={11} className="text-emerald-300 shrink-0" />
        )}
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-slate-800">
            <h3 className="text-lg font-semibold text-slate-900">Instal di iPhone / iPad</h3>
            <p className="mt-2 text-sm text-slate-600">
              1. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah Safari.<br />
              2. Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-800 hover:bg-slate-200 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xl border border-amber-400/60 print:hidden">
      <WifiOff size={14} className="shrink-0 animate-pulse" />
      <span>Mode Offline Aktif — Data tersimpan &amp; berjalan lokal di laptop.</span>
    </div>
  );
};
