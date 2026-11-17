import React from 'react';
import { SchoolIdentity, PaperSize, PaperOrientation } from '../../types';
import { useApp, getReportFontCssStack } from '../../context/AppContext';

interface ReportSchoolIdentityPageProps {
  sekolah: SchoolIdentity;
  paperSize?: PaperSize | string;
  paperOrientation?: PaperOrientation;
  fontFamily?: string;
  fontSize?: string;
}

export const ReportSchoolIdentityPage: React.FC<ReportSchoolIdentityPageProps> = ({
  sekolah,
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
        padding: isLandscape ? '28px 36px' : '48px 40px 48px 40px',
        width: '100%',
        fontFamily: effectiveFont,
        fontSize: effectiveSize,
        lineHeight: printLineHeight
      }}
    >
      <div>
        {/* JUDUL HALAMAN */}
        <div className={`text-center ${isLandscape ? 'pt-2 pb-6' : 'pt-8 pb-14'} space-y-1`}>
          <h1 className="text-xl sm:text-2xl font-bold tracking-wider uppercase text-black">
            RAPOR PESERTA DIDIK
          </h1>
          <h2 className="text-lg sm:text-xl font-bold tracking-wider uppercase text-black">
            SEKOLAH DASAR (SD)
          </h2>
        </div>

        {/* FORM IDENTITAS SATUAN PENDIDIKAN DENGAN TITIK DUA RATA (MENGGUNAKAN SATUAN em AGAR RAPI DI HURUF BESAR) */}
        <div
          className={`mx-auto text-sm leading-relaxed text-black ${
            isLandscape ? 'max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3' : 'max-w-3xl pl-2 sm:pl-6 space-y-3.5'
          }`}
        >
          <div className="flex">
            <span className="w-[10.5em] font-bold shrink-0">Nama Sekolah</span>
            <span className="w-[1.2em] text-center font-bold shrink-0">:</span>
            <span className="font-bold flex-1">{sekolah.namaSekolah || 'SD Negeri Balil'}</span>
          </div>

          <div className="flex">
            <span className="w-[10.5em] font-bold shrink-0">NISN/NIS/NSS</span>
            <span className="w-[1.2em] text-center font-bold shrink-0">:</span>
            <span className="flex-1 font-mono">{sekolah.nss || '_'}</span>
          </div>

          <div className="flex">
            <span className="w-[10.5em] font-bold shrink-0">NPSN</span>
            <span className="w-[1.2em] text-center font-bold shrink-0">:</span>
            <span className="font-bold font-mono flex-1">{sekolah.npsn || '69970290'}</span>
          </div>

          <div className="flex">
            <span className="w-[10.5em] font-bold shrink-0">Alamat Sekolah</span>
            <span className="w-[1.2em] text-center font-bold shrink-0">:</span>
            <span className="flex-1">{sekolah.alamat || 'Jl.Betaabib Kabiding'}</span>
          </div>

          <div className="flex items-center">
            <span className="w-[10.5em] shrink-0 font-bold" />
            <span className="w-[1.2em] text-center shrink-0" />
            <div className="flex-1 flex flex-wrap gap-x-6 gap-y-1">
              <span>
                <span className="underline">Kode Pos. {sekolah.kodePos || '99573'}</span>
              </span>
              <span>
                Telp. {sekolah.telepon || '_'}
              </span>
            </div>
          </div>

          <div className="flex">
            <span className="w-[10.5em] font-bold shrink-0">Kelurahan/Desa</span>
            <span className="w-[1.2em] text-center font-bold shrink-0">:</span>
            <span className="flex-1">{sekolah.desaKelurahan || 'Kabiding'}</span>
          </div>

          <div className="flex">
            <span className="w-[10.5em] font-bold shrink-0">Kecamatan</span>
            <span className="w-[1.2em] text-center font-bold shrink-0">:</span>
            <span className="flex-1">{sekolah.distrikKecamatan || 'Oksibil'}</span>
          </div>

          <div className="flex">
            <span className="w-[10.5em] font-bold shrink-0">Kabupaten/Kota</span>
            <span className="w-[1.2em] text-center font-bold shrink-0">:</span>
            <span className="flex-1">{sekolah.kabupaten || 'Pegunungan Bintang'}</span>
          </div>

          <div className="flex">
            <span className="w-[10.5em] font-bold shrink-0">Provinsi</span>
            <span className="w-[1.2em] text-center font-bold shrink-0">:</span>
            <span className="flex-1">{sekolah.provinsi || 'Papua Pegunungan'}</span>
          </div>

          <div className="flex">
            <span className="w-[10.5em] font-bold shrink-0">Website</span>
            <span className="w-[1.2em] text-center font-bold shrink-0">:</span>
            <span className="flex-1 break-all">{sekolah.website || '_'}</span>
          </div>

          <div className="flex">
            <span className="w-[10.5em] font-bold shrink-0">E-mail</span>
            <span className="w-[1.2em] text-center font-bold shrink-0">:</span>
            <span className="flex-1 break-all">{sekolah.emailSekolah || '_'}</span>
          </div>
        </div>
      </div>

      {/* Bagian Bawah Kaki Halaman (Page 2) */}
      <div className="text-center text-xs text-slate-400 font-serif pb-4 pt-6">
        <span>Halaman 2 — Rapor Peserta Didik (Identitas Satuan Pendidikan)</span>
      </div>
    </div>
  );
};
