import React, { useState } from 'react';
import {
  X,
  Printer,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  School,
  User,
  Award,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2
} from 'lucide-react';
import { useApp, PAPER_SIZE_MAP, getReportFontCssStack } from '../../context/AppContext';
import { ReportCoverPage } from '../common/ReportCoverPage';
import { ReportSchoolIdentityPage } from '../common/ReportSchoolIdentityPage';
import { ReportStudentIdentityPage } from '../common/ReportStudentIdentityPage';
import { getFaseFromKelas, PaperSize } from '../../types';
import { generateReportDescriptionFromTP } from '../../utils/tpDescriptionHelper';
import { matchesStudentScore, matchesStudentRecord } from '../../utils/studentSyncHelper';
import { AVAILABLE_FONTS, AVAILABLE_SIZES } from '../common/PrintTypographyControl';
import { ReportBottomSection } from '../print/ReportBottomSection';
import { ReportAcademicHeaderAndScores, ReportExtracurricularTable } from '../print/ReportAcademicTables';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStudentId?: string | null;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  targetStudentId
}) => {
  const {
    db,
    selectedKelas,
    selectedSemester,
    printTargetStudentId,
    setPrintTargetStudentId,
    showSaveNotification,
    printFontFamily,
    setPrintFontFamily,
    printFontSize,
    setPrintFontSize,
    printLineHeight,
    paperSize,
    setPaperSize,
    paperOrientation,
    setPaperOrientation,
    paperMargins
  } = useApp();

  const [activeTab, setActiveTab] = useState<'semua' | 'kaver' | 'sekolah' | 'siswa' | 'nilai' | 'ttd' | 'p5'>('semua');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const paperSpec = PAPER_SIZE_MAP[paperSize] || PAPER_SIZE_MAP.F4;
  const finalPageCssSize =
    paperOrientation === 'landscape'
      ? `${paperSpec.heightMm}mm ${paperSpec.widthMm}mm`
      : `${paperSpec.widthMm}mm ${paperSpec.heightMm}mm`;
  const reportFontCss = getReportFontCssStack(printFontFamily);
  const sheetMaxWClass = paperOrientation === 'landscape' ? 'max-w-6xl' : 'max-w-4xl';

  if (!isOpen) return null;

  const siswaKelas = db.siswa.filter((s) => s.kelas === selectedKelas);
  const effectiveStudentId = targetStudentId || printTargetStudentId || (siswaKelas[0]?.idSiswa ?? null);
  const currentStudent = siswaKelas.find((s) => s.idSiswa === effectiveStudentId) || siswaKelas[0];

  if (!currentStudent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <p className="font-bold text-slate-800">Belum ada siswa di kelas {selectedKelas}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  // Navigasi siswa
  const currentIdx = siswaKelas.findIndex((s) => s.idSiswa === currentStudent.idSiswa);
  const handlePrevStudent = () => {
    if (currentIdx > 0) {
      setPrintTargetStudentId(siswaKelas[currentIdx - 1].idSiswa);
    }
  };
  const handleNextStudent = () => {
    if (currentIdx < siswaKelas.length - 1) {
      setPrintTargetStudentId(siswaKelas[currentIdx + 1].idSiswa);
    }
  };

  // Nilai akademik siswa
  const studentScores = db.mataPelajaran.map((m) => {
    const sc = db.nilaiAkademik.find(
      (n) =>
        matchesStudentScore(n, currentStudent) &&
        n.mataPelajaran === m.mataPelajaran &&
        n.kelas === selectedKelas &&
        n.semester === selectedSemester
    );
    const nilaiAkhir = sc ? sc.nilaiAkhir : 0;
    const tpResult =
      nilaiAkhir > 0
        ? generateReportDescriptionFromTP(
            m.mataPelajaran,
            selectedKelas,
            nilaiAkhir,
            db.tujuanPembelajaran,
            currentStudent.namaSiswa,
            currentStudent.agama
          )
        : null;
    const kkm = sc?.kkm || m.kkm || 75;
    const formatif = sc?.formatif;
    const nilaiPts = sc?.pts;
    return {
      mapel: m,
      score: {
        kkm,
        formatif,
        nilaiPts,
        nilaiAkhir,
        predikat:
          sc?.predikat ||
          (nilaiAkhir > 0
            ? nilaiAkhir >= 88
              ? 'Sangat Baik'
              : nilaiAkhir >= 78
              ? 'Baik'
              : nilaiAkhir >= 68
              ? 'Cukup'
              : 'Perlu Bimbingan'
            : '-'),
        capaianKompetensi:
          sc?.capaianKompetensi ||
          (nilaiAkhir > 0
            ? nilaiAkhir >= 88
              ? 'Sangat Baik'
              : nilaiAkhir >= 78
              ? 'Baik'
              : nilaiAkhir >= 68
              ? 'Cukup'
              : 'Perlu Pendampingan'
            : '-'),
        deskripsiRapor: sc?.deskripsiRapor?.trim() ? sc.deskripsiRapor : tpResult?.deskripsiRapor || '-',
        deskripsiTercapai: sc?.deskripsiTercapai || tpResult?.deskripsiTercapai || '',
        deskripsiPerluPeningkatan: sc?.deskripsiPerluPeningkatan || tpResult?.deskripsiPerluPeningkatan || ''
      }
    };
  });

  // Ekstrakurikuler
  const studentEkskul = db.ekstrakurikuler.filter(
    (e) => matchesStudentRecord(e, currentStudent) && e.kelas === selectedKelas && e.semester === selectedSemester
  );

  // Kehadiran
  const studentAtt = db.kehadiran.find(
    (h) => matchesStudentRecord(h, currentStudent) && h.kelas === selectedKelas && h.semester === selectedSemester
  ) || { sakit: 0, izin: 0, alpa: 0 };

  // Catatan wali kelas (berbeda tiap semester)
  const studentNote =
    db.catatanWali.find(
      (c) => matchesStudentRecord(c, currentStudent) && c.kelas === selectedKelas && c.semester === selectedSemester
    )?.catatanWaliKelas || '';

  // Keputusan (khusus Semester 2)
  const studentDecision = db.keputusanSiswa?.find(
    (k) => matchesStudentRecord(k, currentStudent) && k.kelas === selectedKelas && k.semester === selectedSemester
  );

  const waliKelasData = db.kelas.find((k) => k.namaKelas === selectedKelas);
  const matchedTeacher = db.guru.find((g) => g.namaGuru === waliKelasData?.waliKelas) || db.guru[0];
  const waliKelasGuru = {
    namaGuru: db.sekolah.waliKelas || matchedTeacher?.namaGuru || 'Yohana Ibu, S.Pd',
    nip: db.sekolah.nipWaliKelas || matchedTeacher?.nip || '-'
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200 print:static print:inset-auto print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          @page {
            size: ${finalPageCssSize};
            margin: ${paperMargins.top}mm ${paperMargins.right}mm ${paperMargins.bottom}mm ${paperMargins.left}mm;
          }
        }
      `}</style>
      {/* Top Header Controls (Hidden on Print) */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg no-print shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-xs">
            <Eye size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-500/30">
                PRATINJAU RAPOR RESMI
              </span>
              <span className="text-xs font-mono text-slate-400">
                Kertas: <strong>{paperSize} ({paperOrientation === 'portrait' ? 'Vertikal' : 'Horizontal'})</strong> • Margin:{' '}
                <strong>{paperMargins.top}/{paperMargins.bottom}/{paperMargins.left}/{paperMargins.right}mm</strong> • Zoom:{' '}
                <strong>{zoomLevel}%</strong>
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white">
              {currentStudent.namaSiswa} ({currentStudent.nisn || '-'})
            </h2>
          </div>
        </div>

        {/* Student Navigator & Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
          <button
            onClick={handlePrevStudent}
            disabled={currentIdx <= 0}
            className="p-1.5 hover:bg-slate-700 text-slate-300 disabled:opacity-30 rounded-lg cursor-pointer"
            title="Siswa Sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <select
            value={currentStudent.idSiswa}
            onChange={(e) => setPrintTargetStudentId(e.target.value)}
            className="bg-transparent text-xs font-bold text-amber-300 px-2 py-1 focus:outline-hidden cursor-pointer max-w-[200px] truncate"
          >
            {siswaKelas.map((s, idx) => (
              <option key={s.idSiswa} value={s.idSiswa} className="bg-slate-900 text-white">
                {idx + 1}. {s.namaSiswa}
              </option>
            ))}
          </select>
          <button
            onClick={handleNextStudent}
            disabled={currentIdx >= siswaKelas.length - 1}
            className="p-1.5 hover:bg-slate-700 text-slate-300 disabled:opacity-30 rounded-lg cursor-pointer"
            title="Siswa Berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Action Buttons: Kertas, Font, Size, Zoom, Sync, Print, Close */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Paper Size & Vertikal/Horizontal Switcher */}
          <div className="inline-flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs gap-1">
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as PaperSize)}
              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold text-amber-300 focus:outline-hidden cursor-pointer"
              title="Pilih Ukuran Kertas"
            >
              <option value="F4">F4</option>
              <option value="A4">A4</option>
              <option value="Legal">Legal</option>
              <option value="Letter">Letter</option>
            </select>
            <button
              type="button"
              onClick={() => setPaperOrientation('portrait')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                paperOrientation === 'portrait'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
              title="Bentuk Kertas Vertikal (Portrait)"
            >
              ▯ Vertikal
            </button>
            <button
              type="button"
              onClick={() => setPaperOrientation('landscape')}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                paperOrientation === 'landscape'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
              title="Bentuk Kertas Horizontal (Landscape)"
            >
              ▭ Horizontal
            </button>
          </div>

          {/* Bentuk Huruf (Font Family) */}
          <div className="inline-flex items-center bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 text-xs gap-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase hidden md:inline">Font:</span>
            <select
              value={printFontFamily}
              onChange={(e) => {
                setPrintFontFamily(e.target.value);
                showSaveNotification(`Bentuk huruf diubah ke ${e.target.value}`);
              }}
              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold text-amber-300 focus:outline-hidden cursor-pointer max-w-[130px] truncate"
              style={{ fontFamily: reportFontCss }}
              title="Pilih Bentuk Huruf Cetak Rapor"
            >
              {AVAILABLE_FONTS.map((f) => (
                <option key={f.id} value={f.name} style={{ fontFamily: f.family }} className="bg-slate-900 text-white">
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ukuran Huruf (Font Size) */}
          <div className="inline-flex items-center bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 text-xs gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase hidden md:inline">Size:</span>
            <select
              value={printFontSize}
              onChange={(e) => {
                setPrintFontSize(e.target.value);
                showSaveNotification(`Ukuran huruf diatur ke ${e.target.value}`);
              }}
              className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold text-blue-300 focus:outline-hidden cursor-pointer"
              title="Pilih Ukuran Huruf Rapor"
            >
              {AVAILABLE_SIZES.map((s) => (
                <option key={s.size} value={s.size} className="bg-slate-900 text-white">
                  {s.size}
                </option>
              ))}
            </select>
            <div className="inline-flex items-center ml-0.5 border-l border-slate-700 pl-1 gap-0.5">
              <button
                type="button"
                onClick={() => {
                  const currentNum = parseFloat(printFontSize) || 11;
                  const step = currentNum > 16 ? 2 : currentNum > 12 ? 1 : 0.5;
                  const nextNum = Math.max(8, Math.round((currentNum - step) * 2) / 2);
                  setPrintFontSize(`${nextNum}pt`);
                }}
                className="px-1.5 py-0.5 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer"
                title="Perkecil Ukuran Huruf"
              >
                Aˇ
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentNum = parseFloat(printFontSize) || 11;
                  const step = currentNum >= 16 ? 2 : currentNum >= 12 ? 1 : 0.5;
                  const nextNum = Math.min(24, Math.round((currentNum + step) * 2) / 2);
                  setPrintFontSize(`${nextNum}pt`);
                }}
                className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-black cursor-pointer"
                title="Perbesar Ukuran Huruf (hingga 24pt)"
              >
                A^
              </button>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="inline-flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs text-slate-300">
            <button
              onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
              className="p-1 hover:text-white rounded cursor-pointer"
              title="Perkecil Tampilan"
            >
              <ZoomOut size={14} />
            </button>
            <span className="px-1.5 text-[11px] font-mono">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
              className="p-1 hover:text-white rounded cursor-pointer"
              title="Perbesar Tampilan"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all hover:scale-102 ring-2 ring-emerald-400/40"
            title="Cetak langsung lembar rapor ini ke Printer / PDF"
          >
            <Printer size={15} className="text-amber-300" />
            <span>CETAK SEKARANG</span>
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Tutup Pratinjau (ESC)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Secondary Bar: Tab Switcher Halaman Rapor */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 no-print shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <span className="text-slate-400 mr-1 text-[11px]">Pilih Lembar:</span>
          <button
            onClick={() => setActiveTab('semua')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'semua'
                ? 'bg-slate-100 text-slate-900 shadow-xs'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            📑 Semua Halaman
          </button>
          <button
            onClick={() => setActiveTab('kaver')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'kaver'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            📘 Hal 1 (Kaver)
          </button>
          <button
            onClick={() => setActiveTab('sekolah')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'sekolah'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            🏫 Hal 2 (Sekolah)
          </button>
          <button
            onClick={() => setActiveTab('siswa')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'siswa'
                ? 'bg-purple-500 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            👤 Hal 3 (Biodata)
          </button>
          <button
            onClick={() => setActiveTab('nilai')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'nilai'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            📄 Hal 4 (Nilai)
          </button>
          <button
            onClick={() => setActiveTab('ttd')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'ttd'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            📝 Hal 5 (Catatan & TTD)
          </button>
        </div>

        <div className="text-[11px] text-slate-400">
          Gunakan mouse scroll untuk melihat lembar rapor ke bawah
        </div>
      </div>

      {/* Main Preview Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60 print:p-0 print:overflow-visible print:bg-white flex justify-center">
        <div
          className={`space-y-8 transition-transform origin-top w-full ${
            paperOrientation === 'landscape'
              ? 'max-w-6xl report-paper-sheet--landscape'
              : 'max-w-4xl report-paper-sheet--portrait'
          } print:max-w-none print:transform-none`}
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        >
          {/* HAL 1: KAVER */}
          {(activeTab === 'semua' || activeTab === 'kaver') && (
            <div className="bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden print:border-none print:shadow-none print-page-break print:m-0 print:p-0">
              <ReportCoverPage sekolah={db.sekolah} student={currentStudent} paperSize={paperSize} paperOrientation={paperOrientation} fontFamily={printFontFamily} fontSize={printFontSize} />
            </div>
          )}

          {/* HAL 2: SEKOLAH */}
          {(activeTab === 'semua' || activeTab === 'sekolah') && (
            <div className="bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden print:border-none print:shadow-none print-page-break print:m-0 print:p-0">
              <ReportSchoolIdentityPage sekolah={db.sekolah} paperSize={paperSize} paperOrientation={paperOrientation} fontFamily={printFontFamily} fontSize={printFontSize} />
            </div>
          )}

          {/* HAL 3: SISWA */}
          {(activeTab === 'semua' || activeTab === 'siswa') && (
            <div className="bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden print:border-none print:shadow-none print-page-break print:m-0 print:p-0">
              <ReportStudentIdentityPage sekolah={db.sekolah} student={currentStudent} paperSize={paperSize} paperOrientation={paperOrientation} fontFamily={printFontFamily} fontSize={printFontSize} />
            </div>
          )}

          {/* HAL 4: LEMBAR NILAI */}
          {(activeTab === 'semua' || activeTab === 'nilai') && (
            <div
              className="report-typography-scope report-paper-sheet bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 print-page-break text-slate-900"
              style={{ fontFamily: reportFontCss, fontSize: printFontSize, lineHeight: printLineHeight }}
            >
              <ReportAcademicHeaderAndScores
                student={currentStudent}
                sekolah={db.sekolah}
                selectedKelas={selectedKelas}
                selectedFase={getFaseFromKelas(selectedKelas)}
                semester={selectedSemester}
                studentScores={studentScores}
              />
              <div className="pt-3 border-t border-slate-300 flex justify-between text-[10px] text-slate-500 font-mono mt-4">
                <span>Rapor Peserta Didik • {currentStudent.namaSiswa}</span>
                <span>Halaman 4 dari 5</span>
              </div>
            </div>
          )}

          {/* HAL 5: EKSTRAKURIKULER, CATATAN WALI, KETIDAKHADIRAN, KEPUTUSAN (SEM 2) & TTD */}
          {(activeTab === 'semua' || activeTab === 'ttd') && (
            <div
              className="report-typography-scope report-paper-sheet bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 print-page-break text-slate-900"
              style={{ fontFamily: reportFontCss, fontSize: printFontSize, lineHeight: printLineHeight }}
            >
              <ReportExtracurricularTable studentEkskul={studentEkskul} />

              {/* Catatan Wali Kelas, Ketidakhadiran, Keputusan (Semester 2) & Tanda Tangan */}
              <ReportBottomSection
                semester={selectedSemester}
                student={currentStudent}
                selectedKelas={selectedKelas}
                sekolah={db.sekolah}
                waliKelasGuru={waliKelasGuru}
                catatanWaliKelas={studentNote}
                kehadiran={studentAtt}
                keputusan={studentDecision}
              />

              <div className="pt-4 border-t border-slate-300 flex justify-between text-[10px] text-slate-500 font-mono mt-6">
                <span>Rapor Peserta Didik • {currentStudent.namaSiswa}</span>
                <span>Halaman 5 dari 5</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
