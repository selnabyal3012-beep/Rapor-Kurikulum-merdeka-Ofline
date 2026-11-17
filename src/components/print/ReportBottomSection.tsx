import React from 'react';
import { Edit3 } from 'lucide-react';
import { ClassLevel, SchoolIdentity, SemesterType, Student, StudentDecision } from '../../types';

interface ReportBottomSectionProps {
  semester: SemesterType;
  student: Student;
  selectedKelas: ClassLevel;
  sekolah: SchoolIdentity;
  waliKelasGuru: {
    namaGuru: string;
    nip: string;
  };
  catatanWaliKelas: string;
  kehadiran: {
    sakit: number;
    izin: number;
    alpa: number;
  };
  keputusan?: StudentDecision;
  onEditKeputusan?: () => void;
}

const getNextClassText = (k: ClassLevel): string => {
  switch (k) {
    case 'I': return 'II (Dua)';
    case 'II': return 'III (Tiga)';
    case 'III': return 'IV (Empat)';
    case 'IV': return 'V (Lima)';
    case 'V': return 'VI (Enam)';
    case 'VI': return 'Lulus (Tamat SD/MI)';
    case 'VII': return 'VIII (Delapan)';
    case 'VIII': return 'IX (Sembilan)';
    case 'IX': return 'Lulus (Tamat SMP/MTs)';
    case 'X': return 'XI (Sebelas)';
    case 'XI': return 'XII (Dua Belas)';
    case 'XII': return 'Lulus (Tamat SMA/SMK)';
    case 'XIII': return 'Lulus (Tamat SMK 4 Tahun)';
    default: return '-';
  }
};

const getCurrentClassText = (k: ClassLevel): string => {
  switch (k) {
    case 'I': return 'I (Satu)';
    case 'II': return 'II (Dua)';
    case 'III': return 'III (Tiga)';
    case 'IV': return 'IV (Empat)';
    case 'V': return 'V (Lima)';
    case 'VI': return 'VI (Enam)';
    case 'VII': return 'VII (Tujuh)';
    case 'VIII': return 'VIII (Delapan)';
    case 'IX': return 'IX (Sembilan)';
    case 'X': return 'X (Sepuluh)';
    case 'XI': return 'XI (Sebelas)';
    case 'XII': return 'XII (Dua Belas)';
    case 'XIII': return 'XIII (Tiga Belas)';
    default: return k;
  }
};

