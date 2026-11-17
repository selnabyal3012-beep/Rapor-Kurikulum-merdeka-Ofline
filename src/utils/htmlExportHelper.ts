import { DatabaseState } from '../types';

function escapeHtml(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTableSection(
  id: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | undefined | null)[][]
): string {
  const thCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const bodyRows =
    rows.length === 0
      ? `<tr><td colspan="${headers.length}" class="empty-cell">Belum ada data pada bagian ini.</td></tr>`
      : rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell) => `<td>${escapeHtml(cell === undefined || cell === null || cell === '' ? '-' : cell)}</td>`)
                .join('')}</tr>`
          )
          .join('\n          ');

  return `
    <section class="data-section" id="sec-${escapeHtml(id)}" data-section="${escapeHtml(id)}">
      <div class="section-header">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        <span class="badge">${rows.length} Baris</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${thCells}</tr>
          </thead>
          <tbody>
          ${bodyRows}
          </tbody>
        </table>
      </div>
    </section>`;
}

export function generateFullAppHtml(db: DatabaseState): string {
  const exportedAt = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const safeJsonPayload = JSON.stringify(
    {
      ...db,
      users: (db.users || []).map((u) => ({
        ...u,
        password: '******'
      }))
    },
    null,
    2
  ).replace(/<\/script>/gi, '<\\/script>');

  const sekolahRows: [string, string][] = [
    ['Nama Pemerintah', db.sekolah.namaPemerintah],
    ['Nama Instansi', db.sekolah.namaInstansi],
    ['Nama Sekolah', db.sekolah.namaSekolah],
    ['NPSN', db.sekolah.npsn],
    ['NSS', db.sekolah.nss],
    ['Alamat', db.sekolah.alamat],
    ['Desa / Kelurahan', db.sekolah.desaKelurahan],
    ['Distrik / Kecamatan', db.sekolah.distrikKecamatan],
    ['Kabupaten', db.sekolah.kabupaten],
    ['Provinsi', db.sekolah.provinsi],
    ['Kode Pos', db.sekolah.kodePos],
    ['Telepon / Email', `${db.sekolah.telepon || '-'} / ${db.sekolah.emailSekolah || '-'}`],
    ['Kepala Sekolah', `${db.sekolah.namaKepalaSekolah} (NIP: ${db.sekolah.nipKepalaSekolah || '-'})`],
    ['Wali Kelas Aktif', `${db.sekolah.waliKelas || '-'} (NIP: ${db.sekolah.nipWaliKelas || '-'})`],
    ['Tahun Pelajaran & Semester', `${db.sekolah.tahunPelajaran} • Semester ${db.sekolah.semester}`],
    ['Tempat & Tanggal Rapor', `${db.sekolah.tempatRapor}, ${db.sekolah.tanggalRapor}`]
  ];

  const sectionsHtml = [
    renderTableSection(
      'sekolah',
      '1. Identitas Sekolah',
      'Profil satuan pendidikan dan pejabat penanda tangan rapor.',
      ['No', 'Keterangan', 'Isi Data'],
      sekolahRows.map((r, i) => [i + 1, r[0], r[1]])
    ),
    renderTableSection(
      'guru',
      '2. Data Guru & Tenaga Kependidikan',
      'Daftar guru, wali kelas, dan guru mata pelajaran.',
      ['No', 'ID Guru', 'NIP', 'Nama Lengkap', 'JK', 'Tempat/Tgl Lahir', 'Pendidikan', 'Jabatan', 'Mapel', 'Kelas', 'Status', 'No HP'],
      (db.guru || []).map((g, i) => [
        i + 1,
        g.idGuru,
        g.nip,
        g.namaGuru,
        g.jenisKelamin,
        `${g.tempatLahir || '-'}, ${g.tanggalLahir || '-'}`,
        g.pendidikan,
        g.jabatan,
        g.mataPelajaran,
        g.kelas,
        g.status,
        g.noHp
      ])
    ),
    renderTableSection(
      'siswa',
      '3. Data Siswa (Peserta Didik)',
      'Biodata lengkap peserta didik beserta pekerjaan orang tua dan wali.',
      [
        'No',
        'ID',
        'NISN',
        'NIS',
        'Nama Siswa',
        'JK',
        'Tempat/Tgl Lahir',
        'Agama',
        'Kelas',
        'Fase',
        'Nama Ayah',
        'Pekerjaan Ayah',
        'Nama Ibu',
        'Pekerjaan Ibu',
        'Nama Wali',
        'Pekerjaan Wali',
        'Alamat',
        'Status'
      ],
      (db.siswa || []).map((s, i) => [
        i + 1,
        s.idSiswa,
        s.nisn,
        s.nis,
        s.namaSiswa,
        s.jenisKelamin,
        `${s.tempatLahir || '-'}, ${s.tanggalLahir || '-'}`,
        s.agama,
        s.kelas,
        s.fase,
        s.namaAyah,
        s.pekerjaanAyah || '-',
        s.namaIbu,
        s.pekerjaanIbu || '-',
        s.namaWali || '-',
        s.pekerjaanWali || '-',
        s.alamat,
        s.statusSiswa
      ])
    ),
    renderTableSection(
      'kelas',
      '4. Data Kelas & Rombongan Belajar',
      'Daftar kelas aktif, fase, wali kelas, dan jumlah peserta didik.',
      ['No', 'ID Kelas', 'Kelas', 'Fase', 'Wali Kelas', 'Tahun Pelajaran', 'Semester', 'Jumlah Siswa'],
      (db.kelas || []).map((k, i) => [
        i + 1,
        k.idKelas,
        k.namaKelas,
        k.fase,
        k.waliKelas,
        k.tahunPelajaran,
        k.semester,
        k.jumlahSiswa
      ])
    ),
    renderTableSection(
      'mapel',
      '5. Data Mata Pelajaran & KKM',
      'Daftar mata pelajaran kurikulum merdeka beserta KKTP/KKM.',
      ['No', 'Urutan', 'Kode', 'Nama Mata Pelajaran', 'Kelompok', 'KKM'],
      (db.mataPelajaran || []).map((m, i) => [
        i + 1,
        m.urutan,
        m.kode || '-',
        m.mataPelajaran,
        m.kelompok,
        m.kkm ?? 70
      ])
    ),
    renderTableSection(
      'tp',
      '6. Tujuan Pembelajaran (TP)',
      'Daftar kode TP dan rumusan tujuan pembelajaran per mapel & fase.',
      ['No', 'Kode TP', 'Mata Pelajaran', 'Agama', 'Fase', 'Kelas', 'Tujuan Pembelajaran'],
      (db.tujuanPembelajaran || []).map((t, i) => [
        i + 1,
        t.kodeTp,
        t.mataPelajaran,
        t.agama || 'Semua',
        t.fase,
        t.kelas,
        t.tujuanPembelajaran
      ])
    ),
    renderTableSection(
      'nilai',
      '7. Nilai Akademik & Deskripsi Rapor',
      'Rekap seluruh nilai input bebas, jumlah nilai, nilai akhir, predikat, dan deskripsi otomatis.',
      [
        'No',
        'TP / Semester',
        'Kelas',
        'NISN',
        'Nama Siswa',
        'Mata Pelajaran',
        'Formatif',
        'Sumatif',
        'PH1',
        'PH2',
        'PH3',
        'PTS',
        'PAS',
        'Praktik',
        'Jumlah',
        'Nilai Akhir',
        'Predikat',
        'Deskripsi Rapor'
      ],
      (db.nilaiAkademik || []).map((n, i) => [
        i + 1,
        `${n.tahunPelajaran} (${n.semester})`,
        n.kelas,
        n.nisn,
        n.namaSiswa,
        n.mataPelajaran,
        n.formatif ?? 0,
        n.sumatif ?? 0,
        n.ph1 ?? 0,
        n.ph2 ?? 0,
        n.ph3 ?? 0,
        n.pts ?? 0,
        n.pas ?? 0,
        n.praktik ?? 0,
        n.jumlahNilai ?? 0,
        n.nilaiAkhir,
        n.predikat,
        n.deskripsiRapor
      ])
    ),
    renderTableSection(
      'kehadiran',
      '8. Kehadiran Siswa (Presensi)',
      'Data ketidakhadiran siswa (Sakit, Izin, Tanpa Keterangan).',
      ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Semester', 'Sakit', 'Izin', 'Alpa', 'Total Hari'],
      (db.kehadiran || []).map((h, i) => [
        i + 1,
        h.nisn,
        h.namaSiswa,
        h.kelas,
        h.semester,
        h.sakit,
        h.izin,
        h.alpa,
        h.totalHari
      ])
    ),
    renderTableSection(
      'ekskul',
      '9. Ekstrakurikuler',
      'Data kegiatan ekstrakurikuler, predikat, dan keterangan siswa.',
      ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Semester', 'Jenis Ekstrakurikuler', 'Predikat', 'Keterangan'],
      (db.ekstrakurikuler || []).map((e, i) => [
        i + 1,
        e.nisn,
        e.namaSiswa,
        e.kelas,
        e.semester,
        e.jenisEkstrakurikuler,
        e.predikat,
        e.keterangan
      ])
    ),
    renderTableSection(
      'catatan',
      '10. Catatan Wali Kelas',
      'Catatan perkembangan dan motivasi siswa dari wali kelas.',
      ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Semester', 'Catatan Wali Kelas'],
      (db.catatanWali || []).map((c, i) => [
        i + 1,
        c.nisn,
        c.namaSiswa,
        c.kelas,
        c.semester,
        c.catatanWaliKelas
      ])
    ),
    renderTableSection(
      'keputusan',
      '11. Keputusan Kenaikan Kelas / Kelulusan',
      'Penetapan status kenaikan kelas atau kelulusan peserta didik.',
      ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Semester', 'Status Keputusan', 'Naik Ke', 'Tinggal Di', 'Keterangan'],
      (db.keputusanSiswa || []).map((d, i) => [
        i + 1,
        d.nisn,
        d.namaSiswa || '-',
        d.kelas,
        d.semester,
        d.statusKeputusan,
        d.naikKelas,
        d.tinggalKelas,
        d.keteranganTambahan || '-'
      ])
    ),
    renderTableSection(
      'p5_projek',
      '12. Projek Penguatan Profil Pelajar Pancasila (P5)',
      'Daftar projek kokurikuler P5 beserta tema dan deskripsi.',
      ['No', 'ID Projek', 'Nama Projek', 'Tema', 'Fase', 'Kelas', 'Semester', 'Deskripsi Projek'],
      (db.p5Projek || []).map((p, i) => [
        i + 1,
        p.idProjek,
        p.namaProjek,
        p.tema,
        p.fase,
        p.kelas,
        p.semester,
        p.deskripsiProjek
      ])
    ),
    renderTableSection(
      'p5_tahapan',
      '13. Tahapan Projek P5',
      'Rangkaian tahapan pelaksanaan projek P5.',
      ['No', 'ID Projek', 'Tahap', 'Kegiatan', 'Tanggal'],
      (db.p5Tahapan || []).map((t, i) => [i + 1, t.idProjek, t.tahap, t.kegiatan, t.tanggal])
    ),
    renderTableSection(
      'p5_dimensi',
      '14. Dimensi & Elemen P5',
      'Referensi dimensi, elemen, dan sub-elemen penilaian P5.',
      ['No', 'ID', 'Dimensi', 'Elemen', 'Sub-Elemen'],
      (db.p5Dimensi || []).map((d, i) => [i + 1, d.id, d.dimensi, d.elemen, d.subElemen])
    ),
    renderTableSection(
      'p5_nilai',
      '15. Nilai & Capaian P5 Siswa',
      'Capaian dimensi P5 (BB, MB, BSH, SB) dan catatan proses per peserta didik.',
      ['No', 'ID Projek', 'NISN', 'Nama Siswa', 'Kelas', 'Semester', 'Dimensi', 'Elemen', 'Capaian', 'Deskripsi'],
      (db.p5Nilai || []).map((p, i) => [
        i + 1,
        p.idProjek,
        p.nisn,
        p.namaSiswa,
        p.kelas,
        p.semester,
        p.dimensi,
        p.elemen,
        p.capaian,
        p.deskripsi
      ])
    ),
    renderTableSection(
      'piagam',
      '16. Piagam Penghargaan Siswa',
      'Daftar piagam prestasi akademik maupun non-akademik.',
      ['No', 'Nomor Piagam', 'NISN', 'Nama Siswa', 'Kelas', 'Kategori', 'Judul Penghargaan', 'Peringkat', 'Rata-Rata', 'Tanggal'],
      (db.piagam || []).map((p, i) => [
        i + 1,
        p.nomorPiagam,
        p.nisn,
        p.namaSiswa,
        p.kelas,
        p.kategoriPrestasi,
        p.judulPenghargaan,
        p.peringkat ?? '-',
        p.nilaiRataRata ?? '-',
        p.tanggalPenetapan
      ])
    ),
    renderTableSection(
      'users',
      '17. Akun Operator & Pengguna Sistem',
      'Daftar pengguna terdaftar pada aplikasi (kata sandi disembunyikan demi keamanan).',
      ['No', 'Username', 'Nama Lengkap', 'Peran / Role', 'NIP', 'Tanggal Dibuat'],
      (db.users || []).map((u, i) => [i + 1, u.username, u.namaLengkap, u.role, u.nip || '-', u.createdAt])
    )
  ].join('\n');

  const navLinks = [
    ['all', 'Semua Data'],
    ['sekolah', 'Sekolah'],
    ['guru', `Guru (${(db.guru || []).length})`],
    ['siswa', `Siswa (${(db.siswa || []).length})`],
    ['kelas', `Kelas (${(db.kelas || []).length})`],
    ['mapel', `Mapel (${(db.mataPelajaran || []).length})`],
    ['tp', `TP (${(db.tujuanPembelajaran || []).length})`],
    ['nilai', `Nilai (${(db.nilaiAkademik || []).length})`],
    ['kehadiran', `Presensi (${(db.kehadiran || []).length})`],
    ['ekskul', `Ekskul (${(db.ekstrakurikuler || []).length})`],
    ['catatan', `Catatan (${(db.catatanWali || []).length})`],
    ['keputusan', `Keputusan (${(db.keputusanSiswa || []).length})`],
    ['p5_projek', `P5 Projek (${(db.p5Projek || []).length})`],
    ['p5_nilai', `P5 Nilai (${(db.p5Nilai || []).length})`],
    ['piagam', `Piagam (${(db.piagam || []).length})`],
    ['users', `Akun (${(db.users || []).length})`]
  ]
    .map(
      ([id, label], idx) =>
        `<button type="button" class="nav-btn${idx === 0 ? ' active' : ''}" data-filter="${escapeHtml(id)}">${escapeHtml(label)}</button>`
    )
    .join('\n        ');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Arsip Data Lengkap HTML - ${escapeHtml(db.sekolah.namaSekolah)}</title>
  <style>
    :root {
      --bg: #f1f5f9;
      --surface: #ffffff;
      --ink: #0f172a;
      --muted: #475569;
      --border: #cbd5e1;
      --primary: #065f46;
      --primary-dark: #064e3b;
      --accent: #0891b2;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.5;
    }
    .topbar {
      background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%);
      color: #ffffff;
      padding: 24px 28px;
      border-bottom: 4px solid #10b981;
    }
    .topbar-inner {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .topbar h1 {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.3px;
    }
    .topbar p {
      margin: 0;
      font-size: 13px;
      color: #a7f3d0;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .btn {
      border: 1px solid rgba(255,255,255,0.25);
      background: rgba(255,255,255,0.12);
      color: #ffffff;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn:hover { background: rgba(255,255,255,0.22); }
    .btn-primary {
      background: #10b981;
      color: #022c22;
      border-color: #34d399;
    }
    .btn-primary:hover { background: #34d399; }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .kpi-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 14px;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--muted);
    }
    .kpi-val {
      font-size: 22px;
      font-weight: 800;
      color: var(--primary);
      margin-top: 2px;
    }
    .toolbar {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: sticky;
      top: 10px;
      z-index: 20;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
    }
    .search-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
    }
    .nav-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .nav-btn {
      border: 1px solid var(--border);
      background: #f8fafc;
      color: #334155;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .nav-btn.active {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary-dark);
    }
    .data-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .data-section.hidden { display: none; }
    .section-header {
      padding: 14px 18px;
      background: #f8fafc;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .section-header h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .section-header p {
      margin: 2px 0 0;
      font-size: 12px;
      color: var(--muted);
    }
    .badge {
      background: #d1fae5;
      color: #065f46;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }
    .table-wrap {
      width: 100%;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 7px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #0f172a;
      color: #f8fafc;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #ecfdf5; }
    tbody tr.row-hidden { display: none; }
    .empty-cell {
      text-align: center;
      color: #64748b;
      font-style: italic;
      padding: 16px;
    }
    footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: var(--muted);
    }
    @media print {
      body { background: #ffffff; }
      .toolbar, .actions { display: none !important; }
      .data-section { break-inside: avoid; border: 1px solid #000; }
      th { background: #e2e8f0 !important; color: #000 !important; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <div>
        <h1>ARSIP DATA LENGKAP APLIKASI RAPOR — ${escapeHtml(db.sekolah.namaSekolah)}</h1>
        <p>NPSN: ${escapeHtml(db.sekolah.npsn)} • Tahun Pelajaran ${escapeHtml(db.sekolah.tahunPelajaran)} (Semester ${escapeHtml(db.sekolah.semester)}) • Diekspor: ${escapeHtml(exportedAt)}</p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" onclick="window.print()">Cetak / Simpan PDF</button>
        <button type="button" class="btn" onclick="downloadEmbeddedJson()">Unduh Backup JSON</button>
      </div>
    </div>
  </header>

  <main class="container">
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Guru & Tendik</div><div class="kpi-val">${(db.guru || []).length}</div></div>
      <div class="kpi-card"><div class="kpi-label">Peserta Didik</div><div class="kpi-val">${(db.siswa || []).length}</div></div>
      <div class="kpi-card"><div class="kpi-label">Kelas</div><div class="kpi-val">${(db.kelas || []).length}</div></div>
      <div class="kpi-card"><div class="kpi-label">Mata Pelajaran</div><div class="kpi-val">${(db.mataPelajaran || []).length}</div></div>
      <div class="kpi-card"><div class="kpi-label">Tujuan Pemb. (TP)</div><div class="kpi-val">${(db.tujuanPembelajaran || []).length}</div></div>
      <div class="kpi-card"><div class="kpi-label">Nilai Akademik</div><div class="kpi-val">${(db.nilaiAkademik || []).length}</div></div>
      <div class="kpi-card"><div class="kpi-label">Projek & Nilai P5</div><div class="kpi-val">${(db.p5Projek || []).length} / ${(db.p5Nilai || []).length}</div></div>
      <div class="kpi-card"><div class="kpi-label">Piagam</div><div class="kpi-val">${(db.piagam || []).length}</div></div>
    </div>

    <div class="toolbar">
      <input
        type="search"
        id="globalSearch"
        class="search-input"
        placeholder="Cari nama siswa, NISN, guru, mata pelajaran, TP, nilai, atau deskripsi di seluruh tabel..."
      />
      <div class="nav-pills" id="sectionFilter">
        ${navLinks}
      </div>
    </div>

    ${sectionsHtml}
  </main>

  <footer>
    Dokumen HTML mandiri dihasilkan oleh Aplikasi Rapor Kurikulum Merdeka • ${escapeHtml(db.sekolah.namaSekolah)}, ${escapeHtml(db.sekolah.kabupaten)}.
  </footer>

  <script id="app-database-json" type="application/json">${safeJsonPayload}</script>
  <script>
    (function () {
      var activeFilter = 'all';
      var searchInput = document.getElementById('globalSearch');
      var filterButtons = document.querySelectorAll('.nav-btn');
      var sections = document.querySelectorAll('.data-section');

      function applyFilter() {
        var q = (searchInput.value || '').trim().toLowerCase();
        sections.forEach(function (sec) {
          var id = sec.getAttribute('data-section');
          var visibleByTab = activeFilter === 'all' || activeFilter === id;
          if (!visibleByTab) {
            sec.classList.add('hidden');
            return;
          }
          sec.classList.remove('hidden');
          var rows = sec.querySelectorAll('tbody tr');
          rows.forEach(function (row) {
            if (!q) {
              row.classList.remove('row-hidden');
            } else {
              var text = (row.textContent || '').toLowerCase();
              if (text.indexOf(q) !== -1) {
                row.classList.remove('row-hidden');
              } else {
                row.classList.add('row-hidden');
              }
            }
          });
        });
      }

      filterButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          filterButtons.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          activeFilter = btn.getAttribute('data-filter') || 'all';
          applyFilter();
        });
      });

      searchInput.addEventListener('input', applyFilter);

      window.downloadEmbeddedJson = function () {
        var jsonEl = document.getElementById('app-database-json');
        if (!jsonEl) return;
        var blob = new Blob([jsonEl.textContent || '{}'], { type: 'application/json;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'backup-database-rapor-${new Date().toISOString().slice(0, 10)}.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };
    })();
  </script>
</body>
</html>`;
}

