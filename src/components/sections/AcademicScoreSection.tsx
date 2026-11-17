import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Save,
  CheckCircle2,
  Sparkles,
  Calculator,
  Filter,
  RefreshCw,
  Search,
  BookOpen,
  FolderDown,
  Eye,
  Link2,
  Zap,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AcademicScore } from '../../types';
import { StandardActionToolbar } from '../common/StandardActionToolbar';
import { SaveStatusIndicator } from '../common/SaveStatusIndicator';
import { StudentFilterSelect } from '../common/StudentFilterSelect';
import { useSaveFeedback } from '../../hooks/useSaveFeedback';
import {
  generateReportDescriptionFromTP,
  getPredikatFromScore,
  getCapaianFromScore,
  clampScore,
  SCORE_INPUT_FIELDS,
  calculateScoreSummaryFromFreeInputs,
  type ScoreInputField
} from '../../utils/tpDescriptionHelper';
import {
  exportSubjectScoresToExcel,
  exportSubjectScoresToCsv,
  exportClassComprehensiveWorkbook
} from '../../utils/exportHelper';
import * as XLSX from 'xlsx';
import { parseAndImportTemplate } from '../../utils/templateImporter';
import { matchesStudentScore, isPlaceholderNisn } from '../../utils/studentSyncHelper';

