import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  FolderOpen,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Plus,
  Table as TableIcon,
  LogOut,
  ShieldAlert,
  ArrowRight,
  Layers,
  Users,
  BookOpen,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GoogleSignInButton } from '../common/GoogleSignInButton';
import {
  addSheetTab,
  buildAcademicScoresSheetValues,
  buildFullDatabaseMultiSheets,
  buildReportSummarySheetValues,
  buildStudentsSheetValues,
  createSpreadsheetWithSheets,
  DriveSpreadsheetFile,
  extractSpreadsheetId,
  getSpreadsheetMetadata,
  listSpreadsheetsFromDrive,
  parseSheetRowsToScores,
  parseSheetRowsToStudents,
  readSheetValues,
  SpreadsheetMetadata,
  trashDriveSpreadsheet,
  WorkspaceAuthError,
  writeValuesToSheet
} from '../../services/googleSheetsService';
import {
  clearAccessToken,
  getAccessToken,
  googleSignInWithWorkspace,
  initWorkspaceAuth
} from '../../services/firebase';

type ActiveTab = 'import' | 'export' | 'drive';
type ExportDataset = 'siswa_kelas' | 'siswa_semua' | 'nilai' | 'rekap' | 'lengkap';
type ImportTarget = 'siswa' | 'nilai';

interface PendingConfirmation {
  title: string;
  description: string;
  details: { label: string; value: string }[];
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
}

