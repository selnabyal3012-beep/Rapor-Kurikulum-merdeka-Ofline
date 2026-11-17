import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, UserPlus, LogIn, Laptop } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAccount } from '../../types';
import { auth } from '../../services/firebase';
import { usePWA } from '../../hooks/usePWA';
import { InstallPcModal } from './InstallPcModal';
import operatorSelpiusImg from '../../assets/operator-selpius.png';

interface LoginRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
  lockUntilLogin?: boolean;
}

export const LoginRegisterModal: React.FC<LoginRegisterModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
  lockUntilLogin = false
}) => {
  const { db, login, registerUser, currentUser, loginWithGoogle } = useApp();
  const { isInstallable, isInstalled, triggerInstall } = usePWA();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Form states matching desktop login layout
  const [username, setUsername] = useState('SelNab');
  const [password, setPassword] = useState('SelNab');
  const [selectedOperator, setSelectedOperator] = useState('Selpius Nabyal,S.Pd');
  const [hidePassword, setHidePassword] = useState(true);

  // Register form states
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regNama, setRegNama] = useState('');
  const [regRole, setRegRole] = useState<'Administrator' | 'Wali Kelas' | 'Guru Mapel' | 'Kepala Sekolah'>('Wali Kelas');
  const [regNip, setRegNip] = useState('');

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setMessage(null);
    }
  }, [isOpen, defaultMode]);

  if (!isOpen) return null;

  const operatorOptions = [
    { label: 'Selpius Nabyal,S.Pd', username: 'SelNab' },
    ...db.users
      .filter((u) => u.username.toLowerCase() !== 'selnab')
      .map((u) => ({
        label: u.namaLengkap,
        username: u.username
      }))
  ];

  const handleOperatorChange = (label: string) => {
    setSelectedOperator(label);
    const matched = operatorOptions.find((op) => op.label === label);
    if (matched) {
      setUsername(matched.username);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = login(username, password);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      setTimeout(() => {
        onClose();
      }, 650);
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  const handleBatal = () => {
    setUsername('');
    setPassword('');
    setMessage(null);
  };

  const handleCloseOrKeluar = () => {
    if (lockUntilLogin) {
      setMessage({
        text: 'Silakan masukkan Username dan Password lalu klik tombol "Masuk" untuk membuka menu Aplikasi Rapor.',
        type: 'error'
      });
      return;
    }
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!regUsername.trim() || !regPassword.trim() || !regNama.trim()) {
      setMessage({ text: 'Mohon lengkapi username, password, dan nama lengkap!', type: 'error' });
      return;
    }

    const newUser: UserAccount = {
      username: regUsername.trim(),
      password: regPassword,
      namaLengkap: regNama.trim(),
      role: regRole,
      nip: regNip.trim() || '-',
      createdAt: new Date().toISOString().slice(0, 10)
    };

    const res = registerUser(newUser);
    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      setUsername(newUser.username);
      setPassword(newUser.password);
      setSelectedOperator(newUser.namaLengkap);
      setTimeout(() => {
        setMode('login');
        setMessage(null);
      }, 900);
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="bg-[#404040] w-full max-w-[660px] shadow-2xl border-2 border-[#d4d0c8] overflow-hidden">
        {/* Classic Top Window Title Bar */}
        <div className="bg-[#f3f3f3] border-b border-[#b8b8b8] h-8 pl-3 flex items-center justify-between select-none">
          <span className="text-xs font-semibold text-slate-700 tracking-tight">
            {mode === 'login' ? 'Login Aplikasi Rapor Kurikulum Merdeka' : 'Daftar Akun Guru Baru'}
          </span>
          <button
            type="button"
            onClick={handleCloseOrKeluar}
            aria-label="Tutup jendela login"
            className="w-9 h-full flex items-center justify-center text-slate-700 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Full-Width Black Banner with Exact Cyan Title */}
        <div className="bg-black border-b border-[#5b5b5b] px-3 sm:px-5 py-2.5 text-center">
          <h2 className="text-[#00FFFF] font-extrabold text-sm sm:text-[18px] tracking-tight leading-snug uppercase">
            SELAMAT DATANG KANTI EBKIN A APLIKASI RAPOR DAM YANANDIM ATI
          </h2>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="bg-[#404040]">
            {/* Subheading */}
            <div className="pt-3 pb-1 px-4 text-center">
              <p className="text-[#00FFFF] font-bold text-sm sm:text-base tracking-tight">
                Silahkan Masukkan Username dan Password
              </p>
            </div>

            {/* Status Feedback Message */}
            {message && (
              <div className="px-6 pt-2">
                <div
                  className={`px-3 py-2 text-xs font-semibold flex items-center gap-2 border ${
                    message.type === 'success'
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                      : 'bg-rose-950/90 border-rose-400 text-rose-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle size={15} className="shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle size={15} className="shrink-0 text-rose-400" />
                  )}
                  <span>{message.text}</span>
                </div>
              </div>
            )}

            {/* Main Two-Column Desktop Body */}
            <div className="px-5 sm:px-7 pt-3 pb-4 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Left Form Controls */}
              <div className="flex-1 w-full space-y-3">
                {/* Username Row */}
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="login-username"
                    className="w-28 shrink-0 text-[#00FFFF] font-bold text-sm sm:text-base tracking-tight"
                  >
                    Username
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="SelNab"
                    className="flex-1 min-w-0 bg-white text-black font-bold text-sm sm:text-base px-2.5 py-1.5 border-2 border-t-[#6e6e6e] border-l-[#6e6e6e] border-r-[#f2f2f2] border-b-[#f2f2f2] focus:outline-hidden"
                  />
                </div>

                {/* Password Row */}
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="login-password"
                    className="w-28 shrink-0 text-[#00FFFF] font-bold text-sm sm:text-base tracking-tight"
                  >
                    Password
                  </label>
                  <input
                    id="login-password"
                    type={hidePassword ? 'password' : 'text'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="flex-1 min-w-0 bg-white text-black font-bold text-sm sm:text-base px-2.5 py-1.5 border-2 border-t-[#6e6e6e] border-l-[#6e6e6e] border-r-[#f2f2f2] border-b-[#f2f2f2] focus:outline-hidden"
                  />
                </div>

                {/* Operator Select Row */}
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="login-operator"
                    className="w-28 shrink-0 text-[#00FFFF] font-bold text-sm sm:text-base tracking-tight"
                  >
                    Operator
                  </label>
                  <select
                    id="login-operator"
                    value={selectedOperator}
                    onChange={(e) => handleOperatorChange(e.target.value)}
                    className="flex-1 min-w-0 bg-white text-black font-bold text-sm sm:text-base px-2 py-1.5 border-2 border-t-[#6e6e6e] border-l-[#6e6e6e] border-r-[#f2f2f2] border-b-[#f2f2f2] focus:outline-hidden cursor-pointer"
                  >
                    {operatorOptions.map((op) => (
                      <option key={op.username} value={op.label}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sembunyikan Password Checkbox */}
                <div className="pt-0.5 flex items-center gap-2">
                  <input
                    id="toggle-hide-password"
                    type="checkbox"
                    checked={hidePassword}
                    onChange={(e) => setHidePassword(e.target.checked)}
                    className="w-4 h-4 accent-[#1f2937] cursor-pointer"
                  />
                  <label
                    htmlFor="toggle-hide-password"
                    className="text-[#00FFFF] font-bold text-sm sm:text-base tracking-tight cursor-pointer select-none"
                  >
                    Sembunyikan Password
                  </label>
                </div>
              </div>

              {/* Right Portrait Photo & Caption */}
              <div className="w-[132px] shrink-0 flex flex-col items-center">
                <div className="w-[132px] h-[182px] border border-[#e2e2e2] ring-1 ring-[#686868] bg-black overflow-hidden shadow-md">
                  <img
                    src={operatorSelpiusImg}
                    alt="Oleh: Selpius Nabyal, S.Pd"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <span className="mt-1.5 text-[#00FFFF] font-bold text-[11px] text-center leading-tight">
                  Oleh: {selectedOperator || 'Selpius Nabyal,S.Pd'}
                </span>
              </div>
            </div>

            {/* Bottom Three Beveled Black + Cyan Buttons */}
            <div className="px-5 sm:px-10 pb-4 grid grid-cols-3 gap-4 sm:gap-7">
              <button
                type="submit"
                className="bg-black hover:bg-[#141414] text-[#00FFFF] font-extrabold text-sm sm:text-base py-1.5 border-2 border-t-[#f0f0f0] border-l-[#f0f0f0] border-r-[#7a7a7a] border-b-[#7a7a7a] shadow-sm cursor-pointer active:translate-y-px transition-colors"
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={handleBatal}
                className="bg-black hover:bg-[#141414] text-[#00FFFF] font-extrabold text-sm sm:text-base py-1.5 border-2 border-t-[#f0f0f0] border-l-[#f0f0f0] border-r-[#7a7a7a] border-b-[#7a7a7a] shadow-sm cursor-pointer active:translate-y-px transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCloseOrKeluar}
                className="bg-black hover:bg-[#141414] text-[#00FFFF] font-extrabold text-sm sm:text-base py-1.5 border-2 border-t-[#f0f0f0] border-l-[#f0f0f0] border-r-[#7a7a7a] border-b-[#7a7a7a] shadow-sm cursor-pointer active:translate-y-px transition-colors"
              >
                Keluar
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="bg-[#404040] px-6 py-4 space-y-3">
            <p className="text-[#00FFFF] font-bold text-sm text-center">
              Daftar Akun Operator / Guru Baru
            </p>

            {message && (
              <div
                className={`px-3 py-2 text-xs font-semibold flex items-center gap-2 border ${
                  message.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                    : 'bg-rose-950/90 border-rose-400 text-rose-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle size={15} className="shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle size={15} className="shrink-0 text-rose-400" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#00FFFF] mb-1">Nama Lengkap & Gelar:</label>
              <input
                type="text"
                required
                value={regNama}
                onChange={(e) => setRegNama(e.target.value)}
                placeholder="Contoh: Simon Kalakmabin, S.Pd."
                className="w-full bg-white text-black font-semibold px-2.5 py-1.5 text-xs border-2 border-t-[#6e6e6e] border-l-[#6e6e6e] border-r-[#f2f2f2] border-b-[#f2f2f2] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#00FFFF] mb-1">Username:</label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Username baru"
                  className="w-full bg-white text-black font-semibold px-2.5 py-1.5 text-xs border-2 border-t-[#6e6e6e] border-l-[#6e6e6e] border-r-[#f2f2f2] border-b-[#f2f2f2] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#00FFFF] mb-1">Password:</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Password baru"
                  className="w-full bg-white text-black font-semibold px-2.5 py-1.5 text-xs border-2 border-t-[#6e6e6e] border-l-[#6e6e6e] border-r-[#f2f2f2] border-b-[#f2f2f2] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#00FFFF] mb-1">Peran / Jabatan:</label>
                <select
                  value={regRole}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setRegRole(e.target.value as 'Administrator' | 'Wali Kelas' | 'Guru Mapel' | 'Kepala Sekolah')
                  }
                  className="w-full bg-white text-black font-semibold px-2.5 py-1.5 text-xs border-2 border-t-[#6e6e6e] border-l-[#6e6e6e] border-r-[#f2f2f2] border-b-[#f2f2f2] focus:outline-hidden"
                >
                  <option value="Wali Kelas">Wali Kelas</option>
                  <option value="Guru Mapel">Guru Mapel</option>
                  <option value="Administrator">Administrator</option>
                  <option value="Kepala Sekolah">Kepala Sekolah</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#00FFFF] mb-1">NIP (Opsional):</label>
                <input
                  type="text"
                  value={regNip}
                  onChange={(e) => setRegNip(e.target.value)}
                  placeholder="19XXXXXXXXXX atau -"
                  className="w-full bg-white text-black font-semibold px-2.5 py-1.5 text-xs border-2 border-t-[#6e6e6e] border-l-[#6e6e6e] border-r-[#f2f2f2] border-b-[#f2f2f2] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-4">
              <button
                type="submit"
                className="bg-black hover:bg-[#141414] text-[#00FFFF] font-extrabold text-sm py-1.5 border-2 border-t-[#f0f0f0] border-l-[#f0f0f0] border-r-[#7a7a7a] border-b-[#7a7a7a] cursor-pointer"
              >
                Simpan Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setMessage(null);
                }}
                className="bg-black hover:bg-[#141414] text-[#00FFFF] font-extrabold text-sm py-1.5 border-2 border-t-[#f0f0f0] border-l-[#f0f0f0] border-r-[#7a7a7a] border-b-[#7a7a7a] cursor-pointer"
              >
                Kembali ke Login
              </button>
            </div>
          </form>
        )}

        {/* Secondary Utility Bar (Daftar Akun & Cloud Google Login) */}
        <div className="bg-[#2b2b2b] border-t border-[#555555] px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 text-slate-300">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setMessage(null);
              }}
              className="inline-flex items-center gap-1 text-[#00FFFF] hover:underline font-semibold cursor-pointer"
            >
              {mode === 'login' ? (
                <>
                  <UserPlus size={13} /> Daftar Akun Baru
                </>
              ) : (
                <>
                  <LogIn size={13} /> Form Masuk
                </>
              )}
            </button>
            {currentUser && (
              <span className="hidden sm:inline text-[11px] text-slate-300 border-l border-slate-600 pl-3">
                Aktif: <strong className="text-white">{currentUser.namaLengkap}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isInstalled && (
              <button
                type="button"
                onClick={async () => {
                  if (isInstallable) {
                    const ok = await triggerInstall();
                    if (ok) return;
                  }
                  setShowInstallModal(true);
                }}
                title="Aktifkan Mode Offline & Instal Aplikasi ke Laptop"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] rounded-xs border border-emerald-400 cursor-pointer"
              >
                <Laptop size={12} />
                <span>Offline / Instal Laptop</span>
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                try {
                  await loginWithGoogle();
                  if (auth.currentUser) {
                    setMessage({ text: 'Berhasil terhubung ke Akun Google Firebase!', type: 'success' });
                    setTimeout(() => onClose(), 800);
                  } else {
                    setMessage({ text: 'Jendela login Google ditutup sebelum selesai.', type: 'error' });
                  }
                } catch (err: unknown) {
                  const errMsg = err instanceof Error ? err.message : 'Gagal login dengan akun Google.';
                  setMessage({ text: errMsg, type: 'error' });
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold text-[11px] rounded-xs border border-slate-400 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Masuk Google (Cloud)</span>
            </button>
          </div>
        </div>
      </div>
      <InstallPcModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </div>
  );
};
