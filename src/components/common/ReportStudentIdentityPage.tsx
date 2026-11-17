import React from 'react';
import { SchoolIdentity, Student, PaperSize, PaperOrientation } from '../../types';
import { useApp, getReportFontCssStack } from '../../context/AppContext';

interface ReportStudentIdentityPageProps {
  sekolah: SchoolIdentity;
  student: Student;
  paperSize?: PaperSize | string;
  paperOrientation?: PaperOrientation;
  fontFamily?: string;
  fontSize?: string;
}

function formatDateIndo(dateStr?: string): string {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export const ReportStudentIdentityPage: React.FC<ReportStudentIdentityPageProps> = ({
  sekolah,
  student,
  paperSize = 'F4',
  paperOrientation,
  fontFamily,
  fontSize
}) => {
  const { printFontFamily, printFontSize, printLineHeight, paperOrientation: ctxOrientation } = useApp();
  const effectiveOrientation = paperOrientation || ctxOrientation || 'portrait';
  const isLandscape = effectiveOrientation === 'landscape';
  const effectiveFont = getReportFontCssStack(fontFamily || printFontFamily || 'Times New Roman');
  const effectiveSize = fontSize || printFontSize || '11pt';

  return (
    <div
      className={`report-typography-scope bg-white text-slate-900 mx-auto printable-area print-avoid-break select-none box-border flex flex-col justify-between print:bg-white ${
        isLandscape
          ? 'min-h-[640px]'
          : paperSize === 'F4'
          ? 'min-h-[1050px]'
          : 'min-h-[960px]'
      }`}
      style={{
        boxSizing: 'border-box',
        padding: isLandscape ? '24px 32px' : '36px 36px 32px 36px',
        width: '100%',
        fontFamily: effectiveFont,
        fontSize: effectiveSize,
        lineHeight: printLineHeight
      }}
    >
      <div>
        {/* JUDUL HALAMAN */}
        <div className="text-center pt-2 pb-5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-wider uppercase text-black">
            IDENTITAS PESERTA DIDIK
          </h1>
        </div>

        {/* LIST BIODATA IDENTITAS PESERTA DIDIK (MENGGUNAKAN SATUAN em AGAR AMAN SAAT HURUF DIBESARKAN) */}
        <div
          className={`mx-auto text-xs leading-relaxed text-black ${
            isLandscape ? 'max-w-6xl grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2' : 'max-w-4xl space-y-2'
          }`}
        >
          <div className="space-y-2">
            {/* 1. Nama Peserta Didik */}
            <div className="flex">
              <span className="w-[12.5em] shrink-0">Nama Peserta Didik</span>
              <span className="w-[1.2em] text-center shrink-0">:</span>
              <span className="font-bold flex-1 uppercase tracking-wide">
                {student.namaSiswa || '-'}
              </span>
            </div>

            {/* 2. NISN/NIS */}
            <div className="flex">
              <span className="w-[12.5em] shrink-0">NISN/NIS</span>
              <span className="w-[1.2em] text-center shrink-0">:</span>
              <span className="font-mono flex-1 font-bold">
                {student.nisn && !student.nisn.startsWith('BLM_') && student.nisn !== '-'
                  ? student.nisn
                  : '-'}
                {student.nis && student.nis !== '-' ? ` / ${student.nis}` : ''}
              </span>
            </div>

            {/* 3. Tempat, Tanggal Lahir */}
            <div className="flex">
              <span className="w-[12.5em] shrink-0">Tempat, Tanggal Lahir</span>
              <span className="w-[1.2em] text-center shrink-0">:</span>
              <span className="flex-1">
                {student.tempatLahir && student.tempatLahir !== '-' ? student.tempatLahir : '-'}
                {student.tanggalLahir && student.tanggalLahir !== '-' ? `, ${formatDateIndo(student.tanggalLahir)}` : ''}
              </span>
            </div>

            {/* 4. Jenis Kelamin */}
            <div className="flex">
              <span className="w-[12.5em] shrink-0">Jenis Kelamin</span>
              <span className="w-[1.2em] text-center shrink-0">:</span>
              <span className="flex-1">
                {student.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
              </span>
            </div>

            {/* 5. Agama */}
            <div className="flex">
              <span className="w-[12.5em] shrink-0">Agama</span>
              <span className="w-[1.2em] text-center shrink-0">:</span>
              <span className="flex-1">{student.agama || '-'}</span>
            </div>

            {/* 6. Pendidikan Sebelumnya */}
            <div className="flex">
              <span className="w-[12.5em] shrink-0">Pendidikan Sebelumnya</span>
              <span className="w-[1.2em] text-center shrink-0">:</span>
              <span className="flex-1">{student.sekolahAsal || '-'}</span>
            </div>

            {/* 7. Alamat Peserta Didik */}
            <div className="flex">
              <span className="w-[12.5em] shrink-0">Alamat Peserta Didik</span>
              <span className="w-[1.2em] text-center shrink-0">:</span>
              <span className="flex-1">{student.alamat || '-'}</span>
            </div>
          </div>

          <div className="space-y-2">
            {/* 8. Nama Orang Tua */}
            <div>
              <div className="font-semibold text-black">Nama Orang Tua</div>
              <div className="pl-4 space-y-1 mt-1">
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Ayah</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="font-bold flex-1 uppercase">
                    {student.namaAyah || '-'}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Ibu</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="font-bold flex-1">
                    {student.namaIbu || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* 9. Pekerjaan Orang Tua */}
            <div>
              <div className="font-semibold text-black">Pekerjaan Orang Tua</div>
              <div className="pl-4 space-y-1 mt-1">
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Ayah</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="flex-1">{student.pekerjaanAyah || '_'}</span>
                </div>
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Ibu</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="flex-1">{student.pekerjaanIbu || '_'}</span>
                </div>
              </div>
            </div>

            {/* 10. Alamat Orang Tua */}
            <div>
              <div className="font-semibold text-black">Alamat Orang Tua</div>
              <div className="pl-4 space-y-1 mt-1">
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Jalan</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="flex-1">{student.alamat || '_'}</span>
                </div>
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Kelurahan/Desa</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="flex-1">{sekolah.desaKelurahan || 'Kabiding'}</span>
                </div>
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Kecamatan</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="flex-1">{sekolah.distrikKecamatan || 'Oksibil'}</span>
                </div>
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Kabupaten/Kota</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="flex-1">{sekolah.kabupaten || 'Pegunungan Bintang'}</span>
                </div>
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Provinsi</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="flex-1">{sekolah.provinsi || 'Papua Pegunungan'}</span>
                </div>
              </div>
            </div>

            {/* 11. Wali Peserta Didik */}
            <div>
              <div className="font-semibold text-black">Wali Peserta Didik</div>
              <div className="pl-4 space-y-1 mt-1">
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Nama</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="flex-1">{student.namaWali || '_'}</span>
                </div>
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Pekerjaan</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="flex-1">{student.pekerjaanWali || '_'}</span>
                </div>
                <div className="flex">
                  <span className="w-[11.5em] shrink-0">Alamat</span>
                  <span className="w-[1.2em] text-center shrink-0">:</span>
                  <span className="flex-1">{student.alamatWali || '_'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BAGIAN BAWAH: KOTAK PAS FOTO 3X4 & TANDA TANGAN KEPALA SEKOLAH */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex items-end justify-between px-8 sm:px-14">
          {/* Kotak Pas Foto 3x4 */}
          <div className="flex flex-col items-center">
            <div className="w-[30mm] h-[40mm] border-2 border-black flex items-center justify-center bg-slate-50 text-center p-2 text-slate-500 shadow-2xs">
              <span className="text-[11px] font-sans">Pas Foto<br />3 x 4 cm</span>
            </div>
          </div>

          {/* Pengesahan Kepala Sekolah */}
          <div className="text-left font-serif text-black leading-snug">
            <div>
              {[sekolah.tempatRapor, sekolah.tanggalRapor].filter((v) => v && v.trim() !== '').join(', ') || '\u00A0'}
            </div>
            <div className="font-bold mt-0.5">Kepala Sekolah,</div>
            <div className="h-16 sm:h-20" />
            <div>
              <span className="font-black text-sm sm:text-base underline uppercase tracking-wide">
                {sekolah.namaKepalaSekolah || '........................................'}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-mono mt-0.5">
              NIP.{sekolah.nipKepalaSekolah && sekolah.nipKepalaSekolah !== '-' ? ` ${sekolah.nipKepalaSekolah}` : ''}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 font-serif mt-6">
          <span>Halaman 3 — Identitas Peserta Didik</span>
        </div>
      </div>
    </div>
  );
};