export const GoogleSheetsSection: React.FC = () => {
  const {
    db,
    selectedKelas,
    selectedSemester,
    firebaseUser,
    logoutFirebase,
    saveSiswaBatch,
    bulkSaveNilai,
    showSaveNotification,
    openClearDataModal
  } = useApp();

  const [needsAuth, setNeedsAuth] = useState<boolean>(() => !getAccessToken());
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('import');

  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [driveSearch, setDriveSearch] = useState('');
  const [loadingDrive, setLoadingDrive] = useState(false);

  // Import / Read state
  const [spreadsheetInput, setSpreadsheetInput] = useState('');
  const [selectedMeta, setSelectedMeta] = useState<SpreadsheetMetadata | null>(null);
  const [selectedSheetTitle, setSelectedSheetTitle] = useState('');
  const [cellRange, setCellRange] = useState('A1:ZZ1000');
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [importTarget, setImportTarget] = useState<ImportTarget>('siswa');

  // Export / Write state
  const [exportDataset, setExportDataset] = useState<ExportDataset>('nilai');
  const [exportDestMode, setExportDestMode] = useState<'new' | 'existing'>('new');
  const [newSpreadsheetTitle, setNewSpreadsheetTitle] = useState(
    `E-Rapor ${db.sekolah.namaSekolah || 'SD Negeri Balil'} - Kelas ${selectedKelas} (${selectedSemester})`
  );
  const [exportTargetId, setExportTargetId] = useState('');
  const [exportMeta, setExportMeta] = useState<SpreadsheetMetadata | null>(null);
  const [exportTargetSheetTitle, setExportTargetSheetTitle] = useState('');
  const [exportNewTabName, setExportNewTabName] = useState('');
  const [exportWriteMode, setExportWriteMode] = useState<'overwrite' | 'append'>('overwrite');
  const [lastCreatedUrl, setLastCreatedUrl] = useState<string | null>(null);

  // Feedback & confirmation modal
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const [executingConfirm, setExecutingConfirm] = useState(false);

  // Keep auth state synchronized via onAuthStateChanged & in-memory token only
  useEffect(() => {
    const tokenNow = getAccessToken();
    setNeedsAuth(!tokenNow);

    const unsubscribe = initWorkspaceAuth(
      (_user, token) => {
        setNeedsAuth(!token);
      },
      () => {
        setNeedsAuth(!getAccessToken());
      }
    );
    return () => unsubscribe();
  }, []);

  // Refresh default title when class/semester changes
  useEffect(() => {
    setNewSpreadsheetTitle(
      `E-Rapor ${db.sekolah.namaSekolah || 'SD Negeri Balil'} - Kelas ${selectedKelas} (${selectedSemester})`
    );
  }, [db.sekolah.namaSekolah, selectedKelas, selectedSemester]);

  const requireToken = async (): Promise<string | null> => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      setStatusBanner({
        type: 'info',
        text: 'Silakan masuk dengan akun Google terlebih dahulu untuk mengakses Google Sheets & Drive.'
      });
      return null;
    }
    return token;
  };

  const handleApiError = (err: unknown) => {
    if (err instanceof WorkspaceAuthError) {
      clearAccessToken();
      setNeedsAuth(true);
      setStatusBanner({ type: 'error', text: err.message });
      return;
    }
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menghubungi Google Sheets.';
    setStatusBanner({ type: 'error', text: msg });
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setStatusBanner(null);
    try {
      const res = await googleSignInWithWorkspace();
      if (!res) {
        setStatusBanner({
          type: 'info',
          text: 'Jendela masuk Google ditutup sebelum proses selesai. Klik tombol "Sign in with Google" untuk menghubungkan akun Anda.'
        });
        return;
      }
      if (res.accessToken) {
        setNeedsAuth(false);
        showSaveNotification(`Terhubung dengan Google Sheets (${res.user.email || res.user.displayName})`);
        await fetchDriveSpreadsheets(res.accessToken);
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    clearAccessToken();
    await logoutFirebase();
    setNeedsAuth(true);
    setDriveFiles([]);
    setSelectedMeta(null);
    setSheetRows([]);
    setStatusBanner({ type: 'info', text: 'Koneksi Google Sheets telah diputus.' });
  };

  const fetchDriveSpreadsheets = async (explicitToken?: string, searchText = driveSearch) => {
    const token = explicitToken || (await requireToken());
    if (!token) return;
    setLoadingDrive(true);
    try {
      const files = await listSpreadsheetsFromDrive(token, searchText);
      setDriveFiles(files);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoadingDrive(false);
    }
  };

  useEffect(() => {
    const token = getAccessToken();
    if (token && !needsAuth && driveFiles.length === 0) {
      fetchDriveSpreadsheets(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAuth]);

  const handleLoadSpreadsheetMeta = async (idOrUrl: string) => {
    const token = await requireToken();
    if (!token) return;
    const cleanId = extractSpreadsheetId(idOrUrl);
    if (!cleanId) {
      setStatusBanner({ type: 'error', text: 'Masukkan ID atau tautan Google Sheets yang valid.' });
      return;
    }
    setLoadingSheet(true);
    setStatusBanner(null);
    try {
      const meta = await getSpreadsheetMetadata(token, cleanId);
      setSelectedMeta(meta);
      setSpreadsheetInput(meta.spreadsheetId);
      const firstTab = meta.sheets[0]?.title || '';
      setSelectedSheetTitle(firstTab);
      if (firstTab) {
        const values = await readSheetValues(token, meta.spreadsheetId, firstTab, cellRange);
        setSheetRows(values);
      } else {
        setSheetRows([]);
      }
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleReadSheetTab = async (tabTitle: string) => {
    if (!selectedMeta) return;
    const token = await requireToken();
    if (!token) return;
    setSelectedSheetTitle(tabTitle);
    setLoadingSheet(true);
    setStatusBanner(null);
    try {
      const values = await readSheetValues(token, selectedMeta.spreadsheetId, tabTitle, cellRange);
      setSheetRows(values);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleLoadExportMeta = async (idOrUrl: string) => {
    const token = await requireToken();
    if (!token) return;
    const cleanId = extractSpreadsheetId(idOrUrl);
    if (!cleanId) return;
    setLoadingSheet(true);
    try {
      const meta = await getSpreadsheetMetadata(token, cleanId);
      setExportMeta(meta);
      setExportTargetId(meta.spreadsheetId);
      setExportTargetSheetTitle(meta.sheets[0]?.title || '');
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoadingSheet(false);
    }
  };

  const buildDatasetPreview = (): {
    label: string;
    sheets: { title: string; values: (string | number)[][] }[];
  } => {
    if (exportDataset === 'siswa_kelas') {
      return {
        label: `Data Siswa Kelas ${selectedKelas}`,
        sheets: [
          {
            title: `Siswa Kelas ${selectedKelas}`,
            values: buildStudentsSheetValues(db, selectedKelas),
          },
        ],
      };
    }
    if (exportDataset === 'siswa_semua') {
      return {
        label: 'Data Siswa Semua Kelas',
        sheets: [
          {
            title: 'Semua Siswa',
            values: buildStudentsSheetValues(db, 'SEMUA'),
          },
        ],
      };
    }
    if (exportDataset === 'nilai') {
      return {
        label: `Nilai Akademik & Rapor Kelas ${selectedKelas} (${selectedSemester})`,
        sheets: [
          {
            title: `Nilai Kls ${selectedKelas} ${selectedSemester}`,
            values: buildAcademicScoresSheetValues(db, selectedKelas, selectedSemester),
          },
        ],
      };
    }
    if (exportDataset === 'rekap') {
      return {
        label: `Rekap Rapor Kelas ${selectedKelas} (${selectedSemester})`,
        sheets: [
          {
            title: `Rekap Kls ${selectedKelas}`,
            values: buildReportSummarySheetValues(db, selectedKelas, selectedSemester),
          },
        ],
      };
    }
    return {
      label: `Buku Besar Lengkap (${db.sekolah.namaSekolah || 'Sekolah'})`,
      sheets: buildFullDatabaseMultiSheets(db, selectedKelas, selectedSemester),
    };
  };

  // Trigger confirmation before importing spreadsheet rows into local E-Rapor DB
  const requestImportIntoApp = () => {
    if (sheetRows.length < 2) {
      setStatusBanner({
        type: 'error',
        text: 'Sheet belum memiliki baris data (minimal 1 baris judul kolom dan 1 baris data).'
      });
      return;
    }

    const headers = sheetRows[0];
    const bodyRows = sheetRows.slice(1).filter((r) => r.some((cell) => String(cell || '').trim() !== ''));

    if (importTarget === 'siswa') {
      const students = parseSheetRowsToStudents(
        headers,
        bodyRows,
        selectedKelas,
        selectedSemester,
        db.sekolah.tahunPelajaran || '2026/2027'
      );
      if (students.length === 0) {
        setStatusBanner({
          type: 'error',
          text: 'Tidak ada baris siswa yang valid. Pastikan kolom "Nama Siswa" (dan NISN jika ada) tersedia.'
        });
        return;
      }

      setPendingConfirm({
        title: 'Konfirmasi Impor Data Siswa dari Google Sheets',
        description:
          'Data siswa berikut akan ditambahkan atau diperbarui di database aplikasi E-Rapor dan otomatis disinkronkan ke seluruh menu (nilai, kehadiran, catatan wali, P5, dan piagam).',
        details: [
          { label: 'Sumber Spreadsheet', value: selectedMeta?.title || spreadsheetInput },
          { label: 'Nama Tab / Sheet', value: selectedSheetTitle },
          { label: 'Jumlah Siswa Terbaca', value: `${students.length} Peserta Didik` },
          { label: 'Contoh Nama Pertama', value: students[0]?.namaSiswa || '-' },
        ],
        confirmLabel: `Ya, Impor ${students.length} Siswa`,
        onConfirm: async () => {
          saveSiswaBatch(students);
          setStatusBanner({
            type: 'success',
            text: `Berhasil mengimpor ${students.length} data siswa dari Google Sheets "${selectedMeta?.title}"!`
          });
        },
      });
      return;
    }

    // Import academic scores
    const scores = parseSheetRowsToScores(
      headers,
      bodyRows,
      db.siswa,
      db.mataPelajaran,
      db.tujuanPembelajaran,
      selectedKelas,
      selectedSemester,
      db.sekolah.tahunPelajaran || '2026/2027'
    );

    if (scores.length === 0) {
      setStatusBanner({
        type: 'error',
        text: 'Tidak ada baris nilai yang valid. Pastikan kolom Nama Siswa/NISN dan Mata Pelajaran tersedia.'
      });
      return;
    }

    setPendingConfirm({
      title: 'Konfirmasi Impor Nilai Akademik dari Google Sheets',
      description:
        'Nilai yang diimpor akan otomatis dihitung Jumlah Nilai, Nilai Akhir, Predikat, Capaian Kompetensi, dan Deskripsi Rapor sesuai Tujuan Pembelajaran (TP).',
      details: [
        { label: 'Sumber Spreadsheet', value: selectedMeta?.title || spreadsheetInput },
        { label: 'Nama Tab / Sheet', value: selectedSheetTitle },
        { label: 'Jumlah Rekord Nilai', value: `${scores.length} Baris Nilai` },
        { label: 'Kelas / Semester Default', value: `Kelas ${selectedKelas} • ${selectedSemester}` },
      ],
      confirmLabel: `Ya, Impor ${scores.length} Nilai`,
      onConfirm: async () => {
        bulkSaveNilai(scores);
        setStatusBanner({
          type: 'success',
          text: `Berhasil mengimpor ${scores.length} rekord nilai akademik dari Google Sheets!`
        });
      },
    });
  };

  // Trigger confirmation before creating or modifying Google Sheets
  const requestExportToGoogleSheets = async () => {
    const token = await requireToken();
    if (!token) return;

    const { label, sheets } = buildDatasetPreview();
    const totalRows = sheets.reduce((acc, s) => acc + Math.max(0, s.values.length - 1), 0);

    if (exportDestMode === 'new') {
      const cleanTitle = newSpreadsheetTitle.trim() || `E-Rapor ${db.sekolah.namaSekolah}`;
      setPendingConfirm({
        title: 'Konfirmasi Buat & Simpan Google Sheets Baru',
        description:
          'Aplikasi akan membuat file Google Spreadsheet baru di Google Drive Anda dan menuliskan data sekolah berikut ke dalamnya.',
        details: [
          { label: 'Nama File Baru', value: cleanTitle },
          { label: 'Jenis Data', value: label },
          { label: 'Jumlah Tab / Sheet', value: `${sheets.length} Tab (${sheets.map((s) => s.title).join(', ')})` },
          { label: 'Total Baris Data', value: `${totalRows} Baris` },
        ],
        confirmLabel: 'Ya, Buat & Simpan ke Google Sheets',
        onConfirm: async () => {
          const created = await createSpreadsheetWithSheets(token, cleanTitle, sheets);
          setLastCreatedUrl(created.spreadsheetUrl);
          setStatusBanner({
            type: 'success',
            text: `Spreadsheet "${created.title}" berhasil dibuat di Google Drive!`
          });
          showSaveNotification('Data berhasil diekspor ke Google Sheets baru!');
          await fetchDriveSpreadsheets(token);
        },
      });
      return;
    }

    // Existing spreadsheet
    if (!exportMeta) {
      setStatusBanner({
        type: 'error',
        text: 'Pilih atau muat spreadsheet tujuan terlebih dahulu sebelum mengirim data.'
      });
      return;
    }

    if (exportDataset === 'lengkap') {
      setStatusBanner({
        type: 'error',
        text: 'Untuk mode Buku Besar Lengkap (Multi-Tab), gunakan opsi "Buat Spreadsheet Baru".'
      });
      return;
    }

    const chosenTab = exportNewTabName.trim() || exportTargetSheetTitle;
    if (!chosenTab) {
      setStatusBanner({
        type: 'error',
        text: 'Pilih tab yang sudah ada atau isi nama tab baru.'
      });
      return;
    }

    const isAddingNewTab = Boolean(exportNewTabName.trim()) &&
      !exportMeta.sheets.some((s) => s.title.toLowerCase() === chosenTab.toLowerCase());

    const rowsToWrite =
      exportWriteMode === 'append' && !isAddingNewTab
        ? sheets[0].values.slice(1) // avoid duplicating header row when appending
        : sheets[0].values;

    setPendingConfirm({
      title:
        exportWriteMode === 'overwrite'
          ? 'Konfirmasi Timpa Isi Google Sheets'
          : 'Konfirmasi Tambah Baris ke Google Sheets',
      description:
        exportWriteMode === 'overwrite'
          ? 'PERHATIAN: Seluruh isi lama pada tab Google Sheets yang dipilih akan dihapus dan diganti dengan data terbaru dari aplikasi E-Rapor.'
          : 'Data dari aplikasi E-Rapor akan ditambahkan di bawah baris terakhir pada tab Google Sheets yang dipilih.',
      danger: exportWriteMode === 'overwrite',
      details: [
        { label: 'Spreadsheet Tujuan', value: exportMeta.title },
        { label: 'ID Spreadsheet', value: exportMeta.spreadsheetId },
        { label: 'Tab Tujuan', value: isAddingNewTab ? `${chosenTab} (Tab Baru)` : chosenTab },
        { label: 'Mode Penulisan', value: exportWriteMode === 'overwrite' ? 'Timpa Seluruh Isi Tab' : 'Tambah Baris di Bawah (Append)' },
        { label: 'Jumlah Baris Ditulis', value: `${rowsToWrite.length} Baris` },
      ],
      confirmLabel:
        exportWriteMode === 'overwrite' ? 'Ya, Timpa Data Sheet' : 'Ya, Tambahkan Data',
      onConfirm: async () => {
        let finalTab = chosenTab;
        if (isAddingNewTab) {
          finalTab = await addSheetTab(token, exportMeta.spreadsheetId, chosenTab);
        }
        const res = await writeValuesToSheet(
          token,
          exportMeta.spreadsheetId,
          finalTab,
          rowsToWrite,
          isAddingNewTab ? 'overwrite' : exportWriteMode
        );
        setLastCreatedUrl(exportMeta.spreadsheetUrl || null);
        setStatusBanner({
          type: 'success',
          text: `Berhasil menulis ${res.updatedRows} baris ke "${exportMeta.title}" (Tab: ${finalTab})!`
        });
        showSaveNotification('Data berhasil disinkronkan ke Google Sheets!');
        await handleLoadExportMeta(exportMeta.spreadsheetId);
      },
    });
  };

  // Trigger confirmation before moving a Drive spreadsheet to Trash
  const requestTrashFile = (file: DriveSpreadsheetFile) => {
    setPendingConfirm({
      title: 'Konfirmasi Hapus File Google Sheets',
      description:
        'File Google Sheets ini akan dipindahkan ke Sampah (Trash) di Google Drive Anda. Pastikan file tidak lagi digunakan.',
      danger: true,
      details: [
        { label: 'Nama File', value: file.name },
        { label: 'File ID', value: file.id },
        {
          label: 'Terakhir Diubah',
          value: file.modifiedTime ? new Date(file.modifiedTime).toLocaleString('id-ID') : '-'
        },
      ],
      confirmLabel: 'Ya, Pindahkan ke Sampah',
      onConfirm: async () => {
        const token = await requireToken();
        if (!token) return;
        await trashDriveSpreadsheet(token, file.id);
        setDriveFiles((prev) => prev.filter((f) => f.id !== file.id));
        if (selectedMeta?.spreadsheetId === file.id) {
          setSelectedMeta(null);
          setSheetRows([]);
        }
        setStatusBanner({
          type: 'success',
          text: `File "${file.name}" berhasil dipindahkan ke Sampah Google Drive.`
        });
        showSaveNotification('File dipindahkan ke Sampah Google Drive.');
      },
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirm) return;
    setExecutingConfirm(true);
    try {
      await pendingConfirm.onConfirm();
      setPendingConfirm(null);
    } catch (err) {
      setPendingConfirm(null);
      handleApiError(err);
    } finally {
      setExecutingConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-emerald-700/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl shrink-0">
            <FileSpreadsheet size={32} className="text-emerald-300" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300 mb-1">
              Integrasi Google Workspace
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Google Sheets &amp; Google Drive E-Rapor
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
              Impor daftar siswa dan nilai langsung dari Google Sheets, atau ekspor &amp; sinkronkan data rapor kelas ke Google Spreadsheet Anda di Google Drive.
            </p>
          </div>
        </div>

        {/* Auth Status & Official Google Sign-In Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          {needsAuth ? (
            <GoogleSignInButton
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              label={isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 border border-emerald-500/40 rounded-2xl px-3.5 py-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-black text-white">
                {(firebaseUser?.displayName || firebaseUser?.email || 'G').charAt(0).toUpperCase()}
              </div>
              <div className="text-left mr-2">
                <div className="text-xs font-bold text-white leading-tight">
                  {firebaseUser?.displayName || 'Akun Google Terhubung'}
                </div>
                <div className="text-[10px] text-emerald-300 font-mono">
                  {firebaseUser?.email || 'Sesi aktif'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 cursor-pointer"
                title="Ganti akun atau perbarui sesi Google"
              >
                Ganti Akun
              </button>
              <button
                type="button"
                onClick={handleDisconnectGoogle}
                className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/50 cursor-pointer"
                title="Putuskan Koneksi Google"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={openClearDataModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md border border-rose-400/50 transition-all cursor-pointer"
            title="Bersihkan seluruh data aplikasi di semua menu"
          >
            <Trash2 size={15} />
            <span>Bersihkan Data Semua</span>
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {statusBanner && (
        <div
          className={`rounded-2xl p-4 border flex items-start justify-between gap-3 ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : statusBanner.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-blue-50 border-blue-300 text-blue-950'
          }`}
        >
          <div className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div>{statusBanner.text}</div>
              {lastCreatedUrl && statusBanner.type === 'success' && (
                <a
                  href={lastCreatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline hover:text-emerald-600"
                >
                  <span>Buka Spreadsheet di Google Sheets</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Auth Gate Card when not signed in */}
      {needsAuth ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
            <FileSpreadsheet size={34} />
          </div>
          <div className="max-w-lg mx-auto space-y-2">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Hubungkan Akun Google untuk Membuka &amp; Menyimpan Google Sheets
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Masuk dengan akun Google Anda agar aplikasi dapat membaca daftar spreadsheet dari Google Drive, mengimpor data siswa &amp; nilai, serta mengekspor laporan kelas langsung ke Google Sheets.
            </p>
          </div>
          <div className="flex justify-center pt-1">
            <GoogleSignInButton
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              label={isLoggingIn ? 'Menghubungkan ke Google...' : 'Sign in with Google'}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Tab Switcher */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <DownloadCloud size={16} />
              <span>1. Impor dari Google Sheets</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UploadCloud size={16} />
              <span>2. Ekspor / Kirim ke Google Sheets</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('drive')}
              className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'drive'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FolderOpen size={16} />
              <span>3. File Spreadsheet di Drive ({driveFiles.length})</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: IMPORT FROM GOOGLE SHEETS                               */}
          {/* ============================================================== */}
          {activeTab === 'import' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Panel: Pick from Drive or Paste URL */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <FolderOpen size={17} className="text-emerald-600" />
                      <span>Pilih Spreadsheet Sumber</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => fetchDriveSpreadsheets()}
                      disabled={loadingDrive}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <RefreshCw size={12} className={loadingDrive ? 'animate-spin' : ''} />
                      <span>Muat Ulang</span>
                    </button>
                  </div>

                  {/* Paste Spreadsheet Link or ID */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Tempel Tautan / ID Google Sheets:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={spreadsheetInput}
                        onChange={(e) => setSpreadsheetInput(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleLoadSpreadsheetMeta(spreadsheetInput)}
                        disabled={loadingSheet || !spreadsheetInput.trim()}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        Buka
                      </button>
                    </div>
                  </div>

                  {/* Search Drive */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={driveSearch}
                          onChange={(e) => setDriveSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') fetchDriveSpreadsheets(undefined, driveSearch);
                          }}
                          placeholder="Cari Google Sheets di Drive..."
                          className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => fetchDriveSpreadsheets(undefined, driveSearch)}
                        className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
                      >
                        Cari
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                      {loadingDrive ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Memuat file Google Sheets dari Google Drive...
                        </div>
                      ) : driveFiles.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Belum ada file Google Sheets ditemukan. Anda bisa menempel URL di atas atau membuat spreadsheet baru di tab Ekspor.
                        </div>
                      ) : (
                        driveFiles.map((file) => {
                          const isSelected = selectedMeta?.spreadsheetId === file.id;
                          return (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => handleLoadSpreadsheetMeta(file.id)}
                              className={`w-full text-left p-3 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                                  <FileSpreadsheet size={14} className="text-emerald-600 shrink-0" />
                                  <span className="truncate">{file.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  {file.modifiedTime
                                    ? `Diubah: ${new Date(file.modifiedTime).toLocaleDateString('id-ID')}`
                                    : 'Google Sheets'}
                                </div>
                              </div>
                              <ArrowRight size={14} className="text-slate-400 shrink-0" />
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: Tab Selector, Preview & Import to E-Rapor */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                  {!selectedMeta ? (
                    <div className="py-16 text-center space-y-2 text-slate-500">
                      <TableIcon size={36} className="mx-auto text-slate-300" />
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Pilih Spreadsheet di Sebelah Kiri
                      </div>
                      <p className="text-xs max-w-md mx-auto">
                        Daftar tab (sheet) akan otomatis dimuat agar Anda bisa memilih sheet yang tepat, melihat pratinjau tabel, lalu mengimpor ke Data Siswa atau Nilai Akademik.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider">
                            Spreadsheet Aktif
                          </div>
                          <h3 className="text-base font-black text-slate-900 dark:text-white">
                            {selectedMeta.title}
                          </h3>
                        </div>
                        {selectedMeta.spreadsheetUrl && (
                          <a
                            href={selectedMeta.spreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200"
                          >
                            <span>Buka di Google Sheets</span>
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>

                      {/* Sheet Tabs & Range Picker */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-6 space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            Pilih Tab / Sheet ({selectedMeta.sheets.length} tab):
                          </label>
                          <select
                            value={selectedSheetTitle}
                            onChange={(e) => handleReadSheetTab(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            {selectedMeta.sheets.map((tab) => (
                              <option key={tab.sheetId} value={tab.title}>
                                {tab.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-4 space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            Rentang Sel (Range):
                          </label>
                          <input
                            type="text"
                            value={cellRange}
                            onChange={(e) => setCellRange(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            onClick={() => handleReadSheetTab(selectedSheetTitle)}
                            disabled={loadingSheet}
                            className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                          >
                            Muat
                          </button>
                        </div>
                      </div>

                      {/* Preview Table */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-800/80 px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            Pratinjau Data Tab "{selectedSheetTitle}"
                          </span>
                          <span className="font-mono text-slate-500">
                            {Math.max(0, sheetRows.length - 1)} baris data
                          </span>
                        </div>
                        <div className="max-h-64 overflow-auto">
                          {loadingSheet ? (
                            <div className="p-8 text-center text-xs text-slate-500">
                              Membaca data dari Google Sheets...
                            </div>
                          ) : sheetRows.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500">
                              Tab ini masih kosong pada rentang {cellRange}.
                            </div>
                          ) : (
                            <table className="w-full text-[11px] border-collapse">
                              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                                <tr>
                                  {sheetRows[0].map((col, idx) => (
                                    <th
                                      key={idx}
                                      className="border-b border-r border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-left font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap"
                                    >
                                      {col || `Kolom ${idx + 1}`}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sheetRows.slice(1, 51).map((row, rIdx) => (
                                  <tr
                                    key={rIdx}
                                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                  >
                                    {sheetRows[0].map((_, cIdx) => (
                                      <td
                                        key={cIdx}
                                        className="border-r border-slate-100 dark:border-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[220px] truncate"
                                      >
                                        {row[cIdx] ?? ''}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>

                      {/* Impor Action Footer */}
                      <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                            Tujuan Impor di Aplikasi:
                          </span>
                          <select
                            value={importTarget}
                            onChange={(e) => setImportTarget(e.target.value as ImportTarget)}
                            className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-slate-900"
                          >
                            <option value="siswa">Data Siswa (Otomatis Sinkron Semua Menu)</option>
                            <option value="nilai">Nilai Akademik (Otomatis Hitung Nilai Akhir &amp; Deskripsi)</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={requestImportIntoApp}
                          disabled={sheetRows.length < 2 || loadingSheet}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <DownloadCloud size={15} />
                          <span>Impor Data ke E-Rapor</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: EXPORT / SYNC TO GOOGLE SHEETS                          */}
          {/* ============================================================== */}
          {activeTab === 'export' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Step 1: Choose Dataset */}
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Langkah 1 • Pilih Data E-Rapor yang Akan Dikirim
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        id: 'nilai' as ExportDataset,
                        title: `Nilai Akademik & Deskripsi Rapor (Kelas ${selectedKelas} • ${selectedSemester})`,
                        desc: 'Kolom lengkap: NISN, Nama Siswa, Mapel, KKM, Formatif, Nilai PTS, Sumatif, Nilai Akhir, Capaian & Deskripsi.',
                        icon: <BookOpen size={16} className="text-blue-600" />,
                      },
                      {
                        id: 'siswa_kelas' as ExportDataset,
                        title: `Data Siswa Kelas ${selectedKelas}`,
                        desc: 'Biodata lengkap siswa termasuk NISN, Pekerjaan Orang Tua, dan Wali Peserta Didik.',
                        icon: <Users size={16} className="text-emerald-600" />,
                      },
                      {
                        id: 'siswa_semua' as ExportDataset,
                        title: `Data Siswa Semua Kelas (${db.siswa.length} Siswa)`,
                        desc: 'Seluruh peserta didik dari semua rombongan belajar yang tersimpan di aplikasi.',
                        icon: <Users size={16} className="text-teal-600" />,
                      },
                      {
                        id: 'rekap' as ExportDataset,
                        title: `Rekap Nilai, Kehadiran & Keputusan Kelas ${selectedKelas}`,
                        desc: 'Ringkasan Jumlah Nilai, Rata-rata, Sakit/Izin/Alpa, Catatan Wali & Kenaikan Kelas.',
                        icon: <TableIcon size={16} className="text-purple-600" />,
                      },
                      {
                        id: 'lengkap' as ExportDataset,
                        title: 'Buku Besar Lengkap (Multi-Tab dalam 1 Spreadsheet)',
                        desc: 'Membuat 6 tab sekaligus: Identitas Sekolah, Data Siswa, Nilai Kelas, Rekap, Guru, & TP.',
                        icon: <Layers size={16} className="text-amber-600" />,
                      },
                    ].map((item) => (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          exportDataset === item.id
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 ring-1 ring-blue-300'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="exportDataset"
                          checked={exportDataset === item.id}
                          onChange={() => {
                            setExportDataset(item.id);
                            if (item.id === 'lengkap') setExportDestMode('new');
                          }}
                          className="mt-1 accent-blue-600"
                        />
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {item.icon}
                            <span>{item.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Step 2: Choose Destination Spreadsheet */}
                <div className="space-y-4">
                  <div className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Langkah 2 • Pilih Tujuan Google Sheets
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportDestMode('new')}
                      className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                        exportDestMode === 'new'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Plus size={15} />
                      <span>Buat Spreadsheet Baru</span>
                    </button>
                    <button
                      type="button"
                      disabled={exportDataset === 'lengkap'}
                      onClick={() => setExportDestMode('existing')}
                      className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                        exportDestMode === 'existing'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <UploadCloud size={15} />
                      <span>Spreadsheet yang Ada</span>
                    </button>
                  </div>

                  {exportDestMode === 'new' ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                        Judul File Google Sheets Baru:
                      </label>
                      <input
                        type="text"
                        value={newSpreadsheetTitle}
                        onChange={(e) => setNewSpreadsheetTitle(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                      <p className="text-[11px] text-slate-500">
                        File akan dibuat langsung di akun Google Drive Anda dan dapat langsung dibuka atau dibagikan ke guru lain.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                          Pilih Spreadsheet dari Drive atau Tempel ID/URL:
                        </label>
                        {driveFiles.length > 0 && (
                          <select
                            value={exportTargetId}
                            onChange={(e) => handleLoadExportMeta(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          >
                            <option value="">-- Pilih dari Google Drive --</option>
                            {driveFiles.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={exportTargetId}
                            onChange={(e) => setExportTargetId(e.target.value)}
                            placeholder="Atau tempel tautan/ID spreadsheet..."
                            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleLoadExportMeta(exportTargetId)}
                            className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
                          >
                            Muat Tab
                          </button>
                        </div>
                      </div>

                      {exportMeta && (
                        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                              Pilih Tab Tujuan ({exportMeta.title}):
                            </label>
                            <select
                              value={exportTargetSheetTitle}
                              onChange={(e) => setExportTargetSheetTitle(e.target.value)}
                              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            >
                              {exportMeta.sheets.map((s) => (
                                <option key={s.sheetId} value={s.title}>
                                  {s.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                              Atau Buat Tab Baru (Opsional):
                            </label>
                            <input
                              type="text"
                              value={exportNewTabName}
                              onChange={(e) => setExportNewTabName(e.target.value)}
                              placeholder="Kosongkan untuk pakai tab di atas"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setExportWriteMode('overwrite')}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer ${
                                exportWriteMode === 'overwrite'
                                  ? 'bg-amber-50 border-amber-500 text-amber-900'
                                  : 'bg-white border-slate-300 text-slate-600'
                              }`}
                            >
                              Timpa Isi Tab
                            </button>
                            <button
                              type="button"
                              onClick={() => setExportWriteMode('append')}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border cursor-pointer ${
                                exportWriteMode === 'append'
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                                  : 'bg-white border-slate-300 text-slate-600'
                              }`}
                            >
                              Tambah di Bawah
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={requestExportToGoogleSheets}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-black shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UploadCloud size={18} />
                      <span>Kirim &amp; Simpan ke Google Sheets</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: DRIVE FILES MANAGER                                     */}
          {/* ============================================================== */}
          {activeTab === 'drive' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Daftar File Google Sheets di Google Drive Anda
                  </h3>
                  <p className="text-xs text-slate-500">
                    Klik "Buka di Impor" untuk melihat isi sheet, atau buka langsung di Google Sheets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchDriveSpreadsheets()}
                  disabled={loadingDrive}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  <RefreshCw size={14} className={loadingDrive ? 'animate-spin' : ''} />
                  <span>Segarkan Daftar</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-left font-bold">Nama Spreadsheet</th>
                      <th className="py-2.5 px-3 text-left font-bold">Terakhir Diubah</th>
                      <th className="py-2.5 px-3 text-right font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {driveFiles.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-500">
                          Tidak ada file Google Sheets ditemukan.
                        </td>
                      </tr>
                    ) : (
                      driveFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-white">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                              <span>{file.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {file.modifiedTime
                              ? new Date(file.modifiedTime).toLocaleString('id-ID')
                              : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('import');
                                  handleLoadSpreadsheetMeta(file.id);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 cursor-pointer"
                              >
                                Baca / Impor
                              </button>
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold border border-blue-200 inline-flex items-center gap-1"
                                >
                                  <span>Buka</span>
                                  <ExternalLink size={12} />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => requestTrashFile(file)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                                title="Pindahkan ke Sampah Google Drive"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================================================================== */}
      {/* EXPLICIT USER CONFIRMATION MODAL FOR MUTATING / DESTRUCTIVE ACTIONS */}
      {/* ================================================================== */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full shadow-2xl overflow-hidden">
            <div
              className={`px-5 py-4 flex items-center gap-3 border-b ${
                pendingConfirm.danger
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
              }`}
            >
              <ShieldAlert size={22} className="shrink-0" />
              <h3 className="text-sm sm:text-base font-black">{pendingConfirm.title}</h3>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {pendingConfirm.description}
              </p>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 space-y-2 text-xs">
                {pendingConfirm.details.map((d, i) => (
                  <div key={i} className="flex justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold shrink-0">
                      {d.label}:
                    </span>
                    <span className="text-slate-900 dark:text-white font-bold text-right break-all">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={executingConfirm}
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={executingConfirm}
                onClick={executeConfirmedAction}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm cursor-pointer disabled:opacity-60 ${
                  pendingConfirm.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {executingConfirm ? 'Memproses...' : pendingConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
