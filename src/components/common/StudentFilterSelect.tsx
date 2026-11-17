import React from 'react';
import { Filter, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface StudentFilterSelectProps {
  classScope?: 'active' | 'all';
  label?: string;
  compact?: boolean;
  className?: string;
}

export const StudentFilterSelect: React.FC<StudentFilterSelectProps> = ({
  classScope = 'active',
  label = 'Filter Nama Siswa:',
  compact = false,
  className = ''
}) => {
  const { db, selectedKelas, selectedStudentFilter, setSelectedStudentFilter } = useApp();

  const studentOptions =
    classScope === 'all'
      ? db.siswa
      : db.siswa.filter((s) => s.kelas === selectedKelas);

  return (
    <div
      className={`inline-flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 ${
        compact ? 'py-1' : 'py-1.5'
      } text-xs ${className}`}
    >
      <Filter size={13} className="text-emerald-700 shrink-0" />
      <span className="font-bold text-slate-700 whitespace-nowrap">{label}</span>
      <select
        value={selectedStudentFilter}
        onChange={(e) => setSelectedStudentFilter(e.target.value)}
        className="bg-transparent font-bold text-emerald-800 focus:outline-hidden cursor-pointer max-w-[220px]"
        title="Pilih nama siswa untuk memfilter data secara otomatis di seluruh menu"
      >
        <option value="SEMUA">
          Semua Siswa ({studentOptions.length})
        </option>
        {studentOptions.map((s) => (
          <option key={s.idSiswa} value={s.idSiswa}>
            {s.namaSiswa}
            {classScope === 'all' ? ` (Kls ${s.kelas})` : ''}
          </option>
        ))}
      </select>
      {selectedStudentFilter !== 'SEMUA' && (
        <button
          type="button"
          onClick={() => setSelectedStudentFilter('SEMUA')}
          title="Tampilkan Semua Siswa"
          className="p-0.5 rounded bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};
