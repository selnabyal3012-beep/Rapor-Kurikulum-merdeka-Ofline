import React, { useState } from 'react';
import {
  Download,
  HardDrive,
  WifiOff,
  Wifi,
  CheckCircle2,
  X,
  Laptop,
  ShieldCheck,
  Sparkles,
  Share2,
  Copy,
  Check,
  ExternalLink,
  FileDown,
  AlertCircle
} from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { useApp } from '../../context/AppContext';
import { downloadFullAppBundleHtml } from '../../utils/htmlExportHelper';

interface InstallPcModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPcModal: React.FC<InstallPcModalProps> = ({ isOpen, onClose }) => {
  const { db, showSaveNotification } = useApp();
  const {
    isOnline,
    isInstallable,
    isInstalled,
    isInIframe,
    isOfflineReady,
    isIOS,
    triggerInstall
  } = usePWA();
  const [activeTab, setActiveTab] = useState<'chrome' | 'edge' | 'offline_guide' | 'share_other' | 'make_exe'>('chrome');
  const [copiedLink, setCopiedLink] = useState(false);
  const [installSuccessMessage, setInstallSuccessMessage] = useState<string | null>(null);
  const [installInfoMessage, setInstallInfoMessage] = useState<string | null>(null);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleInstallClick = async () => {
    setInstallInfoMessage(null);
    if (isInstallable) {
      const success = await triggerInstall();
      if (success) {
        setInstallSuccessMessage('Aplikasi berhasil dipasang di laptop Anda! Silakan cek Desktop atau menu Start komputer Anda.');
        showSaveNotification('Aplikasi Rapor berhasil dipasang di laptop!');
        return;
      }
    }

    if (isInIframe) {
      setInstallInfoMessage(
        'Saat ini aplikasi sedang dibuka di dalam jendela pratinjau (iframe). Klik tombol "Buka di Tab Baru" di bawah agar browser Chrome/Edge dapat memunculkan jendela Instal ke Laptop, ATAU klik "Unduh File Offline (.html)" untuk langsung menyimpan versi offline di laptop.'
      );
    } else if (isIOS) {
      setInstallInfoMessage(
        'Pada perangkat Apple Safari, klik tombol Bagikan (Share) lalu pilih "Add to Home Screen" / "Tambahkan ke Layar Utama".'
      );
    } else {
      setInstallInfoMessage(
        'Jika jendela instalasi otomatis belum muncul, silakan ikuti langkah 1-2-3 di tab Chrome/Edge di bawah (klik menu ⋮ -> Instal Halaman Ini sebagai Aplikasi) atau unduh versi File Offline (.html).'
      );
    }
    setActiveTab('chrome');
  };

