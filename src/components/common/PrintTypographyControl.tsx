import React, { useState } from 'react';
import {
  Type,
  Baseline,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Minimize2,
  Maximize2,
  FileText,
  Bold,
  Italic,
  AlignLeft,
  AlignJustify,
  AlignCenter,
  Printer,
  LayoutTemplate
} from 'lucide-react';
import { useApp, PAPER_SIZE_MAP, getReportFontCssStack } from '../../context/AppContext';
import { PaperOrientation, PaperSize } from '../../types';

export interface FontOption {
  id: string;
  name: string;
  family: string;
  description: string;
  badge?: string;
}

export const AVAILABLE_FONTS: FontOption[] = [
  {
    id: 'calibri',
    name: 'Calibri',
    family: 'Calibri, "Carlito", Candara, "Segoe UI", Arial, sans-serif',
    description: 'Standar Microsoft Word modern, halus dan hemat ruang kertas',
    badge: 'Word Default'
  },
  {
    id: 'times',
    name: 'Times New Roman',
    family: '"Times New Roman", Times, Georgia, serif',
    description: 'Standar resmi kedinasan & Kemdikbudristek',
    badge: 'Standar Resmi'
  },
  {
    id: 'arial',
    name: 'Arial',
    family: 'Arial, Helvetica, sans-serif',
    description: 'Modern, bersih, jelas dan sangat mudah dibaca',
    badge: 'Modern'
  },
  {
    id: 'bookman',
    name: 'Bookman Old Style',
    family: '"Bookman Old Style", Georgia, "Times New Roman", serif',
    description: 'Klasik formal dokumen ijazah & piagam negara',
    badge: 'Klasik'
  },
  {
    id: 'georgia',
    name: 'Georgia',
    family: 'Georgia, "Times New Roman", serif',
    description: 'Serif berbobot elegan dengan kontras jelas',
    badge: 'Elegan'
  },
  {
    id: 'tahoma',
    name: 'Tahoma',
    family: 'Tahoma, Geneva, Verdana, sans-serif',
    description: 'Rapat, terstruktur rapi untuk tabel nilai',
    badge: 'Kompak'
  },
  {
    id: 'garamond',
    name: 'Garamond',
    family: 'Garamond, "EB Garamond", Georgia, serif',
    description: 'Halus berwibawa khas sertifikat & piagam penghargaan',
    badge: 'Formal'
  },
  {
    id: 'trebuchet',
    name: 'Trebuchet MS',
    family: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
    description: 'Tegas, modern kontemporer untuk laporan sekolah',
    badge: 'Tegas'
  }
];

export interface FontSizeOption {
  size: string;
  numeric: number;
  label: string;
  description: string;
}

