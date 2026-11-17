import React, { useState } from 'react';
import { AlertTriangle, Eraser, Trash2, X, Layers, RotateCcw } from 'lucide-react';
import { useApp, MenuKey } from '../../context/AppContext';

const MENU_TITLE_MAP: Record<MenuKey, string> = {
  dashboard: 'Dashboard',
  buku_panduan: 'Buku Panduan Pengguna',
  identitas_sekolah: 'Identitas Sekolah',
  data_guru: 'Data Guru',
  data_siswa: 'Data Siswa',
  data_kelas: 'Data Kelas',
  mata_pelajaran: 'Data Mata Pelajaran',
  kkm_pelajaran: 'KKM Semua Pelajaran',
  tujuan_pembelajaran: 'Tujuan Pembelajaran (TP)',
  input_nilai: 'Input Nilai Akademik',
  rekap_nilai: 'Rekap Nilai Akademik',
  deskripsi_rapor: 'Deskripsi Rapor',
  ekstrakurikuler: 'Ekstrakurikuler',
  kehadiran: 'Kehadiran Siswa',
  catatan_wali: 'Catatan Wali Kelas',
  rapor_pts: 'Rapor PTS',
  rapor_akademik: 'Rapor Akademik',
  rapor_semester_1: 'Rapor Semester 1',
  rapor_semester_2: 'Rapor Semester 2',
  p5_projek: 'Projek P5',
  p5_tahapan: 'Tahapan Projek P5',
  p5_dimensi: 'Dimensi & Elemen P5',
  p5_nilai: 'Input Capaian P5',
  rapor_p5: 'Rapor P5',
  rekap_rapor: 'Rekap Kelengkapan Rapor',
  piagam: 'Piagam Penghargaan',
  template_data: 'Template Data Semua Menu',
  cetak_rapor: 'Pusat Cetak Rapor',
  cetak_rapor_semester_1: 'Cetak Rapor Semester 1',
  cetak_rapor_semester_2: 'Cetak Rapor Semester 2',
  pengaturan: 'Pengaturan',
  backup_restore: 'Backup & Restore DB',
  google_sheets: 'Google Sheets',
};

const DATA_SPECIFIC_MENUS: Set<MenuKey> = new Set([
  'identitas_sekolah',
  'data_guru',
  'data_siswa',
  'data_kelas',
  'mata_pelajaran',
  'kkm_pelajaran',
  'tujuan_pembelajaran',
  'input_nilai',
  'rekap_nilai',
  'deskripsi_rapor',
  'ekstrakurikuler',
  'kehadiran',
  'catatan_wali',
  'p5_projek',
  'p5_tahapan',
  'p5_dimensi',
  'p5_nilai',
  'rapor_p5',
  'piagam',
  'rapor_pts',
  'rapor_akademik',
  'rapor_semester_1',
  'rapor_semester_2',
  'rekap_rapor',
  'cetak_rapor',
  'cetak_rapor_semester_1',
  'cetak_rapor_semester_2',
]);

export const ClearAllDataModal: React.FC = () => {
  const {
    db,
    activeMenu,
    isClearDataModalOpen,
    setIsClearDataModalOpen,
    clearCurrentMenuData,
    clearAllData,
  } = useApp();

  const [includeSekolah, setIncludeSekolah] = useState(true);

  if (!isClearDataModalOpen) return null;

  const activeMenuTitle = MENU_TITLE_MAP[activeMenu] || 'Menu Aktif';
  const supportsSingleMenuClear = DATA_SPECIFIC_MENUS.has(activeMenu);

  const summaryCounts = [
    { label: 'Data Guru', count: db.guru.length },
    { label: 'Data Siswa', count: db.siswa.length },
    { label: 'Data Kelas', count: db.kelas.length },
    { label: 'Mata Pelajaran', count: db.mataPelajaran.length },
    { label: 'Tujuan Pembelajaran', count: db.tujuanPembelajaran.length },
    { label: 'Nilai Akademik', count: db.nilaiAkademik.length },
    { label: 'Ekstrakurikuler', count: db.ekstrakurikuler.length },
    { label: 'Kehadiran Siswa', count: db.kehadiran.length },
    { label: 'Catatan Wali', count: db.catatanWali.length },
    { label: 'Projek/Tahap/Dimensi P5', count: db.p5Projek.length + db.p5Tahapan.length + db.p5Dimensi.length },
    { label: 'Capaian Nilai P5', count: db.p5Nilai.length },
    { label: 'Piagam & Keputusan', count: (db.piagam?.length || 0) + (db.keputusanSiswa?.length || 0) },
  ];

  const handleClearMenuOnly = () => {
    clearCurrentMenuData(activeMenu);
    setIsClearDataModalOpen(false);
  };

  const handleClearAll = () => {
    clearAllData(includeSekolah);
    setIsClearDataModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 via-red-700 to-rose-800 px-5 py-4 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl border border-white/20">
              <AlertTriangle size={22} className="text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide">
                Bersihkan Data Semua (Semua Menu &amp; Semua Data)
              </h3>
              <p className="text-[11px] text-rose-100">
                Menu Aktif: <strong>{activeMenuTitle}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsClearDataModalOpen(false)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 leading-relaxed">
            <strong>Pilih tindakan pembersihan data:</strong> Anda dapat membersihkan data pada menu yang sedang dibuka saja atau mengosongkan{' '}
            <strong>SEMUA DATA di SEMUA MENU</strong> sekaligus (Guru, Siswa, Kelas, Mapel, KKM, TP, Nilai, Ekstrakurikuler, Kehadiran, Catatan Wali, P5, Piagam, dan Identitas Sekolah).
          </div>

          {/* Ringkasan Jumlah Data */}
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Layers size={13} />
              <span>Ringkasan Data Tersimpan Saat Ini:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {summaryCounts.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate pr-1">
                    {item.label}
                  </span>
                  <span className="font-mono font-black text-[11px] text-slate-900 dark:text-white shrink-0">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Checkbox Identitas Sekolah */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSekolah}
              onChange={(e) => setIncludeSekolah(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-100 block">
                Ikut bersihkan Identitas Sekolah, KOP &amp; Logo
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Jika dicentang, seluruh isian Nama Sekolah, Kepala Sekolah, Wali Kelas, dan KOP juga ikut dikosongkan.
              </span>
            </div>
          </label>

          {/* Info Undo */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <RotateCcw size={13} className="text-emerald-600 shrink-0" />
            <span>
              Tenang: Anda dapat menekan tombol <strong>Undo</strong> jika ingin mengembalikan data yang baru dibersihkan.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsClearDataModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
          >
            Batal
          </button>

          {supportsSingleMenuClear && (
            <button
              type="button"
              onClick={handleClearMenuOnly}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer"
            >
              <Eraser size={14} />
              <span>Bersihkan Menu Ini ({activeMenuTitle})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer ring-1 ring-rose-400"
          >
            <Trash2 size={14} />
            <span>BERSIHKAN DATA SEMUA MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
