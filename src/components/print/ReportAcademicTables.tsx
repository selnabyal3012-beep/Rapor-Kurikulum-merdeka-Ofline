import React from 'react';
import {
  ClassLevel,
  Extracurricular,
  SchoolIdentity,
  SemesterType,
  Student,
  Subject
} from '../../types';
import { getNamaPelajaranAgama } from '../../utils/tpDescriptionHelper';

export interface AcademicScoreRowItem {
  mapel: Subject;
  score: {
    kkm?: number;
    formatif?: number;
    nilaiPts?: number;
    nilaiAkhir: number;
    predikat?: string;
    capaianKompetensi?: string;
    deskripsiRapor: string;
    deskripsiTercapai: string;
    deskripsiPerluPeningkatan: string;
  };
  linkedTpKodes?: string[];
}

interface ReportAcademicHeaderAndScoresProps {
  student: Student;
  sekolah: SchoolIdentity;
  selectedKelas: ClassLevel;
  selectedFase: string;
  semester: SemesterType;
  studentScores: AcademicScoreRowItem[];
}

export const ReportAcademicHeaderAndScores: React.FC<ReportAcademicHeaderAndScoresProps> = ({
  student,
  sekolah,
  selectedKelas,
  selectedFase,
  semester,
  studentScores
}) => {
  const isSem2 = semester === 'Genap' || semester === '2';
  const cleanNisn =
    student.nisn && !student.nisn.startsWith('BLM_') && student.nisn !== '-'
      ? student.nisn
      : '-';
  const cleanNis = student.nis && student.nis !== '-' ? student.nis : '';
  const nisDisplay = cleanNis ? `${cleanNisn} / ${cleanNis}` : cleanNisn;

  const mainScores = studentScores.filter((item) => item.mapel.kelompok !== 'Muatan Lokal');
  const mulokScores = studentScores.filter((item) => item.mapel.kelompok === 'Muatan Lokal');

  const totalNilai = studentScores.reduce(
    (acc, item) => acc + (item.score.nilaiAkhir > 0 ? item.score.nilaiAkhir : 0),
    0
  );
  const scoredCount = studentScores.filter((item) => item.score.nilaiAkhir > 0).length;
  const rataRataNilai = scoredCount > 0 ? Number((totalNilai / scoredCount).toFixed(2)) : 0;

  const renderScoreRow = (item: AcademicScoreRowItem, displayNo: number | string) => {
    const mapelTitle = getNamaPelajaranAgama(item.mapel.mataPelajaran, student.agama);
    const hasScore = item.score.nilaiAkhir > 0;
    const descText =
      (item.score.deskripsiRapor && item.score.deskripsiRapor.trim() !== '' && item.score.deskripsiRapor !== '-'
        ? item.score.deskripsiRapor.trim()
        : item.score.deskripsiTercapai?.trim()) || '-';

    return (
      <tr key={item.mapel.kode || item.mapel.mataPelajaran} className="bg-white">
        <td className="border border-black py-2 px-2 text-center align-middle font-normal text-black">
          {displayNo}
        </td>
        <td className="border border-black py-2 px-2.5 text-left align-middle font-bold text-black">
          {mapelTitle}
        </td>
        <td className="border border-black py-2 px-2 text-center align-middle font-bold text-black">
          {item.score.kkm ?? '-'}
        </td>
        <td className="border border-black py-2 px-2 text-center align-middle font-normal text-black">
          {typeof item.score.formatif === 'number' && !Number.isNaN(item.score.formatif)
            ? item.score.formatif
            : '-'}
        </td>
        <td className="border border-black py-2 px-2 text-center align-middle font-normal text-black">
          {typeof item.score.nilaiPts === 'number' && !Number.isNaN(item.score.nilaiPts)
            ? item.score.nilaiPts
            : '-'}
        </td>
        <td className="border border-black py-2 px-2 text-center align-middle font-bold text-black bg-[#fcf8e8]">
          {hasScore ? item.score.nilaiAkhir : '-'}
        </td>
        <td className="border border-black py-2 px-2 text-center align-middle font-bold text-black">
          {hasScore && item.score.capaianKompetensi ? item.score.capaianKompetensi : '-'}
        </td>
        <td className="report-desc-cell border border-black py-2 px-3 align-middle leading-snug text-black">
          {descText}
        </td>
      </tr>
    );
  };

  return (
    <div className="text-black">
      {/* JUDUL LAPORAN HASIL BELAJAR (SESUAI FORMAT KURIKULUM MERDEKA) */}
      <div className="text-center mb-5">
        <h2 className="text-sm sm:text-base font-bold tracking-wide uppercase text-black">
          LAPORAN HASIL BELAJAR
        </h2>
      </div>

      {/* IDENTITAS PESERTA DIDIK & SEKOLAH (2 KOLOM RATA, SKALA em AMAN UNTUK HURUF BESAR) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs mb-4">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-[10.5em] shrink-0">Nama Peserta Didik</span>
            <span className="w-[1.1em] text-center shrink-0">:</span>
            <span className="font-bold uppercase text-black flex-1">{student.namaSiswa}</span>
          </div>
          <div className="flex">
            <span className="w-[10.5em] shrink-0">NISN</span>
            <span className="w-[1.1em] text-center shrink-0">:</span>
            <span className="font-normal text-black flex-1">{nisDisplay}</span>
          </div>
          <div className="flex">
            <span className="w-[10.5em] shrink-0">Sekolah</span>
            <span className="w-[1.1em] text-center shrink-0">:</span>
            <span className="font-normal text-black flex-1">{sekolah.namaSekolah || '-'}</span>
          </div>
          <div className="flex">
            <span className="w-[10.5em] shrink-0">Alamat</span>
            <span className="w-[1.1em] text-center shrink-0">:</span>
            <span className="font-normal text-black flex-1">
              {[sekolah.alamat, sekolah.distrikKecamatan, sekolah.kabupaten]
                .filter((v) => v && v.trim() !== '' && v !== '-')
                .join(', ') || '-'}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex">
            <span className="w-[9.2em] shrink-0">Kelas</span>
            <span className="w-[1.1em] text-center shrink-0">:</span>
            <span className="font-normal text-black flex-1">
              {selectedKelas}
              {sekolah.rombel && sekolah.kelas === selectedKelas ? ` (${sekolah.rombel})` : ''}
            </span>
          </div>
          <div className="flex">
            <span className="w-[9.2em] shrink-0">Fase</span>
            <span className="w-[1.1em] text-center shrink-0">:</span>
            <span className="font-normal text-black flex-1">{selectedFase}</span>
          </div>
          <div className="flex">
            <span className="w-[9.2em] shrink-0">Semester</span>
            <span className="w-[1.1em] text-center shrink-0">:</span>
            <span className="font-normal text-black flex-1">
              {!isSem2 ? '1 (Ganjil)' : '2 (Genap)'}
            </span>
          </div>
          <div className="flex">
            <span className="w-[9.2em] shrink-0">Tahun Pelajaran</span>
            <span className="w-[1.1em] text-center shrink-0">:</span>
            <span className="font-normal text-black flex-1">{sekolah.tahunPelajaran || '-'}</span>
          </div>
        </div>
      </div>

      {/* SUB-JUDUL TABEL NILAI */}
      <div className="mb-2">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-black">
          A. NILAI CAPAIAN PEMBELAJARAN SEMESTER {!isSem2 ? '1 (GANJIL)' : '2 (GENAP)'}
        </h3>
      </div>

      {/* TABEL NILAI 8 KOLOM SESUAI FORMAT YANG DIMINTA */}
      <table className="w-full text-[11px] border-collapse border border-black bg-white">
        <thead>
          <tr className="bg-white text-black font-bold">
            <th className="border border-black py-2 px-1.5 text-center w-[2.8em]">No</th>
            <th className="border border-black py-2 px-2.5 text-left min-w-[9em] w-[20%]">Mata Pelajaran</th>
            <th className="border border-black py-2 px-1.5 text-center w-[3.8em]">KKM</th>
            <th className="border border-black py-2 px-1.5 text-center w-[4.8em]">Formatif</th>
            <th className="border border-black py-2 px-1.5 text-center w-[4.8em]">Nilai PTS</th>
            <th className="border border-black py-2 px-1.5 text-center w-[4.8em] bg-[#fcf8e8]">
              Nilai<br />Akhir
            </th>
            <th className="border border-black py-2 px-1.5 text-center w-[7em]">
              Capaian<br />Kompetensi
            </th>
            <th className="border border-black py-2 px-3 text-left">
              Deskripsi Capaian Pembelajaran
            </th>
          </tr>
        </thead>
        <tbody>
          {studentScores.length === 0 ? (
            <tr>
              <td colSpan={8} className="border border-black py-6 text-center text-slate-500 italic">
                Tidak ada mata pelajaran yang aktif pada filter ini.
              </td>
            </tr>
          ) : (
            <>
              {mainScores.map((item, idx) => renderScoreRow(item, idx + 1))}

              {mulokScores.length > 0 && (
                <>
                  <tr className="bg-[#f7f7f7]">
                    <td
                      colSpan={8}
                      className="border border-black py-1.5 px-2.5 text-left font-bold text-black"
                    >
                      Muatan Lokal
                    </td>
                  </tr>
                  {mulokScores.map((item, idx) => renderScoreRow(item, idx + 1))}
                </>
              )}
            </>
          )}
        </tbody>
        <tfoot>
          <tr className="bg-white text-black font-bold border-t-2 border-black">
            <td colSpan={5} className="border border-black py-2 px-3 text-right uppercase tracking-wide">
              JUMLAH NILAI :
            </td>
            <td className="border border-black py-2 px-2 text-center font-bold bg-[#e9edf4]">
              {scoredCount > 0 ? totalNilai : '-'}
            </td>
            <td colSpan={2} className="border border-black py-2 px-3 text-left font-normal text-[10px] text-slate-800">
              Total akumulasi nilai seluruh mata pelajaran
            </td>
          </tr>
          <tr className="bg-white text-black font-bold">
            <td colSpan={5} className="border border-black py-2 px-3 text-right uppercase tracking-wide">
              RATA-RATA NILAI :
            </td>
            <td className="border border-black py-2 px-2 text-center font-bold bg-[#fef0b8]">
              {scoredCount > 0 ? rataRataNilai : '-'}
            </td>
            <td colSpan={2} className="border border-black py-2 px-3 text-left font-normal text-[10px] text-slate-800">
              Skala Penilaian: 0 - 100
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

interface ReportExtracurricularTableProps {
  studentEkskul: Extracurricular[];
  minRows?: number;
}

export const ReportExtracurricularTable: React.FC<ReportExtracurricularTableProps> = ({
  studentEkskul,
  minRows = 3
}) => {
  const rowCount = Math.max(minRows, studentEkskul.length);
  const rows = Array.from({ length: rowCount }, (_, i) => studentEkskul[i] || null);

  return (
    <div className="mb-4 text-black">
      <table className="w-full text-[11px] border-collapse border border-black bg-white">
        <thead>
          <tr className="bg-[#f2f2f2] text-black font-bold">
            <th className="border border-black py-1.5 px-2 text-center w-[2.8em]">No</th>
            <th className="border border-black py-1.5 px-2.5 text-left w-[34%]">
              Kegiatan Ekstrakurikuler
            </th>
            <th className="border border-black py-1.5 px-2.5 text-left">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, idx) => (
            <tr key={item ? item.id : `empty-ekskul-${idx}`}>
              <td className="border border-black py-1.5 px-2 text-center">{idx + 1}</td>
              <td className="border border-black py-1.5 px-2.5 font-normal">
                {item ? item.jenisEkstrakurikuler : <span className="inline-block h-3.5" />}
              </td>
              <td className="border border-black py-1.5 px-2.5 font-normal">
                {item ? (
                  <span>
                    {item.predikat ? `${item.predikat}${item.keterangan ? ` — ${item.keterangan}` : ''}` : item.keterangan || '-'}
                  </span>
                ) : (
                  <span className="inline-block h-3.5" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