  const handleDownloadOfflineHtml = async () => {
    try {
      setIsDownloadingOffline(true);
      await downloadFullAppBundleHtml(db);
      setInstallSuccessMessage(
        'File Aplikasi Offline (.html) beserta seluruh data sekolah Anda berhasil diunduh! Simpan file tersebut di Desktop atau Flashdisk laptop dan buka kapan saja tanpa internet.'
      );
      showSaveNotification('File Aplikasi Offline (.html) berhasil diunduh ke laptop!');
    } catch (err) {
      console.error('Gagal mengunduh file offline:', err);
      setInstallInfoMessage('Gagal menyiapkan file offline HTML. Silakan coba lagi.');
    } finally {
      setIsDownloadingOffline(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-800 via-indigo-900 to-slate-900 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg border border-white/20 shrink-0">
              <Laptop size={32} className="text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <ShieldCheck size={13} /> PWA Standalone • Siap Digunakan Tanpa Internet
                </span>
                {isOfflineReady && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                    <CheckCircle2 size={12} /> Cache Offline Aktif
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Instal Aplikasi Rapor di Laptop / Komputer
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 mt-1">
                Gunakan aplikasi secara penuh baik saat <strong>ONLINE</strong> maupun <strong>OFFLINE</strong> (tanpa sambungan internet) di SD Negeri Balil.
              </p>
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-300">Status Jaringan Laptop:</span>
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <Wifi size={13} /> ONLINE (Terhubung Internet)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-400/30">
                  <WifiOff size={13} /> OFFLINE (Bekerja Tanpa Internet)
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-300 flex items-center gap-1">
              <HardDrive size={13} className="text-sky-300" />
              Penyimpanan: <strong>Lokal di Laptop (Offline Storage)</strong>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-sm text-slate-700">
          {installSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              <span>{installSuccessMessage}</span>
            </div>
          )}

          {installInfoMessage && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="leading-relaxed font-medium">{installInfoMessage}</p>
                {isInIframe && currentUrl && (
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
                  >
                    <ExternalLink size={13} />
                    <span>Buka di Tab Browser Penuh untuk Instal</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Highlight Offline Box */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 flex items-start gap-3">
            <WifiOff size={22} className="text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-emerald-900 text-sm">
                Keuntungan Mode OFFLINE (Tanpa Internet) di Laptop:
              </h4>
              <p className="text-emerald-800 leading-relaxed">
                Di daerah pedalaman seperti Balil - Oksibil, koneksi internet sering tidak stabil atau padam listrik. Dengan memasang aplikasi ini di laptop:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-emerald-900 font-medium pt-1">
                <li>Bisa mengisi nilai seluruh mata pelajaran tanpa kuota/sinyal.</li>
                <li>Bisa mencetak rapor peserta didik dan rapor P5 langsung ke printer atau file PDF.</li>
                <li>Semua data otomatis tersimpan di laptop dan tidak akan hilang.</li>
                <li>Bisa melakukan Backup database ke file untuk dicadangkan di flashdisk.</li>
              </ul>
            </div>
          </div>

          {/* Action Panel 1: PWA Install to Laptop Desktop / Start Menu */}
          {isInstalled ? (
            <div className="p-4 rounded-xl bg-emerald-900 text-white flex items-center gap-3 border border-emerald-500/40">
              <CheckCircle2 size={24} className="text-emerald-300 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-white">Aplikasi Sudah Terpasang di Laptop Anda</h4>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Anda sedang menjalankan versi aplikasi desktop mandiri (Standalone PWA) yang siap dipakai offline kapan saja.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Laptop size={17} className="text-amber-400" />
                  <span>Pasang Langsung ke Desktop Laptop (PWA)</span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isInstallable
                    ? 'Browser laptop Anda sudah siap! Klik tombol di samping untuk menginstal ikon ke Desktop & Menu Start.'
                    : 'Klik untuk memasang aplikasi ke Desktop & Menu Start agar bisa dibuka tanpa internet.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all hover:scale-105 cursor-pointer"
                >
                  <Download size={16} />
                  <span>{isInstallable ? 'INSTAL DI LAPTOP SEKARANG' : 'PASANG / INSTAL SEKARANG'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Panel 2: Download Single-File Offline HTML Application */}
          <div className="p-4 rounded-xl bg-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-700/60">
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <FileDown size={17} className="text-cyan-300" />
                <span>Unduh File Aplikasi Offline Lengkap (.html)</span>
              </h4>
              <p className="text-xs text-indigo-100 mt-0.5">
                Simpan 1 file aplikasi lengkap beserta seluruh data siswa &amp; nilai ke hard disk/flashdisk. Cukup klik 2x file-nya di laptop, <strong>100% langsung jalan tanpa internet &amp; tanpa instalasi tambahan</strong>!
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadOfflineHtml}
              disabled={isDownloadingOffline}
              className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all hover:scale-105 cursor-pointer disabled:opacity-60"
            >
              <FileDown size={16} />
              <span>{isDownloadingOffline ? 'MENYIAPKAN FILE...' : 'UNDUH OFFLINE (.HTML)'}</span>
            </button>
          </div>

          {/* Tabs for Installation Guide */}
          <div>
            <div className="flex flex-wrap border-b border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('chrome')}
                className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'chrome'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Cara di Google Chrome
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edge')}
                className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'edge'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Cara di Microsoft Edge
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('offline_guide')}
                className={`px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'offline_guide'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. Panduan Bekerja Offline
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('share_other')}
                className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'share_other'
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Share2 size={13} />
                <span>4. Pasang di Laptop Lain</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('make_exe')}
                className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'make_exe'
                    ? 'border-amber-600 text-amber-700 bg-amber-50/50 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <HardDrive size={13} />
                <span>5. Buat File Setup .EXE</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-b-xl border border-t-0 border-slate-200 text-xs space-y-3">
              {activeTab === 'chrome' && (
                <div className="space-y-2">
                  <div className="font-bold text-slate-800">Langkah Pasang di Google Chrome (Laptop Windows / Mac):</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px] mb-1.5">1</span>
                      <p className="font-semibold text-slate-800">Buka di Tab Browser / Menu ⋮</p>
                      <p className="text-slate-500 text-[11px] mt-1">Pastikan terbuka di tab Google Chrome penuh, lalu klik ikon <strong>Instal (⊕)</strong> di bilah alamat atau klik titik tiga (<strong>⋮</strong>) di kanan atas.</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px] mb-1.5">2</span>
                      <p className="font-semibold text-slate-800">Pilih &quot;Instal Aplikasi&quot;</p>
                      <p className="text-slate-500 text-[11px] mt-1">Pilih menu <strong>&quot;Simpan dan Bagikan&quot;</strong> / <strong>&quot;Transmisikan, simpan, dan bagikan&quot;</strong> lalu klik <strong>&quot;Instal Halaman Ini sebagai Aplikasi&quot;</strong>.</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold inline-flex items-center justify-center text-[10px] mb-1.5">3</span>
                      <p className="font-semibold text-slate-800">Selesai &amp; Buka Shortcut</p>
                      <p className="text-slate-500 text-[11px] mt-1">Ikon <strong>Rapor SD Balil</strong> akan muncul di Desktop laptop dan siap dibuka kapan saja tanpa internet.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'edge' && (
                <div className="space-y-2">
                  <div className="font-bold text-slate-800">Langkah Pasang di Microsoft Edge (Bawaan Windows 10 &amp; 11):</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold inline-flex items-center justify-center text-[10px] mb-1.5">1</span>
                      <p className="font-semibold text-slate-800">Klik Ikon Aplikasi / Titik Tiga</p>
                      <p className="text-slate-500 text-[11px] mt-1">Di bilah alamat (URL), klik ikon aplikasi bertanda tambah (+), atau klik menu titik tiga (<strong>...</strong>).</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold inline-flex items-center justify-center text-[10px] mb-1.5">2</span>
                      <p className="font-semibold text-slate-800">Pilih &quot;Aplikasi&quot; -&gt; &quot;Instal&quot;</p>
                      <p className="text-slate-500 text-[11px] mt-1">Klik <strong>&quot;Instal situs ini sebagai aplikasi&quot;</strong> dan beri nama <strong>Rapor SD Balil</strong>.</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold inline-flex items-center justify-center text-[10px] mb-1.5">3</span>
                      <p className="font-semibold text-slate-800">Centang &quot;Pin to taskbar&quot;</p>
                      <p className="text-slate-500 text-[11px] mt-1">Beri tanda centang untuk menampilkan di Desktop dan Taskbar laptop agar mudah diakses.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'offline_guide' && (
                <div className="space-y-2.5">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600" />
                    Cara Menggunakan Saat Laptop Mati Internet / di Ruang Kelas:
                  </div>
                  <div className="space-y-1.5 text-slate-700 text-xs">
                    <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>1. Buka Shortcut di Desktop atau File .HTML Offline:</strong> Nyalakan laptop, tidak perlu menghubungkan ke WiFi/modem. Klik ganda ikon Rapor SD Balil.</span>
                    </div>
                    <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>2. Input Nilai &amp; Rapor Seperti Biasa:</strong> Semua data siswa, nilai, capaian TP, dan catatan wali kelas akan otomatis disimpan di hard disk laptop.</span>
                    </div>
                    <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>3. Cetak Rapor Langsung:</strong> Tekan menu Cetak Rapor, pilih siswa, dan klik tombol cetak. Hasil dapat dicetak ke kertas atau disimpan sebagai PDF.</span>
                    </div>
                    <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>4. Cadangkan ke Flashdisk:</strong> Buka menu <em>Backup &amp; Restore DB</em> untuk mengunduh salinan database ke flashdisk bapak/ibu guru.</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'share_other' && (
                <div className="space-y-3">
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <Laptop size={15} className="text-indigo-600" />
                    <span>Cara Memasang di Laptop Rekan Guru Lain:</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Anda dapat membagikan file <strong>Unduh Offline (.html)</strong> lewat Flashdisk/WhatsApp, atau kirimkan tautan aplikasi ini ke laptop rekan Anda:
                  </p>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <span className="flex-1 font-mono text-[11px] text-slate-700 truncate select-all">
                      {currentOrigin || '-'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (currentOrigin) {
                          navigator.clipboard?.writeText(currentOrigin);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2500);
                        }
                      }}
                      className="px-2.5 py-1 bg-indigo-600 text-white rounded-md text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
                    </button>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-slate-700">
                    <p><strong>Langkah 1:</strong> Buka link tersebut di Google Chrome atau Microsoft Edge laptop rekan guru.</p>
                    <p><strong>Langkah 2:</strong> Klik tombol <strong>MODE OFFLINE / INSTAL</strong> di pojok kanan atas.</p>
                    <p><strong>Langkah 3:</strong> Klik Instal di Laptop atau Unduh File Offline (.html). Aplikasi langsung siap dipakai offline!</p>
                  </div>
                </div>
              )}

              {activeTab === 'make_exe' && (
                <div className="space-y-3.5">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5 text-sm">
                    <HardDrive size={16} className="text-amber-600" />
                    <span>Panduan Menjadikan Aplikasi Ini File Installer Setup (.exe):</span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 text-xs text-slate-700 space-y-2">
                    <p className="font-semibold text-slate-900">
                      Ada 2 Cara untuk memiliki aplikasi ini dalam bentuk mandiri di Komputer Windows:
                    </p>

                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="font-bold text-emerald-900">
                        Cara 1: Setup Otomatis (PWA Standalone) atau File Offline (.html) — Direkomendasikan
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
                        Aplikasi ini sudah dilengkapi <strong>Service Worker Offline (PWA)</strong> dan eksport <strong>File Offline (.html)</strong>. Klik tombol <strong>&quot;INSTAL DI LAPTOP SEKARANG&quot;</strong> untuk memasang shortcut ke Desktop Windows, atau klik <strong>&quot;UNDUH OFFLINE (.HTML)&quot;</strong> untuk menyimpan aplikasi dalam 1 file ke Flashdisk.
                      </p>
                    </div>

                    <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                      <p className="font-bold text-blue-900">
                        Cara 2: Membuat File Fisik &quot;Setup_Rapor.exe&quot; (Opsional)
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-900 font-medium pl-1">
                        <li>Jalankan perintah <code>npm run build</code> untuk menghasilkan folder <code>dist</code>.</li>
                        <li>
                          Bungkus dengan Nativefier / Electron Builder:
                          <pre className="bg-slate-900 text-amber-300 p-2 rounded-md font-mono text-[10px] my-1 overflow-x-auto">
{`npx nativefier --name "Rapor SD Balil" --icon public/icon-512.png ${currentOrigin || 'http://localhost:3000'}`}
                          </pre>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              SD Negeri Balil • Kurikulum Merdeka Terintegrasi
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Tutup Jendela
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