export const AcademicScoreSection: React.FC = () => {
  const appContext = useApp();
  const {
    db,
    selectedKelas,
    selectedSemester,
    filteredStudent,
    saveNilaiAkademik,
    bulkSaveNilai,
    syncAllScoresWithTPDescriptions,
    showSaveNotification,
    setActiveMenu,
    openReportPreview
  } = appContext;
  const { status: saveStatus, triggerSave, lastSavedTime } = useSaveFeedback();
  const [selectedMapel, setSelectedMapel] = useState<string>(
    db.mataPelajaran[2]?.mataPelajaran || db.mataPelajaran[0]?.mataPelajaran || 'Bahasa Indonesia'
  );
  // Default tampilkan semua 8 kolom input bebas (Formatif, Sumatif, PH1, PH2, PH3, PTS, PAS/SAS, Praktik)
  const [showAllInputColumns, setShowAllInputColumns] = useState<boolean>(true);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const siswaKelas = db.siswa.filter((s) => s.kelas === selectedKelas);
  const displayedSiswa = filteredStudent
    ? siswaKelas.filter((s) => s.nisn === filteredStudent.nisn)
    : siswaKelas;

  const generateAutoTpBundle = (nilaiAkhir: number, namaSiswa: string, agamaSiswa?: string, mapelName = selectedMapel) => {
    return generateReportDescriptionFromTP(
      mapelName,
      selectedKelas,
      nilaiAkhir,
      db.tujuanPembelajaran,
      namaSiswa,
      agamaSiswa
    );
  };

  const buildInitialRow = (s: (typeof siswaKelas)[number], mapelName: string): AcademicScore => {
    const existing = db.nilaiAkademik.find(
      (n) => matchesStudentScore(n, s) && n.mataPelajaran === mapelName && n.semester === selectedSemester
    );
    const mapelObj = db.mataPelajaran.find((m) => m.mataPelajaran === mapelName);
    const mapelSlug = mapelName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
    if (existing) {
      const summary = calculateScoreSummaryFromFreeInputs(existing, SCORE_INPUT_FIELDS);
      const effectiveNA = summary.filledCount > 0 ? summary.nilaiAkhir : existing.nilaiAkhir;
      return {
        ...existing,
        idSiswa: s.idSiswa,
        nisn: s.nisn,
        namaSiswa: s.namaSiswa,
        kelas: selectedKelas,
        kkm: mapelObj?.kkm ?? existing.kkm ?? 75,
        jumlahNilai: summary.filledCount > 0 ? summary.jumlahNilai : (existing.jumlahNilai ?? 0),
        nilaiAkhir: existing.nilaiAkhir ?? effectiveNA
      };
    }
    return {
      idNilai: `N_${s.idSiswa}_${mapelSlug}_${selectedSemester}`,
      idSiswa: s.idSiswa,
      tahunPelajaran: db.sekolah.tahunPelajaran,
      semester: selectedSemester,
      kelas: selectedKelas,
      nisn: s.nisn,
      namaSiswa: s.namaSiswa,
      mataPelajaran: mapelName,
      kkm: mapelObj?.kkm ?? 75,
      // Semua kolom input nilai dibiarkan bebas / kosong terlebih dahulu
      formatif: undefined,
      sumatif: undefined,
      ph1: undefined,
      ph2: undefined,
      ph3: undefined,
      pts: undefined,
      pas: undefined,
      praktik: undefined,
      jumlahNilai: 0,
      nilaiAkhir: 0,
      predikat: 'Perlu Bimbingan',
      capaianKompetensi: 'Perlu Pendampingan',
      deskripsiTercapai: '',
      deskripsiPerluPeningkatan: '',
      deskripsiRapor: ''
    };
  };

  // Local table state keyed strictly by unique idSiswa (never by nisn, so '-' never collides)
  const [rows, setRows] = useState<Record<string, AcademicScore>>(() => {
    const initialMap: Record<string, AcademicScore> = {};
    siswaKelas.forEach((s) => {
      initialMap[s.idSiswa] = buildInitialRow(s, selectedMapel);
    });
    return initialMap;
  });

  // Auto-sinkronisasi: pastikan setiap siswa, nama siswa, dan nilai dari db selalu terhubung real-time
  useEffect(() => {
    setRows(() => {
      const next: Record<string, AcademicScore> = {};
      siswaKelas.forEach((s) => {
        next[s.idSiswa] = buildInitialRow(s, selectedMapel);
      });
      return next;
    });
  }, [db.siswa, db.nilaiAkademik, db.tujuanPembelajaran, selectedMapel, selectedSemester, selectedKelas]);

  // Re-synchronize when mapel changes
  const handleMapelChange = (newMapel: string) => {
    setSelectedMapel(newMapel);
    const initialMap: Record<string, AcademicScore> = {};
    siswaKelas.forEach((s) => {
      initialMap[s.idSiswa] = buildInitialRow(s, newMapel);
    });
    setRows(initialMap);
  };

  const updateCell = (studentId: string, field: keyof AcademicScore, value: any) => {
    const studentObj = db.siswa.find((s) => s.idSiswa === studentId) || siswaKelas.find((s) => s.idSiswa === studentId);
    if (!studentObj) return;
    const current = rows[studentId] || buildInitialRow(studentObj, selectedMapel);

    let updated: AcademicScore = {
      ...current,
      idSiswa: studentObj.idSiswa,
      nisn: studentObj.nisn,
      namaSiswa: studentObj.namaSiswa
    };

    if ((SCORE_INPUT_FIELDS as readonly string[]).includes(field as string)) {
      // Kolom input bebas: Formatif, Sumatif, PH1, PH2, PH3, PTS, PAS, Praktik
      // Boleh dikosongkan ('') atau diisi 0-100 secara bebas tanpa saling menimpa
      const rawStr = String(value ?? '').trim();
      const parsedVal = rawStr === '' ? undefined : clampScore(rawStr);
      updated = { ...updated, [field as ScoreInputField]: parsedVal };

      // Rumus otomatis HANYA pada: Jumlah Nilai, Nilai Akhir, Predikat, Capaian, dan Deskripsi Rapor
      const { jumlahNilai, nilaiAkhir, filledCount } = calculateScoreSummaryFromFreeInputs(
        updated,
        SCORE_INPUT_FIELDS
      );

      updated.jumlahNilai = jumlahNilai;
      updated.nilaiAkhir = nilaiAkhir;
      updated.predikat = getPredikatFromScore(nilaiAkhir);
      updated.capaianKompetensi = getCapaianFromScore(nilaiAkhir);

      if (filledCount > 0) {
        const tpRes = generateAutoTpBundle(
          nilaiAkhir,
          studentObj.namaSiswa,
          studentObj.agama
        );
        updated.deskripsiTercapai = tpRes.deskripsiTercapai;
        updated.deskripsiPerluPeningkatan = tpRes.deskripsiPerluPeningkatan;
        updated.deskripsiRapor = tpRes.deskripsiRapor;
      } else {
        updated.deskripsiTercapai = '';
        updated.deskripsiPerluPeningkatan = '';
        updated.deskripsiRapor = '';
      }
    } else if (field === 'nilaiAkhir') {
      // Jika Nilai Akhir disesuaikan manual, TIDAK menyentuh/menimpa kolom Sumatif/Formatif/PH1-3/PTS/PAS/Praktik
      const rawStr = String(value ?? '').trim();
      const na = rawStr === '' ? 0 : clampScore(rawStr);
      const tpRes = generateAutoTpBundle(na, studentObj.namaSiswa, studentObj.agama);
      updated = {
        ...updated,
        nilaiAkhir: na,
        predikat: getPredikatFromScore(na),
        capaianKompetensi: getCapaianFromScore(na),
        deskripsiTercapai: rawStr === '' ? '' : tpRes.deskripsiTercapai,
        deskripsiPerluPeningkatan: rawStr === '' ? '' : tpRes.deskripsiPerluPeningkatan,
        deskripsiRapor: rawStr === '' ? '' : tpRes.deskripsiRapor
      };
    } else {
      updated = { ...updated, [field]: value };
    }

    setRows((prev) => ({ ...prev, [studentId]: updated }));
    // Sinkronkan langsung ke database lokal/context secara senyap agar Deskripsi Rapor & Cetak Rapor langsung terbarui
    saveNilaiAkademik(updated, true);
  };

  const handleSaveAll = () => {
    triggerSave(() => {
      const listToSave = Object.values(rows);
      bulkSaveNilai(listToSave);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    });
  };

  // Hitung ulang semua Jumlah Nilai, Nilai Akhir, Predikat, dan Deskripsi Rapor dari kolom input yang diisi
  const handleRecalculateAll = () => {
    const recalculated: Record<string, AcademicScore> = {};
    Object.keys(rows).forEach((studentId) => {
      const item = rows[studentId];
      const studentObj = db.siswa.find((s) => s.idSiswa === studentId);
      const { jumlahNilai, nilaiAkhir, filledCount } = calculateScoreSummaryFromFreeInputs(
        item,
        SCORE_INPUT_FIELDS
      );
      const effectiveNA = filledCount > 0 ? nilaiAkhir : item.nilaiAkhir || 0;
      const hasScore = filledCount > 0 || effectiveNA > 0;
      const tpRes = hasScore
        ? generateAutoTpBundle(
            effectiveNA,
            studentObj?.namaSiswa || item.namaSiswa,
            studentObj?.agama
          )
        : { deskripsiTercapai: '', deskripsiPerluPeningkatan: '', deskripsiRapor: '' };
      recalculated[studentId] = {
        ...item,
        idSiswa: studentObj?.idSiswa || item.idSiswa,
        nisn: studentObj?.nisn || item.nisn,
        namaSiswa: studentObj?.namaSiswa || item.namaSiswa,
        jumlahNilai,
        nilaiAkhir: effectiveNA,
        predikat: getPredikatFromScore(effectiveNA),
        capaianKompetensi: getCapaianFromScore(effectiveNA),
        deskripsiTercapai: tpRes.deskripsiTercapai,
        deskripsiPerluPeningkatan: tpRes.deskripsiPerluPeningkatan,
        deskripsiRapor: tpRes.deskripsiRapor
      };
    });
    setRows(recalculated);
    triggerSave(() => {
      bulkSaveNilai(Object.values(recalculated));
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    });
  };

  // Hubungkan semua siswa ke seluruh mata pelajaran & terapkan rumus otomatis (tanpa menimpa kolom input bebas)
  const handleConnectAllStudentsToAllSubjects = () => {
    const allSubjects = db.mataPelajaran;
    const targetStudents = siswaKelas.length > 0 ? siswaKelas : db.siswa;
    const scoresToSave: AcademicScore[] = [];

    targetStudents.forEach((student) => {
      allSubjects.forEach((mapel) => {
        const existing = db.nilaiAkademik.find(
          (n) =>
            matchesStudentScore(n, student) &&
            n.mataPelajaran === mapel.mataPelajaran &&
            n.kelas === student.kelas &&
            n.semester === selectedSemester
        );

        const summary = existing
          ? calculateScoreSummaryFromFreeInputs(existing, SCORE_INPUT_FIELDS)
          : { jumlahNilai: 0, nilaiAkhir: 0, filledCount: 0 };
        const calculatedNA =
          summary.filledCount > 0 ? summary.nilaiAkhir : (existing?.nilaiAkhir ?? 0);
        const hasScore = summary.filledCount > 0 || calculatedNA > 0;
        const predikat = getPredikatFromScore(calculatedNA);
        const capaian = getCapaianFromScore(calculatedNA);
        const tpRes = hasScore
          ? generateReportDescriptionFromTP(
              mapel.mataPelajaran,
              student.kelas,
              calculatedNA,
              db.tujuanPembelajaran,
              student.namaSiswa,
              student.agama
            )
          : {
              deskripsiTercapai: '',
              deskripsiPerluPeningkatan: '',
              deskripsiRapor: ''
            };

        scoresToSave.push({
          idNilai:
            existing?.idNilai ||
            `N_${student.idSiswa}_${mapel.mataPelajaran.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)}_${selectedSemester}`,
          idSiswa: student.idSiswa,
          tahunPelajaran: db.sekolah.tahunPelajaran,
          semester: selectedSemester,
          kelas: student.kelas,
          nisn: student.nisn,
          namaSiswa: student.namaSiswa,
          mataPelajaran: mapel.mataPelajaran,
          kkm: mapel.kkm ?? existing?.kkm ?? 75,
          formatif: existing?.formatif,
          sumatif: existing?.sumatif,
          ph1: existing?.ph1,
          ph2: existing?.ph2,
          ph3: existing?.ph3,
          pts: existing?.pts,
          pas: existing?.pas,
          praktik: existing?.praktik,
          jumlahNilai: summary.jumlahNilai,
          nilaiAkhir: calculatedNA,
          predikat,
          capaianKompetensi: capaian,
          deskripsiTercapai: tpRes.deskripsiTercapai,
          deskripsiPerluPeningkatan: tpRes.deskripsiPerluPeningkatan,
          deskripsiRapor: tpRes.deskripsiRapor
        });
      });
    });

    bulkSaveNilai(scoresToSave);
    showSaveNotification(
      `Berhasil menghubungkan ${targetStudents.length} siswa ke seluruh ${allSubjects.length} mata pelajaran dengan rumus otomatis Jumlah Nilai, Nilai Akhir, Predikat & Deskripsi Rapor!`
    );

    handleMapelChange(selectedMapel);
  };

  // Expor Nilai Mata Pelajaran Aktif ke Excel (.xlsx)
  const handleExportExcel = () => {
    exportSubjectScoresToExcel(Object.values(rows), selectedMapel, selectedKelas, selectedSemester, db.sekolah);
  };

  // Expor Nilai Mata Pelajaran Aktif ke CSV (.csv)
  const handleExportCsv = () => {
    exportSubjectScoresToCsv(Object.values(rows), selectedMapel, selectedKelas, selectedSemester, db.sekolah);
  };

  // Expor Buku Nilai Komplit Seluruh Mata Pelajaran Sekelas (.xlsx) Multi-Sheet
  const handleExportFullWorkbook = () => {
    exportClassComprehensiveWorkbook(db, selectedKelas, selectedSemester);
  };

  // Impor file Excel/CSV
  const handleImportFile = async (file: File) => {
    try {
      const result = await parseAndImportTemplate(file, 'template_nilai_akademik', appContext);
      if (result.success) {
        showSaveNotification(result.message);
        setTimeout(() => {
          setRows((prev) => {
            const next = { ...prev };
            const currentScores = appContext.db.nilaiAkademik;
            siswaKelas.forEach((s) => {
              const matched = currentScores.find(
                (n) => matchesStudentScore(n, s) && n.mataPelajaran === selectedMapel && n.semester === selectedSemester
              );
              if (matched) {
                next[s.idSiswa] = { ...matched, idSiswa: s.idSiswa };
              }
            });
            return next;
          });
        }, 100);
      } else {
        showSaveNotification(`Gagal impor: ${result.message}`);
      }
    } catch (e: any) {
      console.error('Import error', e);
      showSaveNotification('Gagal mengimpor file nilai: ' + (e?.message || 'Format berkas tidak sesuai'));
    }
  };

  // Bersihkan nilai / Kosongkan kolom input bebas (bisa Undo kapan saja)
  const handleClearScores = () => {
    const clearedList: AcademicScore[] = [];
    setRows((prev) => {
      const resetMap: Record<string, AcademicScore> = {};
      Object.entries(prev).forEach(([studentId, score]) => {
        const cleared: AcademicScore = {
          ...score,
          formatif: undefined,
          sumatif: undefined,
          ph1: undefined,
          ph2: undefined,
          ph3: undefined,
          pts: undefined,
          pas: undefined,
          praktik: undefined,
          jumlahNilai: 0,
          nilaiAkhir: 0,
          predikat: 'Perlu Bimbingan',
          capaianKompetensi: 'Perlu Pendampingan',
          deskripsiTercapai: '',
          deskripsiPerluPeningkatan: '',
          deskripsiRapor: ''
        };
        resetMap[studentId] = cleared;
        clearedList.push(cleared);
      });
      return resetMap;
    });
    if (clearedList.length > 0) {
      bulkSaveNilai(clearedList, true);
    }
    showSaveNotification(`Nilai input untuk ${selectedMapel} berhasil dikosongkan!`);
  };

  // Unduh template resmi nilai akademik terhubung TP
  const handleDownloadTemplate = () => {
    const schoolName = db.sekolah.namaSekolah || 'SD NEGERI BALIL';
    const schoolYear = db.sekolah.tahunPelajaran || '2026/2027';
    const pemda = db.sekolah.namaPemerintah || 'PEMERINTAH KABUPATEN PEGUNUNGAN BINTANG';
    const instansi = db.sekolah.namaInstansi || 'DINAS PENDIDIKAN DAN PENGAJARAN';
    const localScores: AcademicScore[] = Object.values(rows);

    const wb = XLSX.utils.book_new();
    const columns = [
      'NISN',
      'Nama Siswa',
      'Kelas',
      'Semester',
      'Mata Pelajaran',
      'Formatif (0-100)',
      'Sumatif (0-100)',
      'PH1',
      'PH2',
      'PH3',
      'PTS',
      'PAS',
      'Praktik',
      'Jumlah Nilai',
      'Nilai Akhir',
      'Predikat',
      'Kode TP Terhubung',
      'Deskripsi Capaian dari TP'
    ];

    const aoaData: (string | number)[][] = [
      [pemda],
      [instansi],
      [schoolName],
      [`FORMAT NILAI AKADEMIK & CAPAIAN TP: ${selectedMapel.toUpperCase()}`],
      [`Kelas: ${selectedKelas} • Semester: ${selectedSemester} • Tahun Pelajaran: ${schoolYear}`],
      [],
      ['NO', ...columns],
      ['(1)', ...columns.map((_, i) => `(${i + 2})`)],
      ...localScores.map((s, idx) => {
        const tpRes = generateReportDescriptionFromTP(
          selectedMapel,
          selectedKelas,
          s.nilaiAkhir,
          db.tujuanPembelajaran,
          s.namaSiswa
        );
        return [
          idx + 1,
          s.nisn,
          s.namaSiswa,
          selectedKelas,
          selectedSemester,
          selectedMapel,
          s.formatif ?? '',
          s.sumatif ?? '',
          s.ph1 ?? '',
          s.ph2 ?? '',
          s.ph3 ?? '',
          s.pts ?? '',
          s.pas ?? '',
          s.praktik ?? '',
          s.jumlahNilai ?? 0,
          s.nilaiAkhir,
          s.predikat,
          tpRes.linkedTpKodes.join(', ') || 'TP001',
          s.deskripsiRapor || tpRes.deskripsiRapor
        ];
      })
    ];

    for (let i = 0; i < 10; i++) {
      aoaData.push([localScores.length + 1 + i, ...columns.map(() => '')]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoaData);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 30 },
      { wch: 8 },
      { wch: 10 },
      { wch: 28 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 55 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Template Nilai');
    const safeName = selectedMapel.toLowerCase().replace(/[^a-z0-9]/g, '-');
    XLSX.writeFile(wb, `template-nilai-${safeName}-kelas-${selectedKelas}.xlsx`);
    showSaveNotification(`Template nilai resmi untuk ${selectedMapel} berhasil diunduh!`);
  };

  const renderFreeScoreInput = (
    studentId: string,
    field: ScoreInputField,
    val: number | undefined,
    label: string
  ) => (
    <input
      type="number"
      min="0"
      max="100"
      placeholder="-"
      title={`Input bebas ${label} (0-100 atau kosongkan)`}
      value={val ?? ''}
      onChange={(e) => updateCell(studentId, field, e.target.value)}
      className="w-14 px-1.5 py-1 text-center font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
    />
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700">
              Penilaian Akademik
            </span>
            <h2 className="text-xl font-bold text-slate-800">Input Nilai Akademik / Rapor Biasa</h2>
            <p className="text-xs text-slate-500">
              Kelas {selectedKelas} Semester {selectedSemester}. Kolom Formatif, Sumatif, PH1–3, PTS, PAS &amp; Praktik bebas diisi — Jumlah Nilai, Nilai Akhir, Predikat &amp; Deskripsi Rapor dihitung otomatis.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-900 text-white border-2 border-emerald-400 text-xs font-bold shadow-md animate-pulse">
              <CheckCircle2 size={15} className="text-emerald-300" />
              <span>&ldquo;Teleb Kan Data sekmarima sirya Dibmar&rdquo;</span>
            </span>
          )}
          <button
            onClick={handleConnectAllStudentsToAllSubjects}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer ring-2 ring-emerald-300 hover:scale-102"
            title="Hubungkan seluruh siswa ke setiap mata pelajaran dan hitung otomatis Jumlah Nilai, Nilai Akhir, Predikat & Deskripsi Rapor"
          >
            <Zap size={15} className="text-amber-300 fill-amber-300" />
            <span>🚀 Hubungkan Semua Siswa ke Seluruh Mapel</span>
          </button>
          <button
            onClick={() => {
              const count = syncAllScoresWithTPDescriptions();
              showSaveNotification(`Berhasil memperbarui ${count} data deskripsi nilai dari TP ke semua rapor!`);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer"
            title="Hubungkan & perbarui rumusan deskripsi seluruh rapor dari database TP mata pelajaran"
          >
            <CheckCircle2 size={15} /> ⚡ Hubungkan TP ke Rapor
          </button>
          <button
            onClick={() => openReportPreview()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer ring-2 ring-purple-300 hover:scale-102"
            title="Lihat Pratinjau Rapor Lengkap Siswa Langsung"
          >
            <Eye size={15} className="text-amber-300" /> 👁️ Preview Rapor
          </button>
          {/* Tombol Ekspor Nilai Excel & CSV */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-all shadow-xs cursor-pointer hover:scale-102"
              title={`Ekspor Nilai ${selectedMapel} ke format Excel (.xlsx)`}
            >
              <FileSpreadsheet size={14} /> Ekspor Mapel (.xlsx)
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer hover:scale-102"
              title={`Ekspor Nilai ${selectedMapel} ke format CSV (.csv)`}
            >
              <Download size={13} /> CSV (.csv)
            </button>
            <button
              onClick={handleExportFullWorkbook}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs rounded-lg transition-all shadow-xs cursor-pointer hover:scale-102"
              title="Ekspor Seluruh Nilai Semua Mata Pelajaran Sekelas ke 1 File Excel Multi-Sheet (Leger + Siswa + Tiap Mapel)"
            >
              <FileSpreadsheet size={14} /> 📦 Buku Nilai Sekelas (.xlsx)
            </button>
          </div>

          <button
            onClick={() => setActiveMenu('template_data')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-indigo-200"
            title="Lihat & Unduh Template Format Nilai Excel/CSV"
          >
            <FolderDown size={15} /> Unduh Template Nilai
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveAll}
              disabled={saveStatus === 'saving'}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save size={15} /> Simpan Semua Nilai Mapel Ini
            </button>
            <SaveStatusIndicator
              status={saveStatus}
              lastSavedText={lastSavedTime}
            />
          </div>
        </div>
      </div>

      {/* INFO RUMUS INPUT BEBAS & OTOMATIS */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border border-blue-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <Calculator size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                Input Nilai Bebas + Rumus Hasil Otomatis
              </span>
              <span className="text-[11px] font-bold text-slate-600">
                Formatif, Sumatif, PH1, PH2, PH3, PTS, PAS, Praktik bebas diisi
              </span>
            </div>
            <p className="text-xs text-slate-700 font-medium mt-1">
              <strong>Kolom Input Bebas:</strong>{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono font-bold text-slate-800">
                Formatif, Sumatif, PH1, PH2, PH3, PTS, PAS/SAS, Praktik (Tanpa rumus timpa otomatis)
              </code>
              <span className="mx-2 text-slate-400">•</span>
              <strong>Rumus Otomatis:</strong>{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-blue-300 text-blue-900 font-mono font-bold">
                Jumlah Nilai = Total Kolom Terisi • Nilai Akhir = Jumlah ÷ Kolom Terisi • Predikat &amp; Deskripsi Rapor Otomatis
              </code>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Anda bebas mengisi kolom mana saja (misal hanya Formatif &amp; Sumatif, atau PH1–3, PTS, PAS, Praktik, atau semuanya) — kolom kosong tidak ikut membagi rata-rata!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRecalculateAll}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Hitung Ulang Otomatis Sekarang</span>
        </button>
      </div>

      {/* BARIS TOMBOL AKSI LENGKAP DI SAMPING INPUT NILAI */}
      <StandardActionToolbar
        title="Aksi Nilai Akademik"
        badge={`Mapel: ${selectedMapel}`}
        onSave={handleSaveAll}
        saveLabel="Simpan Nilai"
        saveStatus={saveStatus}
        onUpdate={handleRecalculateAll}
        updateLabel="Update & Hitung Nilai"
        onEdit={() => setShowAllInputColumns(!showAllInputColumns)}
        editLabel={showAllInputColumns ? 'Tampilan: 8 Kolom Bebas' : 'Tampilkan Semua 8 Kolom'}
        isEditing={showAllInputColumns}
        onCancel={() => handleMapelChange(selectedMapel)}
        cancelLabel="Batal / Reset Nilai"
        onDelete={handleClearScores}
        deleteLabel="Hapus / Kosongkan"
        onImport={handleImportFile}
        importLabel="Impor Excel"
        onExport={handleExportExcel}
        exportLabel="Expor Excel (.xlsx)"
        onUpload={handleImportFile}
        uploadLabel="Upload File Nilai"
        onClear={handleClearScores}
        clearLabel="Bersihkan File"
        onTemplate={handleDownloadTemplate}
        templateLabel="Template Nilai"
      />

      {/* Mapel Switcher & View Mode Toggle */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Pilih Mata Pelajaran:</span>
            <select
              value={selectedMapel}
              onChange={(e) => handleMapelChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl text-emerald-800 focus:outline-hidden"
            >
              {db.mataPelajaran.map((m) => (
                <option key={m.kode || m.mataPelajaran} value={m.mataPelajaran}>
                  {m.mataPelajaran} ({m.kelompok})
                </option>
              ))}
            </select>
          </div>

          <StudentFilterSelect />

          <button
            type="button"
            onClick={() => setShowAllInputColumns(!showAllInputColumns)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border cursor-pointer ${
              showAllInputColumns
                ? 'bg-purple-100 text-purple-900 border-purple-300'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {showAllInputColumns
              ? 'Kolom Input Bebas: Semua (Formatif, Sumatif, PH1–3, PTS, PAS, Praktik)'
              : 'Kolom Input Bebas: Ringkas (Formatif & Sumatif Saja)'}
          </button>
        </div>

        <div className="text-xs text-slate-500">
          {filteredStudent ? (
            <span>
              Filter: <strong>{filteredStudent.namaSiswa}</strong> ({displayedSiswa.length} Siswa)
            </span>
          ) : (
            <span>
              Target: <strong>{siswaKelas.length} Siswa</strong> Kelas {selectedKelas}
            </span>
          )}
        </div>
      </div>

      {/* Score Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-3">No</th>
                <th className="py-3 px-3 min-w-[180px]">NISN &amp; Nama Siswa</th>
                <th className="py-3 px-1.5 text-center w-18" title="Input bebas Formatif">Formatif</th>
                <th className="py-3 px-1.5 text-center w-18" title="Input bebas Sumatif">Sumatif</th>
                {showAllInputColumns && (
                  <>
                    <th className="py-3 px-1.5 text-center w-16" title="Input bebas PH 1">PH 1</th>
                    <th className="py-3 px-1.5 text-center w-16" title="Input bebas PH 2">PH 2</th>
                    <th className="py-3 px-1.5 text-center w-16" title="Input bebas PH 3">PH 3</th>
                    <th className="py-3 px-1.5 text-center w-16" title="Input bebas PTS">PTS</th>
                    <th className="py-3 px-1.5 text-center w-16" title="Input bebas PAS/SAS">PAS/SAS</th>
                    <th className="py-3 px-1.5 text-center w-16" title="Input bebas Praktik">Praktik</th>
                  </>
                )}
                <th className="py-3 px-2 text-center w-24 bg-blue-950 text-blue-200">Jumlah Nilai</th>
                <th className="py-3 px-2 text-center w-24 bg-emerald-950 text-emerald-300">Nilai Akhir</th>
                <th className="py-3 px-2 text-center w-28">Predikat</th>
                <th className="py-3 px-2 text-center w-32">Capaian Kompetensi</th>
                <th className="py-3 px-3 min-w-[260px]">Deskripsi Rapor Otomatis (Sesuai Nilai &amp; TP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedSiswa.map((s, idx) => {
                const item = rows[s.idSiswa] || buildInitialRow(s, selectedMapel);
                const summary = calculateScoreSummaryFromFreeInputs(item, SCORE_INPUT_FIELDS);
                const displayJumlah = summary.filledCount > 0 ? summary.jumlahNilai : (item.jumlahNilai ?? 0);
                const displayNisn = !isPlaceholderNisn(s.nisn) && !s.nisn.startsWith('BLM_') ? s.nisn : '-';

                return (
                  <tr key={s.idSiswa} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 text-slate-400 font-mono font-bold">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800">{s.namaSiswa}</span>
                        {s.agama && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${
                              s.agama === 'Islam'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : s.agama === 'Kristen'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : s.agama === 'Katolik'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                : s.agama === 'Hindu'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : s.agama === 'Buddha'
                                ? 'bg-yellow-50 text-yellow-800 border-yellow-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            {s.agama}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{displayNisn}</div>
                    </td>

                    {/* 8 Kolom Input Nilai Bebas (Tidak saling menimpa / tidak dipaksa rumus) */}
                    <td className="py-2 px-1.5 text-center">
                      {renderFreeScoreInput(s.idSiswa, 'formatif', item.formatif, 'Formatif')}
                    </td>
                    <td className="py-2 px-1.5 text-center">
                      {renderFreeScoreInput(s.idSiswa, 'sumatif', item.sumatif, 'Sumatif')}
                    </td>
                    {showAllInputColumns && (
                      <>
                        <td className="py-2 px-1.5 text-center">
                          {renderFreeScoreInput(s.idSiswa, 'ph1', item.ph1, 'PH 1')}
                        </td>
                        <td className="py-2 px-1.5 text-center">
                          {renderFreeScoreInput(s.idSiswa, 'ph2', item.ph2, 'PH 2')}
                        </td>
                        <td className="py-2 px-1.5 text-center">
                          {renderFreeScoreInput(s.idSiswa, 'ph3', item.ph3, 'PH 3')}
                        </td>
                        <td className="py-2 px-1.5 text-center">
                          {renderFreeScoreInput(s.idSiswa, 'pts', item.pts, 'PTS')}
                        </td>
                        <td className="py-2 px-1.5 text-center">
                          {renderFreeScoreInput(s.idSiswa, 'pas', item.pas, 'PAS/SAS')}
                        </td>
                        <td className="py-2 px-1.5 text-center">
                          {renderFreeScoreInput(s.idSiswa, 'praktik', item.praktik, 'Praktik')}
                        </td>
                      </>
                    )}

                    {/* Jumlah Nilai (Rumus Otomatis) */}
                    <td className="py-2 px-2 text-center bg-blue-50/80 border-x border-blue-100">
                      <span
                        className="font-extrabold text-sm text-blue-900 font-mono"
                        title="Rumus otomatis: Total seluruh kolom nilai yang diisi"
                      >
                        {displayJumlah}
                      </span>
                    </td>

                    {/* Nilai Akhir (Rumus Otomatis dari Jumlah ÷ Kolom Terisi, tetap boleh disesuaikan manual tanpa mengubah kolom input lain) */}
                    <td className="py-2 px-2 text-center bg-emerald-50">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="-"
                        value={item.nilaiAkhir > 0 || summary.filledCount > 0 ? item.nilaiAkhir : ''}
                        onChange={(e) => updateCell(s.idSiswa, 'nilaiAkhir', e.target.value)}
                        title="Otomatis dari Jumlah Nilai ÷ banyak kolom terisi (dapat disesuaikan manual tanpa mengubah nilai input lain)"
                        className="w-16 px-2 py-1 text-center font-extrabold text-sm text-emerald-900 font-mono bg-white border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </td>

                    {/* Predikat (Rumus Otomatis) */}
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.predikat === 'Sangat Baik'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.predikat === 'Baik'
                            ? 'bg-blue-100 text-blue-800'
                            : item.predikat === 'Cukup'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.nilaiAkhir > 0 || summary.filledCount > 0 ? item.predikat : '-'}
                      </span>
                    </td>

                    {/* Capaian */}
                    <td className="py-2 px-2 text-center">
                      <select
                        value={item.capaianKompetensi}
                        onChange={(e) => updateCell(s.idSiswa, 'capaianKompetensi', e.target.value)}
                        className="text-[11px] font-semibold border border-slate-300 rounded-lg px-1.5 py-1"
                      >
                        <option value="Sangat Baik">Sangat Baik</option>
                        <option value="Baik">Baik</option>
                        <option value="Cukup">Cukup</option>
                        <option value="Perlu Pendampingan">Perlu Pendampingan</option>
                      </select>
                    </td>

                    {/* Deskripsi Rapor (Rumus Otomatis dari Nilai Akhir & TP) */}
                    <td className="py-2 px-3">
                      <textarea
                        rows={2}
                        placeholder="Deskripsi rapor muncul otomatis saat nilai diisi..."
                        value={item.deskripsiRapor || ''}
                        onChange={(e) => updateCell(s.idSiswa, 'deskripsiRapor', e.target.value)}
                        className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg leading-snug focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