export const AVAILABLE_SIZES: FontSizeOption[] = [
  { size: '8pt', numeric: 8, label: '8 pt (Ekstra Kecil)', description: 'Sangat padat untuk muat banyak mata pelajaran' },
  { size: '8.5pt', numeric: 8.5, label: '8.5 pt (Sangat Padat)', description: 'Rapat namun tetap terbaca jelas' },
  { size: '9pt', numeric: 9, label: '9 pt (Kecil Padat)', description: 'Cocok jika deskripsi TP sangat panjang agar muat 1 halaman' },
  { size: '9.5pt', numeric: 9.5, label: '9.5 pt (Padat Proporsional)', description: 'Teks rapi hemat ruang tanpa mengurangi keterbacaan' },
  { size: '10pt', numeric: 10, label: '10 pt (Ringkas Standar)', description: 'Ukuran ideal untuk rapor dengan banyak mata pelajaran' },
  { size: '10.5pt', numeric: 10.5, label: '10.5 pt (Sedang Seimbang)', description: 'Proporsional seimbang antara kerapatan dan kenyamanan baca' },
  { size: '11pt', numeric: 11, label: '11 pt (Standar Resmi)', description: 'Ukuran standar nasional rapor Kurikulum Merdeka / Word' },
  { size: '11.5pt', numeric: 11.5, label: '11.5 pt (Jelas Terbaca)', description: 'Nyaman dibaca oleh orang tua / wali peserta didik' },
  { size: '12pt', numeric: 12, label: '12 pt (Besar Standar)', description: 'Huruf besar jelas dan tegas untuk dokumen resmi' },
  { size: '13pt', numeric: 13, label: '13 pt (Cukup Besar)', description: 'Sangat jelas untuk pencetakan dokumen penting' },
  { size: '14pt', numeric: 14, label: '14 pt (Besar)', description: 'Huruf besar nyaman dibaca untuk rapor & dokumen lebar' },
  { size: '15pt', numeric: 15, label: '15 pt (Lebih Besar)', description: 'Huruf lebih besar agar semakin jelas saat dicetak' },
  { size: '16pt', numeric: 16, label: '16 pt (Ekstra Besar)', description: 'Ukuran ekstra besar untuk kejelasan maksimal' },
  { size: '18pt', numeric: 18, label: '18 pt (Sangat Besar)', description: 'Huruf sangat besar untuk tampilan jelas / lanskap' },
  { size: '20pt', numeric: 20, label: '20 pt (Jumbo Besar)', description: 'Huruf jumbo besar dan tegas' },
  { size: '22pt', numeric: 22, label: '22 pt (Super Besar)', description: 'Ukuran super besar untuk judul atau pembacaan jarak jauh' },
  { size: '24pt', numeric: 24, label: '24 pt (Maksimal Besar)', description: 'Ukuran maksimal besar untuk dokumen resmi' }
];

interface PrintTypographyControlProps {
  className?: string;
  compact?: boolean;
}