export function downloadFullAppHtml(db: DatabaseState): string {
  const html = generateFullAppHtml(db);
  const blob = new Blob(['\uFEFF' + html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `arsip-tabel-data-rapor-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return html;
}

export async function buildFullAppBundleHtml(db: DatabaseState): Promise<string> {
  const safeJson = JSON.stringify(db).replace(/<\/script/gi, '<\\/script');
  const embeddedTag = `<script id="embedded-rapor-db-script">window.__EMBEDDED_RAPOR_DB__=${safeJson};window.__EMBEDDED_RAPOR_META__={exportedAt:${Date.now()}};</script>`;

  let baseHtml = '';

  if (window.location.protocol !== 'file:') {
    try {
      const resp = await fetch('/aplikasi-rapor-lengkap.html', { cache: 'no-store' });
      if (resp.ok) {
        const text = await resp.text();
        if (text.includes('__EMBEDDED_RAPOR_DATA_SLOT__') || text.includes('id="root"')) {
          baseHtml = text;
        }
      }
    } catch {
      // Fallback below if offline or unavailable
    }
  }

  if (!baseHtml) {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    const rootEl = clone.querySelector('#root');
    if (rootEl) rootEl.innerHTML = '';
    const oldEmbedded = clone.querySelector('#embedded-rapor-db-script');
    if (oldEmbedded) oldEmbedded.remove();
    baseHtml = '<!doctype html>\n' + clone.outerHTML;
  }

  if (baseHtml.includes('<!-- __EMBEDDED_RAPOR_DATA_SLOT__ -->')) {
    return baseHtml.replace(
      '<!-- __EMBEDDED_RAPOR_DATA_SLOT__ -->',
      () => `<!-- __EMBEDDED_RAPOR_DATA_SLOT__ -->\n${embeddedTag}`
    );
  }

  if (/<script\b[^>]*id=["']embedded-rapor-db-script["'][^>]*>[\s\S]*?<\/script>/i.test(baseHtml)) {
    return baseHtml.replace(
      /<script\b[^>]*id=["']embedded-rapor-db-script["'][^>]*>[\s\S]*?<\/script>/i,
      () => embeddedTag
    );
  }

  return baseHtml.replace('</head>', () => `${embeddedTag}\n</head>`);
}

export async function downloadFullAppBundleHtml(db: DatabaseState): Promise<string> {
  const fullHtml = await buildFullAppBundleHtml(db);
  const blob = new Blob(['\uFEFF' + fullHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Aplikasi_Rapor_Lengkap_Sama_Persis_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return fullHtml;
}