export const ReportBottomSection: React.FC<ReportBottomSectionProps> = ({
  semester,
  student,
  selectedKelas,
  sekolah,
  waliKelasGuru,
  catatanWaliKelas,
  kehadiran,
  keputusan,
  onEditKeputusan
}) => {
  const isSemester2 = semester === 'Genap' || semester === '2';

  const formatDays = (val: number) => (val > 0 ? `${val} hari` : '   hari');

  const displayNaikKelas =
    keputusan?.statusKeputusan === 'Naik Kelas'
      ? keputusan.naikKelas || getNextClassText(selectedKelas)
      : keputusan?.statusKeputusan === 'Tinggal di Kelas'
      ? '-'
      : keputusan?.naikKelas || '........................................................';

  const displayTinggalKelas =
    keputusan?.statusKeputusan === 'Tinggal di Kelas'
      ? keputusan.tinggalKelas || getCurrentClassText(selectedKelas)
      : keputusan?.statusKeputusan === 'Naik Kelas'
      ? '-'
      : keputusan?.tinggalKelas || '........................................................';

  const parentName = student.namaAyah || student.namaWali || '';
  const cleanNipKepsek =
    sekolah.nipKepalaSekolah && sekolah.nipKepalaSekolah !== '-'
      ? sekolah.nipKepalaSekolah
      : '';
  const cleanNipWali =
    waliKelasGuru.nip && waliKelasGuru.nip !== '-' ? waliKelasGuru.nip : '';
  const hasPlaceOrDate = Boolean((sekolah.tempatRapor || '').trim() || (sekolah.tanggalRapor || '').trim());

  return (
    <div className="space-y-4 mt-4 text-black">
      {/* 1. TABEL CATATAN WALI KELAS (SEMESTER 1 DAN SEMESTER 2 BERBEDA ISINYA) */}
      <table className="w-full border-collapse border border-black text-xs bg-white">
        <thead>
          <tr className="bg-[#f2f2f2]">
            <th className="border border-black py-1.5 px-3 text-center font-bold text-black">
              Catatan Wali Kelas
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-3 min-h-[58px] h-14 align-top text-xs leading-relaxed text-black">
              {catatanWaliKelas ? (
                <span>{catatanWaliKelas}</span>
              ) : (
                <span className="inline-block h-8" />
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 2. KETIDAKHADIRAN & (KHUSUS SEMESTER 2) KEPUTUSAN */}
      {isSemester2 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          {/* Kiri: Ketidakhadiran Semester 2 */}
          <table className="w-full border-collapse border border-black text-xs bg-white">
            <thead>
              <tr className="bg-[#f2f2f2]">
                <th colSpan={3} className="border border-black py-1 px-2.5 text-left font-bold text-black">
                  Ketidakhadiran
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-black py-1 px-2.5 w-[10.5em]">Sakit</td>
                <td className="border-b border-black py-1 px-1 w-[1.2em] text-center">:</td>
                <td className="border-b border-black py-1 px-2.5 font-normal whitespace-pre">
                  {formatDays(kehadiran.sakit)}
                </td>
              </tr>
              <tr>
                <td className="border-b border-black py-1 px-2.5">Izin</td>
                <td className="border-b border-black py-1 px-1 text-center">:</td>
                <td className="border-b border-black py-1 px-2.5 font-normal whitespace-pre">
                  {formatDays(kehadiran.izin)}
                </td>
              </tr>
              <tr>
                <td className="py-1 px-2.5">Tanpa Keterangan</td>
                <td className="py-1 px-1 text-center">:</td>
                <td className="py-1 px-2.5 font-normal whitespace-pre">
                  {formatDays(kehadiran.alpa)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Kanan: Catatan Keputusan Kenaikan Kelas / Kelulusan (KHUSUS SEMESTER 2) */}
          <table className="w-full border-collapse border border-black text-xs bg-white">
            <thead>
              <tr className="bg-[#f2f2f2]">
                <th className="border border-black py-1 px-2.5 text-left font-bold text-black flex items-center justify-between">
                  <span>Keputusan :</span>
                  {onEditKeputusan && (
                    <button
                      type="button"
                      onClick={onEditKeputusan}
                      className="no-print inline-flex items-center gap-1 px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] rounded transition-all cursor-pointer border border-amber-500"
                      title="Input Keputusan Kenaikan Kelas"
                    >
                      <Edit3 size={10} />
                      <span>Edit</span>
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2.5 space-y-1.5 text-xs text-black">
                  <p className="text-[11px] leading-snug">
                    Berdasarkan hasil pencapaian kompetensi pada semester ke 1 dan ke 2, peserta didik ditetapkan :
                  </p>
                  {keputusan?.statusKeputusan === 'Lulus' ? (
                    <div className="pt-1 flex">
                      <span className="w-[9.5em] shrink-0">Status Kelulusan</span>
                      <span className="w-[1.2em] shrink-0">:</span>
                      <span className="font-bold uppercase">{keputusan.statusKeputusan}</span>
                    </div>
                  ) : (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex">
                        <span className="w-[8.8em] shrink-0">Naik ke kelas</span>
                        <span className="w-[1.2em] shrink-0">:</span>
                        <span className="font-bold">{displayNaikKelas}</span>
                      </div>
                      <div className="flex">
                        <span className="w-[8.8em] shrink-0">Tinggal di kelas</span>
                        <span className="w-[1.2em] shrink-0">:</span>
                        <span className="font-bold">{displayTinggalKelas}</span>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        /* SEMESTER 1 (GANJIL): HANYA KETIDAKHADIRAN DI KIRI, TANPA KEPUTUSAN KENAIKAN KELAS */
        <div className="flex justify-start">
          <table className="w-full sm:w-[46%] border-collapse border border-black text-xs bg-white">
            <thead>
              <tr className="bg-[#f2f2f2]">
                <th colSpan={3} className="border border-black py-1 px-2.5 text-left font-bold text-black">
                  Ketidakhadiran
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-black py-1 px-2.5 w-[10.5em]">Sakit</td>
                <td className="border-b border-black py-1 px-1 w-[1.2em] text-center">:</td>
                <td className="border-b border-black py-1 px-2.5 font-normal whitespace-pre">
                  {formatDays(kehadiran.sakit)}
                </td>
              </tr>
              <tr>
                <td className="border-b border-black py-1 px-2.5">Izin</td>
                <td className="border-b border-black py-1 px-1 text-center">:</td>
                <td className="border-b border-black py-1 px-2.5 font-normal whitespace-pre">
                  {formatDays(kehadiran.izin)}
                </td>
              </tr>
              <tr>
                <td className="py-1 px-2.5">Tanpa Keterangan</td>
                <td className="py-1 px-1 text-center">:</td>
                <td className="py-1 px-2.5 font-normal whitespace-pre">
                  {formatDays(kehadiran.alpa)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 3. PENGESAHAN TANDA TANGAN 3 KOLOM: ORANG TUA | KEPALA SEKOLAH | WALI KELAS */}
      <div className="signature-box pt-6 text-xs text-black font-serif">
        <div className="grid grid-cols-3 gap-6 items-start">
          {/* Kolom 1: Orang Tua/Wali Murid */}
          <div className="text-left">
            <p className="invisible leading-tight">Tempat, Tanggal</p>
            <p className="font-normal text-black mb-16">Orang Tua/Wali Murid</p>
            {parentName ? (
              <p className="font-bold underline uppercase text-black">{parentName}</p>
            ) : (
              <p className="font-normal text-black">........................................</p>
            )}
          </div>

          {/* Kolom 2: Kepala Sekolah */}
          <div className="text-left">
            <p className="invisible leading-tight">Tempat, Tanggal</p>
            <p className="font-normal text-black mb-16">Kepala Sekolah</p>
            {sekolah.namaKepalaSekolah && (
              <p className="font-bold underline text-black">{sekolah.namaKepalaSekolah}</p>
            )}
            <p className="text-xs text-black mt-0.5">
              NIP.{cleanNipKepsek ? ` ${cleanNipKepsek}` : ''}
            </p>
          </div>

          {/* Kolom 3: Wali Kelas */}
          <div className="text-left">
            <p className="text-xs text-black leading-tight">
              {hasPlaceOrDate
                ? `${sekolah.tempatRapor || ''}${sekolah.tempatRapor && sekolah.tanggalRapor ? ', ' : ''}${sekolah.tanggalRapor || ''}`
                : '\u00A0'}
            </p>
            <p className="font-normal text-black mb-16">Wali Kelas</p>
            {waliKelasGuru.namaGuru && (
              <p className="font-bold underline text-black">{waliKelasGuru.namaGuru}</p>
            )}
            <p className="text-xs text-black mt-0.5">
              NIP.{cleanNipWali ? ` ${cleanNipWali}` : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