export const PrintTypographyControl: React.FC<PrintTypographyControlProps> = ({
  className = ''
}) => {
  const {
    printFontFamily,
    setPrintFontFamily,
    printFontSize,
    setPrintFontSize,
    printLineHeight,
    setPrintLineHeight,
    printTextBold,
    setPrintTextBold,
    printTextItalic,
    setPrintTextItalic,
    printTextAlign,
    setPrintTextAlign,
    paperSize,
    setPaperSize,
    paperOrientation,
    setPaperOrientation,
    paperMarginPreset,
    setPaperMarginPreset,
    paperMargins,
    setPaperMargins,
    showSaveNotification,
    actionToolbarMode
  } = useApp();

  // Mode lokal: 'full' | 'compact' | 'hidden'
  const [localMode, setLocalMode] = useState<'full' | 'compact' | 'hidden'>('compact');
  const [activeRibbonTab, setActiveRibbonTab] = useState<'font' | 'layout'>('font');

  const effectiveMode =
    actionToolbarMode === 'hidden'
      ? 'hidden'
      : localMode;

  const activePaperSpec = PAPER_SIZE_MAP[paperSize] || PAPER_SIZE_MAP.F4;
  const displayPaperWidth = paperOrientation === 'landscape' ? activePaperSpec.heightMm : activePaperSpec.widthMm;
  const displayPaperHeight = paperOrientation === 'landscape' ? activePaperSpec.widthMm : activePaperSpec.heightMm;

  const changeSizeStep = (direction: 'up' | 'down') => {
    const currentNum = parseFloat(printFontSize) || 11;
    let nextNum: number;
    if (direction === 'up') {
      const step = currentNum >= 16 ? 2 : currentNum >= 12 ? 1 : 0.5;
      nextNum = Math.min(24, Math.round((currentNum + step) * 2) / 2);
    } else {
      const step = currentNum > 16 ? 2 : currentNum > 12 ? 1 : 0.5;
      nextNum = Math.max(8, Math.round((currentNum - step) * 2) / 2);
    }
    const nextSize = `${nextNum}pt`;
    setPrintFontSize(nextSize);
    showSaveNotification(`Ukuran huruf cetak diubah ke ${nextSize}`);
  };

  const handleSelectOrientation = (orientation: PaperOrientation) => {
    setPaperOrientation(orientation);
    const label = orientation === 'portrait' ? 'Vertikal (Portrait)' : 'Horizontal (Landscape)';
    showSaveNotification(`Bentuk kertas diatur ke ${label}`);
  };

  const handleSetPreset = (font: string, size: string, label: string) => {
    setPrintFontFamily(font);
    setPrintFontSize(size);
    showSaveNotification(`Preset "${label}" (${font} ${size}) diterapkan!`);
  };

  const handleMarginInput = (side: 'top' | 'bottom' | 'left' | 'right', rawVal: string) => {
    const num = Math.max(0, Math.min(60, parseInt(rawVal, 10) || 0));
    setPaperMargins({
      ...paperMargins,
      [side]: num
    });
  };

  const applyCustomMarginPreset = (
    top: number,
    bottom: number,
    left: number,
    right: number,
    label: string
  ) => {
    setPaperMargins({ top, bottom, left, right });
    showSaveNotification(`Margin kertas diatur ke ${label} (${top}/${bottom}/${left}/${right} mm)`);
  };

  const handleResetAll = () => {
    setPrintFontFamily('Times New Roman');
    setPrintFontSize('11pt');
    setPrintLineHeight('1.35');
    setPrintTextBold(false);
    setPrintTextItalic(false);
    setPrintTextAlign('left');
    setPaperSize('F4');
    setPaperOrientation('portrait');
    setPaperMarginPreset('standar');
    showSaveNotification(
      'Pengaturan Huruf & Kertas direset ke Standar Resmi (Times New Roman 11pt, F4 Portrait)'
    );
  };

  const activeFontObj =
    AVAILABLE_FONTS.find((f) => f.name.toLowerCase() === printFontFamily.toLowerCase()) ||
    AVAILABLE_FONTS[0];

  // 1. HIDDEN MODE
  if (effectiveMode === 'hidden') {
    return (
      <div
        className={`bg-amber-50/70 hover:bg-amber-50 border border-dashed border-amber-300 rounded-xl px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 no-print transition-all shadow-2xs ${className}`}
      >
        <div className="flex items-center gap-2 text-xs text-slate-700 flex-wrap">
          <Type size={14} className="text-amber-700" />
          <span className="font-extrabold text-slate-800">Huruf &amp; Kertas Print:</span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-800 border border-amber-200">
            {printFontFamily} {printFontSize}
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-indigo-800 border border-indigo-200">
            {paperSize} • {paperOrientation === 'portrait' ? 'Vertikal (Portrait)' : 'Horizontal (Landscape)'} ({displayPaperWidth}×{displayPaperHeight}mm) • Margin{' '}
            {paperMargins.top}/{paperMargins.right}/{paperMargins.bottom}/{paperMargins.left}mm
          </span>
        </div>

        <div className="ml-auto flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={handleResetAll}
            className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Reset Huruf & Kertas ke Standar Resmi"
          >
            <RotateCcw size={11} />
          </button>
          <button
            type="button"
            onClick={() => setLocalMode('compact')}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <Eye size={12} />
            <span>Tampilkan Pengaturan Huruf &amp; Kertas</span>
          </button>
          <button
            type="button"
            onClick={() => setLocalMode('full')}
            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 cursor-pointer"
            title="Buka penuh"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
    );
  }

  // 2. COMPACT RIBBON MODE (Huruf + Paragraf + Page Setup dalam satu panel rapi)
  if (effectiveMode === 'compact') {
    return (
      <div
        className={`bg-gradient-to-r from-slate-50 via-white to-indigo-50/70 border border-slate-300 rounded-2xl p-3 shadow-xs no-print transition-all space-y-2.5 ${className}`}
      >
        {/* Baris 1: Pengaturan Huruf & Paragraf (Seperti Ribbon Word: Font, Size, A+, A-, B, I, Align, Spasi) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-slate-800 mr-1">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                <Type size={14} />
              </div>
              <span>Huruf &amp; Paragraf:</span>
            </div>

            {/* Font Family */}
            <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-300 shadow-2xs">
              <Baseline size={13} className="text-blue-600 shrink-0" />
              <select
                value={printFontFamily}
                onChange={(e) => {
                  setPrintFontFamily(e.target.value);
                  showSaveNotification(`Bentuk huruf diubah ke ${e.target.value}`);
                }}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer max-w-[155px]"
                style={{ fontFamily: getReportFontCssStack(printFontFamily) }}
                title="Pilih Bentuk Huruf (Font)"
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font.id} value={font.name} style={{ fontFamily: font.family }}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-300 shadow-2xs">
              <Sliders size={13} className="text-indigo-600 shrink-0" />
              <select
                value={printFontSize}
                onChange={(e) => {
                  setPrintFontSize(e.target.value);
                  showSaveNotification(`Ukuran huruf diubah ke ${e.target.value}`);
                }}
                className="bg-transparent text-xs font-bold text-blue-900 focus:outline-hidden cursor-pointer"
                title="Pilih Ukuran Huruf (pt)"
              >
                {AVAILABLE_SIZES.map((sz) => (
                  <option key={sz.size} value={sz.size}>
                    {sz.size}
                  </option>
                ))}
              </select>
            </div>

            {/* Aˇ dan A^ (Perkecil & Perbesar Huruf hingga 24pt) */}
            <div className="inline-flex items-center rounded-xl bg-white border border-slate-300 shadow-2xs p-0.5">
              <button
                type="button"
                onClick={() => changeSizeStep('down')}
                className="px-2 py-1 hover:bg-slate-100 text-slate-700 font-black text-xs rounded-lg transition-colors cursor-pointer"
                title="Perkecil huruf"
              >
                Aˇ
              </button>
              <div className="h-3.5 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => changeSizeStep('up')}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-black text-xs rounded-lg transition-colors cursor-pointer"
                title="Perbesar huruf (sampai 24pt)"
              >
                A^ Besar
              </button>
            </div>

            {/* Pilihan Cepat Ukuran Huruf Besar */}
            <div className="hidden xl:inline-flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded-xl border border-slate-300 shadow-2xs">
              {['11pt', '12pt', '14pt', '16pt', '18pt', '20pt'].map((szQuick) => (
                <button
                  key={szQuick}
                  type="button"
                  onClick={() => {
                    setPrintFontSize(szQuick);
                    showSaveNotification(`Ukuran huruf diatur ke ${szQuick}`);
                  }}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black cursor-pointer transition-colors ${
                    printFontSize === szQuick
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={`Atur ukuran huruf ke ${szQuick}`}
                >
                  {szQuick.replace('pt', '')}
                </button>
              ))}
            </div>

            {/* Bold & Italic */}
            <div className="inline-flex items-center rounded-xl bg-white border border-slate-300 shadow-2xs p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setPrintTextBold(!printTextBold)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  printTextBold ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Tebalkan teks isi tabel (Bold)"
              >
                <Bold size={13} />
              </button>
              <button
                type="button"
                onClick={() => setPrintTextItalic(!printTextItalic)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  printTextItalic ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Miringkan teks isi rapor (Italic)"
              >
                <Italic size={13} />
              </button>
            </div>

            {/* Perataan Paragraf */}
            <div className="inline-flex items-center rounded-xl bg-white border border-slate-300 shadow-2xs p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setPrintTextAlign('left')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  printTextAlign === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Rata Kiri (Align Left)"
              >
                <AlignLeft size={13} />
              </button>
              <button
                type="button"
                onClick={() => setPrintTextAlign('justify')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  printTextAlign === 'justify' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Rata Kanan-Kiri (Justify)"
              >
                <AlignJustify size={13} />
              </button>
              <button
                type="button"
                onClick={() => setPrintTextAlign('center')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  printTextAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Rata Tengah (Center)"
              >
                <AlignCenter size={13} />
              </button>
            </div>

            {/* Spasi Baris */}
            <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-300 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500">Spasi:</span>
              <select
                value={printLineHeight}
                onChange={(e) => {
                  setPrintLineHeight(e.target.value);
                  showSaveNotification(`Spasi baris diatur ke ${e.target.value}`);
                }}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                title="Spasi Baris Teks Rapor"
              >
                <option value="1.15">1.15 (Rapat)</option>
                <option value="1.35">1.35 (Standar)</option>
                <option value="1.5">1.5 (Lega)</option>
                <option value="1.75">1.75 (Lebar)</option>
              </select>
            </div>
          </div>

          {/* Kontrol kanan: Reset, Perluas, Hilangkan */}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetAll}
              className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer shadow-2xs inline-flex items-center gap-1"
              title="Reset Huruf & Kertas ke Standar Resmi"
            >
              <RotateCcw size={12} />
              <span className="hidden md:inline">Reset</span>
            </button>

            <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-300 shadow-2xs">
              <button
                type="button"
                onClick={() => setLocalMode('full')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                title="Buka pengaturan lengkap Margin (Atas/Bawah/Kiri/Kanan), Ukuran Kertas & Font"
              >
                <Maximize2 size={12} />
                <span>Pengaturan Lengkap</span>
              </button>
              <button
                type="button"
                onClick={() => setLocalMode('hidden')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Sembunyikan panel"
              >
                <EyeOff size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Baris 2: Page Setup (Ukuran Kertas, Orientasi, Margins) persis Layout Word */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 font-black text-slate-800 mr-1">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
                <LayoutTemplate size={14} />
              </div>
              <span>Page Setup Kertas:</span>
            </div>

            {/* Size (Ukuran Kertas) */}
            <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-300 shadow-2xs">
              <FileText size={13} className="text-emerald-600 shrink-0" />
              <span className="text-[10px] font-bold text-slate-500">Size:</span>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
              >
                <option value="F4">F4 / Folio (215×330mm)</option>
                <option value="A4">A4 (210×297mm)</option>
                <option value="Legal">Legal (216×356mm)</option>
                <option value="Letter">Letter (216×279mm)</option>
              </select>
            </div>

            {/* Orientation (Vertikal / Horizontal) */}
            <div className="inline-flex items-center rounded-xl bg-white border border-emerald-300 shadow-2xs p-0.5 gap-0.5">
              <span className="text-[10px] font-extrabold text-emerald-800 px-1.5 hidden sm:inline">Bentuk:</span>
              <button
                type="button"
                onClick={() => handleSelectOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer inline-flex items-center gap-1 ${
                  paperOrientation === 'portrait'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Bentuk Kertas Vertikal / Tegak (Portrait)"
              >
                <span className="inline-block w-2.5 h-3.5 border-2 border-current rounded-[2px]" />
                <span>Vertikal</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectOrientation('landscape')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer inline-flex items-center gap-1 ${
                  paperOrientation === 'landscape'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Bentuk Kertas Horizontal / Mendatar (Landscape)"
              >
                <span className="inline-block w-3.5 h-2.5 border-2 border-current rounded-[2px]" />
                <span>Horizontal</span>
              </button>
              <span className="text-[10px] font-mono text-slate-500 px-1.5 hidden md:inline">
                {displayPaperWidth}×{displayPaperHeight}mm
              </span>
            </div>

            {/* Margin Presets */}
            <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-300 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500">Margins:</span>
              <button
                type="button"
                onClick={() => setPaperMarginPreset('standar')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                  paperMarginPreset === 'standar'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Normal (20/25mm)
              </button>
              <button
                type="button"
                onClick={() => applyCustomMarginPreset(15, 15, 15, 15, 'Sedang Rapi')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                  paperMargins.top === 15 && paperMargins.left === 15
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Sedang (15mm)
              </button>
              <button
                type="button"
                onClick={() => setPaperMarginPreset('sempit')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                  paperMarginPreset === 'sempit'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Sempit (10mm)
              </button>
            </div>

            {/* Inline Quick Margin mm readouts */}
            <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-300 shadow-2xs text-[11px]">
              <span className="font-bold text-slate-500">T:</span>
              <input
                type="number"
                min={0}
                max={60}
                value={paperMargins.top}
                onChange={(e) => handleMarginInput('top', e.target.value)}
                className="w-10 text-center font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-1 py-0.5"
                title="Margin Atas (mm)"
              />
              <span className="font-bold text-slate-500">B:</span>
              <input
                type="number"
                min={0}
                max={60}
                value={paperMargins.bottom}
                onChange={(e) => handleMarginInput('bottom', e.target.value)}
                className="w-10 text-center font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-1 py-0.5"
                title="Margin Bawah (mm)"
              />
              <span className="font-bold text-slate-500">L:</span>
              <input
                type="number"
                min={0}
                max={60}
                value={paperMargins.left}
                onChange={(e) => handleMarginInput('left', e.target.value)}
                className="w-10 text-center font-bold text-indigo-700 bg-slate-50 border border-slate-200 rounded px-1 py-0.5"
                title="Margin Kiri (mm)"
              />
              <span className="font-bold text-slate-500">R:</span>
              <input
                type="number"
                min={0}
                max={60}
                value={paperMargins.right}
                onChange={(e) => handleMarginInput('right', e.target.value)}
                className="w-10 text-center font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-1 py-0.5"
                title="Margin Kanan (mm)"
              />
              <span className="text-[10px] text-slate-400 font-mono">mm</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs cursor-pointer"
          >
            <Printer size={13} />
            <span>Print Sekarang</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. FULL RIBBON MODE (Font/Paragraph Tab + Page Setup Tab lengkap)
  return (
    <div
      className={`bg-gradient-to-br from-slate-50 via-white to-blue-50/70 border border-slate-300 rounded-2xl p-4 shadow-xs no-print transition-all ${className}`}
    >
      {/* Header Ribbon Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveRibbonTab('font')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
              activeRibbonTab === 'font'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <Type size={14} />
            <span>Home — Huruf &amp; Paragraf</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveRibbonTab('layout')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
              activeRibbonTab === 'layout'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <LayoutTemplate size={14} />
            <span>Layout — Pengaturan Kertas (Page Setup)</span>
          </button>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
            {printFontFamily} • {printFontSize} • Spasi {printLineHeight}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
            {paperSize} ({paperOrientation === 'portrait' ? 'VERTIKAL' : 'HORIZONTAL'} {displayPaperWidth}×{displayPaperHeight}mm) • Margin {paperMargins.top}/{paperMargins.bottom}/{paperMargins.left}/{paperMargins.right}mm
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset Standar</span>
          </button>
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-300">
            <button
              type="button"
              onClick={() => setLocalMode('compact')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              <Minimize2 size={12} />
              <span>Rampingkan</span>
            </button>
            <button
              type="button"
              onClick={() => setLocalMode('hidden')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
            >
              <EyeOff size={12} />
              <span>Hilangkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: HURUF & PARAGRAF (FONT & PARAGRAPH) */}
      {activeRibbonTab === 'font' && (
        <div className="mt-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Bentuk Huruf */}
            <div className="md:col-span-6 bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Baseline size={14} className="text-blue-600" />
                  <span>Bentuk Huruf (Font Family):</span>
                </label>
                <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                  {activeFontObj.description}
                </span>
              </div>

              <select
                value={printFontFamily}
                onChange={(e) => {
                  setPrintFontFamily(e.target.value);
                  showSaveNotification(`Bentuk huruf diubah ke ${e.target.value}`);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                style={{ fontFamily: getReportFontCssStack(printFontFamily) }}
              >
                {AVAILABLE_FONTS.map((font) => (
                  <option key={font.id} value={font.name} style={{ fontFamily: font.family }}>
                    {font.name} ({font.badge}) — {font.description}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_FONTS.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => {
                      setPrintFontFamily(font.name);
                      showSaveNotification(`Bentuk huruf diubah ke ${font.name}`);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                      printFontFamily.toLowerCase() === font.name.toLowerCase()
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                    style={{ fontFamily: font.family }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Ukuran Huruf & Gaya Paragraf */}
            <div className="md:col-span-6 bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Sliders size={14} className="text-indigo-600" />
                  <span>Ukuran Huruf &amp; Paragraf:</span>
                </label>
                <span className="font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {printFontSize}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={printFontSize}
                  onChange={(e) => {
                    setPrintFontSize(e.target.value);
                    showSaveNotification(`Ukuran huruf diubah ke ${e.target.value}`);
                  }}
                  className="flex-1 min-w-[160px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 cursor-pointer"
                >
                  {AVAILABLE_SIZES.map((sz) => (
                    <option key={sz.size} value={sz.size}>
                      {sz.label}
                    </option>
                  ))}
                </select>

                <div className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => changeSizeStep('down')}
                    className="px-2.5 py-1.5 hover:bg-white text-slate-700 font-black rounded-lg cursor-pointer"
                    title="Perkecil huruf"
                  >
                    Aˇ
                  </button>
                  <div className="h-4 w-px bg-slate-200" />
                  <button
                    type="button"
                    onClick={() => changeSizeStep('up')}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-black rounded-lg cursor-pointer"
                    title="Perbesar huruf hingga 24pt"
                  >
                    A^ Besar
                  </button>
                </div>

                {/* B, I, Align */}
                <div className="inline-flex items-center rounded-xl border border-slate-300 bg-slate-50 p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setPrintTextBold(!printTextBold)}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      printTextBold ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-white'
                    }`}
                    title="Bold"
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintTextItalic(!printTextItalic)}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      printTextItalic ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-white'
                    }`}
                    title="Italic"
                  >
                    <Italic size={14} />
                  </button>
                  <div className="h-4 w-px bg-slate-200 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setPrintTextAlign('left')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      printTextAlign === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-white'
                    }`}
                    title="Rata Kiri"
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintTextAlign('justify')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      printTextAlign === 'justify' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-white'
                    }`}
                    title="Rata Kanan-Kiri (Justify)"
                  >
                    <AlignJustify size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintTextAlign('center')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      printTextAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-white'
                    }`}
                    title="Rata Tengah"
                  >
                    <AlignCenter size={14} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-1">
                  {['10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setPrintFontSize(s);
                        showSaveNotification(`Ukuran huruf diatur ke ${s}`);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer ${
                        printFontSize === s
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="inline-flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500">Spasi Baris:</span>
                  {['1.15', '1.35', '1.5', '1.75'].map((lh) => (
                    <button
                      key={lh}
                      type="button"
                      onClick={() => setPrintLineHeight(lh)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer ${
                        printLineHeight === lh
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lh}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preset Cepat + Live Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1 mr-1">
                <Sparkles size={12} className="text-amber-500" />
                Preset Siap Pakai:
              </span>
              <button
                type="button"
                onClick={() => handleSetPreset('Calibri', '11pt', 'Calibri Word')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-blue-50 text-slate-800 border border-blue-300 cursor-pointer"
              >
                📝 Calibri 11pt (Word)
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('Times New Roman', '11pt', 'Standar Resmi')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-amber-50 text-slate-800 border border-amber-300 cursor-pointer"
              >
                🏛️ Times New Roman 11pt
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('Arial', '10pt', 'Modern Ringkas')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-emerald-50 text-slate-800 border border-emerald-300 cursor-pointer"
              >
                ✨ Arial 10pt
              </button>
            </div>

            <div className="md:col-span-6 bg-white p-2.5 rounded-xl border border-slate-300 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Pratinjau Teks Rapor Langsung:
                </div>
                <div
                  className="text-slate-900 truncate"
                  style={{
                    fontFamily: getReportFontCssStack(printFontFamily),
                    fontSize: printFontSize,
                    fontWeight: printTextBold ? 700 : 400,
                    fontStyle: printTextItalic ? 'italic' : 'normal'
                  }}
                >
                  Laporan Hasil Belajar Peserta Didik • Kurikulum Merdeka
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                <Check size={11} /> Aktif
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LAYOUT — PAGE SETUP (MARGINS, ORIENTATION, SIZE) */}
      {activeRibbonTab === 'layout' && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
          {/* 1. Size */}
          <div className="md:col-span-4 bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <FileText size={14} className="text-emerald-600" />
              <span>1. Ukuran Kertas (Size):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PAPER_SIZE_MAP) as PaperSize[]).map((szKey) => {
                const spec = PAPER_SIZE_MAP[szKey];
                const isSelected = paperSize === szKey;
                return (
                  <button
                    key={szKey}
                    type="button"
                    onClick={() => setPaperSize(szKey)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black text-sm">{szKey}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {spec.widthMm} × {spec.heightMm} mm
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Orientation (Vertikal / Horizontal) */}
          <div className="md:col-span-3 bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <LayoutTemplate size={14} className="text-blue-600" />
              <span>2. Bentuk Kertas:</span>
            </div>
            <div className="space-y-2">
              {(['portrait', 'landscape'] as PaperOrientation[]).map((ori) => (
                <button
                  key={ori}
                  type="button"
                  onClick={() => handleSelectOrientation(ori)}
                  className={`w-full p-2.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                    paperOrientation === ori
                      ? ori === 'portrait'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`border-2 rounded shrink-0 ${
                      ori === 'portrait' ? 'w-5 h-7' : 'w-7 h-5'
                    } ${paperOrientation === ori ? 'border-white' : 'border-slate-600'}`}
                  />
                  <div>
                    <div className="font-black text-xs">
                      {ori === 'portrait' ? 'Vertikal (Portrait)' : 'Horizontal (Landscape)'}
                    </div>
                    <div className={`text-[10px] ${paperOrientation === ori ? 'text-white/90' : 'text-slate-500'}`}>
                      {ori === 'portrait'
                        ? `Tegak ${activePaperSpec.widthMm}×${activePaperSpec.heightMm}mm`
                        : `Mendatar ${activePaperSpec.heightMm}×${activePaperSpec.widthMm}mm`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Margins */}
          <div className="md:col-span-5 bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-extrabold text-slate-800">3. Batas Tepi / Margins (mm):</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPaperMarginPreset('standar')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    paperMarginPreset === 'standar' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => applyCustomMarginPreset(15, 15, 15, 15, 'Sedang')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    paperMargins.top === 15 && paperMargins.left === 15
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Sedang (15mm)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperMarginPreset('sempit')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    paperMarginPreset === 'sempit' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Sempit (10mm)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Atas (Top)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={paperMargins.top}
                    onChange={(e) => handleMarginInput('top', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-slate-50"
                  />
                  <span className="text-[10px] text-slate-400">mm</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Bawah (Bottom)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={paperMargins.bottom}
                    onChange={(e) => handleMarginInput('bottom', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-slate-50"
                  />
                  <span className="text-[10px] text-slate-400">mm</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-indigo-700 mb-1">Kiri (Left)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={paperMargins.left}
                    onChange={(e) => handleMarginInput('left', e.target.value)}
                    className="w-full px-2 py-1.5 border border-indigo-300 rounded-lg font-bold text-indigo-900 bg-indigo-50/40"
                  />
                  <span className="text-[10px] text-slate-400">mm</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Kanan (Right)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={paperMargins.right}
                    onChange={(e) => handleMarginInput('right', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 bg-slate-50"
                  />
                  <span className="text-[10px] text-slate-400">mm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
