import React from 'react';
import { SchoolIdentity, Student, PaperSize, PaperOrientation } from '../../types';
import { LogoTutWuriHandayani, LogoKabupaten } from './OfficialLogos';
import { useApp, getReportFontCssStack } from '../../context/AppContext';

interface ReportCoverPageProps {
  sekolah: SchoolIdentity;
  student: Student;
  paperSize?: PaperSize | string;
  paperOrientation?: PaperOrientation;
  fontFamily?: string;
  fontSize?: string;
}

export const ReportCoverPage: React.FC<ReportCoverPageProps> = ({
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
      className={`report-cover-page report-typography-scope bg-white text-slate-900 mx-auto printable-area print-avoid-break select-none box-border flex flex-col justify-between ${
        isLandscape
          ? 'min-h-[640px]'
          : paperSize === 'F4'
          ? 'min-h-[1050px]'
          : 'min-h-[960px]'
      }`}
      style={{
        boxSizing: 'border-box',
        padding: isLandscape ? '16px' : '24px',
        width: '100%',
        height: '100%',
        fontFamily: effectiveFont,
        fontSize: effectiveSize,
        lineHeight: printLineHeight
      }}
    >
      {/* BINGKAI GANDA DENGAN SUDUT ORNAMEN ELEGAN (TIDAK AKAN PECAH / BERGESER SAAT PRINT) */}
      <div className="w-full h-full border-[3px] border-black p-1 box-border flex flex-col justify-between bg-white flex-1">
        <div
          className={`w-full h-full border border-black relative box-border flex flex-col justify-between bg-white flex-1 ${
            isLandscape ? 'p-5 sm:p-6' : 'p-6 sm:p-8'
          }`}
        >
          {/* Sudut Ornamen Kiri Atas */}
          <svg className="absolute -top-1 -left-1 w-11 h-11 text-black pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
            <path d="M0,0 L100,0 C70,10 60,30 50,50 C40,70 20,80 0,100 Z" opacity="0.9" />
            <circle cx="18" cy="18" r="6" />
            <circle cx="36" cy="12" r="4" />
            <circle cx="12" cy="36" r="4" />
          </svg>
          {/* Sudut Ornamen Kanan Atas */}
          <svg className="absolute -top-1 -right-1 w-11 h-11 text-black pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
            <path d="M100,0 L0,0 C30,10 40,30 50,50 C60,70 80,80 100,100 Z" opacity="0.9" />
            <circle cx="82" cy="18" r="6" />
            <circle cx="64" cy="12" r="4" />
            <circle cx="88" cy="36" r="4" />
          </svg>
          {/* Sudut Ornamen Kiri Bawah */}
          <svg className="absolute -bottom-1 -left-1 w-11 h-11 text-black pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
            <path d="M0,100 L100,100 C70,90 60,70 50,50 C40,30 20,20 0,0 Z" opacity="0.9" />
            <circle cx="18" cy="82" r="6" />
            <circle cx="36" cy="88" r="4" />
            <circle cx="12" cy="64" r="4" />
          </svg>
          {/* Sudut Ornamen Kanan Bawah */}
          <svg className="absolute -bottom-1 -right-1 w-11 h-11 text-black pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
            <path d="M100,100 L0,100 C30,90 40,70 50,50 C60,30 80,20 100,0 Z" opacity="0.9" />
            <circle cx="82" cy="82" r="6" />
            <circle cx="64" cy="88" r="4" />
            <circle cx="88" cy="64" r="4" />
          </svg>

          {isLandscape ? (
            <>
              {/* TATA LETAK HORIZONTAL (LANDSCAPE): LOGOS & JUDUL SEIMBANG */}
              <div className="w-full flex items-center justify-between gap-6 pt-2 px-4">
                <div className="shrink-0 flex justify-center">
                  <LogoTutWuriHandayani
                    url={sekolah.logoKananUrl}
                    size={96}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                    label="Logo Tut Wuri Handayani"
                  />
                </div>
                <div className="flex-1 text-center space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-widest uppercase text-black font-serif">
                    RAPOR PESERTA DIDIK
                  </h1>
                  <h2 className="text-lg sm:text-xl font-black tracking-wide uppercase text-black font-serif">
                    SEKOLAH DASAR (SD)
                  </h2>
                  <p className="text-sm font-bold uppercase text-black">
                    {sekolah.namaSekolah || 'SD Negeri Balil'}
                  </p>
                </div>
                <div className="shrink-0 flex justify-center">
                  <LogoKabupaten
                    url={sekolah.logoKiriUrl}
                    size={96}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-sm"
                    label="Logo Pemda Kabupaten / Sekolah"
                  />
                </div>
              </div>

              {/* KOTAK NAMA SISWA & NISN HORIZONTAL */}
              <div className="w-full max-w-2xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div>
                  <p className="text-xs sm:text-sm font-serif font-bold text-black mb-1.5 text-center">
                    Nama Peserta Didik :
                  </p>
                  <div className="border-2 border-black py-2.5 px-4 text-center bg-white">
                    <span className="text-base sm:text-lg font-black uppercase text-black tracking-wider font-serif break-words">
                      {student.namaSiswa || '-'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-serif font-bold text-black mb-1.5 text-center">
                    NISN / NIS :
                  </p>
                  <div className="border-2 border-black py-2.5 px-4 text-center bg-white">
                    <span className="text-sm sm:text-base font-bold font-mono text-black tracking-widest">
                      {student.nisn && !student.nisn.startsWith('BLM_') && student.nisn !== '-'
                        ? student.nisn
                        : '-'}
                      {student.nis && student.nis !== '-' ? ` / ${student.nis}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* KEMENTERIAN BAWAH */}
              <div className="w-full text-center pb-2 pt-2">
                <h3 className="text-xs sm:text-sm font-serif font-black tracking-wide uppercase text-black leading-snug">
                  KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI
                </h3>
                <h4 className="text-xs sm:text-sm font-serif font-bold tracking-wider uppercase text-black mt-0.5">
                  REPUBLIK INDONESIA
                </h4>
              </div>
            </>
          ) : (
            <>
              {/* TATA LETAK VERTIKAL (PORTRAIT): STANDAR RESMI */}
              {/* 1. BAGIAN ATAS: LOGO TUT WURI HANDAYANI + JUDUL RAPOR */}
              <div className="w-full text-center pt-2 sm:pt-4">
                <div className="w-full flex justify-center items-center mb-4">
                  <LogoTutWuriHandayani
                    url={sekolah.logoKananUrl}
                    size={110}
                    className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                    label="Logo Tut Wuri Handayani"
                  />
                </div>

                {/* JUDUL RESMI BUKU RAPOR */}
                <div className="space-y-1 mt-2 text-center">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-widest uppercase text-black font-serif">
                    RAPOR
                  </h1>
                  <h2 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-black font-serif">
                    PESERTA DIDIK
                  </h2>
                  <h3 className="text-lg sm:text-xl font-black tracking-wide uppercase text-black font-serif">
                    SEKOLAH DASAR
                  </h3>
                  <h4 className="text-lg sm:text-xl font-black uppercase text-black font-serif">
                    (SD)
                  </h4>
                </div>
              </div>

              {/* 2. BAGIAN TENGAH: LOGO PEMDA KABUPATEN / SEKOLAH */}
              <div className="w-full text-center my-4 sm:my-6">
                <div className="w-full flex justify-center items-center">
                  <LogoKabupaten
                    url={sekolah.logoKiriUrl}
                    size={130}
                    className="w-32 h-32 sm:w-36 sm:h-36 object-contain drop-shadow-sm"
                    label="Logo Pemda Kabupaten / Sekolah"
                  />
                </div>
              </div>

              {/* 3. KOTAK NAMA SISWA & NISN/NIS */}
              <div className="w-full max-w-lg mx-auto px-4 space-y-3">
                <div>
                  <p className="text-xs sm:text-sm font-serif font-bold text-black mb-1.5 text-center">
                    Nama Peserta Didik :
                  </p>
                  <div className="border-2 border-black py-2.5 px-4 text-center bg-white">
                    <span className="text-base sm:text-lg font-black uppercase text-black tracking-wider font-serif break-words">
                      {student.namaSiswa || '-'}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs sm:text-sm font-serif font-bold text-black mb-1.5 text-center">
                    NISN / NIS :
                  </p>
                  <div className="border-2 border-black py-2 px-4 text-center bg-white">
                    <span className="text-sm sm:text-base font-bold font-mono text-black tracking-widest">
                      {student.nisn && !student.nisn.startsWith('BLM_') && student.nisn !== '-'
                        ? student.nisn
                        : '-'}
                      {student.nis && student.nis !== '-' ? ` / ${student.nis}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. BAGIAN BAWAH: KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI REPUBLIK INDONESIA */}
              <div className="w-full text-center pb-4 sm:pb-6 pt-4">
                <h3 className="text-xs sm:text-sm font-serif font-black tracking-wide uppercase text-black leading-snug">
                  KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI
                </h3>
                <h4 className="text-xs sm:text-sm font-serif font-bold tracking-wider uppercase text-black mt-0.5">
                  REPUBLIK INDONESIA
                </h4>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
