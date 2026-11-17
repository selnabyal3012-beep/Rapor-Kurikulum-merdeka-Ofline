import {
  AcademicScore,
  ClassLevel,
  DatabaseState,
  FaseType,
  SemesterType,
  Student,
  Subject,
  LearningObjective
} from '../types';
import {
  generateReportDescriptionFromTP,
  getCapaianFromScore,
  getPredikatFromScore,
  clampScore,
  SCORE_INPUT_FIELDS,
  calculateScoreSummaryFromFreeInputs
} from '../utils/tpDescriptionHelper';
import { isPlaceholderNisn, matchesStudentScore } from '../utils/studentSyncHelper';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
  owners?: { displayName?: string; emailAddress?: string }[];
}

export interface SheetTabMeta {
  sheetId: number;
  title: string;
  index: number;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl?: string;
  sheets: SheetTabMeta[];
}

export class WorkspaceAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceAuthError';
  }
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return trimmed;
}

function encodeA1SheetRange(sheetTitle: string, cellRange = 'A1:ZZ1000'): string {
  const escapedTitle = sheetTitle.replace(/'/g, "''");
  return encodeURIComponent(`'${escapedTitle}'!${cellRange}`);
}

async function handleApiResponse<T>(res: Response, fallbackMsg: string): Promise<T> {
  if (res.status === 401 || res.status === 403) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message || '';
    } catch {}
    if (res.status === 401) {
      throw new WorkspaceAuthError(
        detail || 'Sesi akses Google telah kedaluwarsa. Silakan klik "Sign in with Google" untuk menghubungkan ulang.'
      );
    }
    throw new Error(detail || 'Izin akses Google Drive / Sheets ditolak. Pastikan seluruh izin spreadsheet disetujui saat login.');
  }
  if (!res.ok) {
    let detail = fallbackMsg;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) detail = errBody.error.message;
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

/**
 * List Google Sheets files from user's Google Drive
 */
export async function listSpreadsheetsFromDrive(
  accessToken: string,
  searchQuery = ''
): Promise<DriveSpreadsheetFile[]> {
  const baseQuery = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  const escapedSearch = searchQuery.trim().replace(/'/g, "\\'");
  const q = escapedSearch ? `${baseQuery} and name contains '${escapedSearch}'` : baseQuery;

  const params = new URLSearchParams({
    q,
    fields: 'files(id,name,modifiedTime,webViewLink,owners(displayName,emailAddress))',
    orderBy: 'modifiedTime desc',
    pageSize: '30',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await handleApiResponse<{ files?: DriveSpreadsheetFile[] }>(
    res,
    'Gagal memuat daftar file Google Sheets dari Google Drive.'
  );
  return data.files || [];
}

/**
 * Fetch spreadsheet metadata including all sheet tab names (never assumes "Sheet1")
 */
export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetIdOrUrl: string
): Promise<SpreadsheetMetadata> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('ID atau tautan Google Sheets tidak valid.');
  }

  const params = new URLSearchParams({
    fields: 'spreadsheetId,properties.title,spreadsheetUrl,sheets(properties(sheetId,title,index,gridProperties(rowCount,columnCount)))',
  });

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const raw = await handleApiResponse<any>(
    res,
    'Gagal mengambil metadata Google Sheets. Pastikan ID spreadsheet benar dan dapat diakses.'
  );

  const sheets: SheetTabMeta[] = (raw.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId ?? 0,
    title: s.properties?.title || 'Tanpa Nama',
    index: s.properties?.index ?? 0,
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount,
  }));

  return {
    spreadsheetId: raw.spreadsheetId || spreadsheetId,
    title: raw.properties?.title || 'Spreadsheet Tanpa Judul',
    spreadsheetUrl: raw.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets,
  };
}

/**
 * Read values from a specific sheet tab and range
 */
export async function readSheetValues(
  accessToken: string,
  spreadsheetIdOrUrl: string,
  sheetTitle: string,
  cellRange = 'A1:ZZ1000'
): Promise<string[][]> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const rangeEncoded = encodeA1SheetRange(sheetTitle, cellRange);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeEncoded}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await handleApiResponse<{ values?: string[][] }>(
    res,
    `Gagal membaca data dari tab "${sheetTitle}".`
  );
  return data.values || [];
}

/**
 * Create a new Google Spreadsheet with one or more tabs and populate initial values
 */
export async function createSpreadsheetWithSheets(
  accessToken: string,
  title: string,
  sheetsPayload: { title: string; values: (string | number | boolean)[][] }[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: sheetsPayload.map((s) => ({
        properties: { title: s.title.slice(0, 99) },
      })),
    }),
  });

  const created = await handleApiResponse<any>(
    createRes,
    'Gagal membuat file Google Sheets baru.'
  );

  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl =
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const valueData = sheetsPayload.map((s) => ({
    range: `'${s.title.slice(0, 99).replace(/'/g, "''")}'!A1`,
    majorDimension: 'ROWS',
    values: s.values,
  }));

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueData,
      }),
    }
  );

  await handleApiResponse<any>(
    batchRes,
    'Spreadsheet berhasil dibuat, tetapi gagal mengisi baris data.'
  );

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: created.properties?.title || title,
  };
}

/**
 * Add a new sheet tab inside an existing spreadsheet
 */
export async function addSheetTab(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<string> {
  const cleanTitle = sheetTitle.trim().slice(0, 99) || 'Sheet Baru';
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: { title: cleanTitle },
            },
          },
        ],
      }),
    }
  );

  const result = await handleApiResponse<any>(
    res,
    `Gagal menambahkan tab "${cleanTitle}" ke spreadsheet.`
  );
  return result?.replies?.[0]?.addSheet?.properties?.title || cleanTitle;
}

/**
 * Write or append values to an existing tab in an existing Google Spreadsheet
 */
export async function writeValuesToSheet(
  accessToken: string,
  spreadsheetIdOrUrl: string,
  sheetTitle: string,
  values: (string | number | boolean)[][],
  mode: 'overwrite' | 'append'
): Promise<{ updatedRows: number }> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const rangeEncoded = encodeA1SheetRange(sheetTitle, 'A1:ZZ10000');

  if (mode === 'overwrite') {
    const clearRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeEncoded}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    await handleApiResponse<any>(clearRes, `Gagal membersihkan data lama pada tab "${sheetTitle}".`);

    const startEncoded = encodeA1SheetRange(sheetTitle, 'A1');
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${startEncoded}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          majorDimension: 'ROWS',
          values,
        }),
      }
    );

    const updated = await handleApiResponse<any>(
      updateRes,
      `Gagal menulis data ke tab "${sheetTitle}".`
    );
    return { updatedRows: updated?.updatedRows ?? values.length };
  }

  const startEncoded = encodeA1SheetRange(sheetTitle, 'A1');
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${startEncoded}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  const appended = await handleApiResponse<any>(
    appendRes,
    `Gagal menambahkan baris data ke tab "${sheetTitle}".`
  );
  return { updatedRows: appended?.updates?.updatedRows ?? values.length };
}

/**
 * Move a Google Sheets file to Trash in Google Drive (only called after explicit user confirmation)
 */
export async function trashDriveSpreadsheet(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });
  await handleApiResponse<any>(res, 'Gagal memindahkan file ke sampah Google Drive.');
}

// =========================================================================
// BUILDERS: Convert E-Rapor DatabaseState into clean Google Sheets 2D Arrays
// =========================================================================

export function buildStudentsSheetValues(
  db: DatabaseState,
  kelasFilter: ClassLevel | 'SEMUA'
): (string | number)[][] {
  const students =
    kelasFilter === 'SEMUA'
      ? db.siswa
      : db.siswa.filter((s) => s.kelas === kelasFilter);

  const headers = [
    'No',
    'ID Siswa',
    'NISN',
    'NIS',
    'Nama Siswa',
    'L/P',
    'Tempat Lahir',
    'Tanggal Lahir',
    'NIK',
    'Agama',
    'Kelas',
    'Fase',
    'Semester',
    'Tahun Pelajaran',
    'Nama Ayah',
    'Pekerjaan Ayah',
    'Nama Ibu',
    'Pekerjaan Ibu',
    'Nama Wali',
    'Pekerjaan Wali',
    'Alamat Wali',
    'Alamat',
    'Status'
  ];

  const rows = students.map((s, idx) => [
    idx + 1,
    s.idSiswa || '',
    s.nisn || '',
    s.nis || '',
    s.namaSiswa || '',
    s.jenisKelamin || 'L',
    s.tempatLahir || '',
    s.tanggalLahir || '',
    s.nik || '',
    s.agama || 'Kristen',
    s.kelas || '',
    s.fase || '',
    s.semester || '',
    s.tahunPelajaran || db.sekolah.tahunPelajaran || '',
    s.namaAyah || '',
    s.pekerjaanAyah || '',
    s.namaIbu || '',
    s.pekerjaanIbu || '',
    s.namaWali || '',
    s.pekerjaanWali || '',
    s.alamatWali || '',
    s.alamat || '',
    s.statusSiswa || 'Aktif',
  ]);

  return [headers, ...rows];
}

export function buildAcademicScoresSheetValues(
  db: DatabaseState,
  selectedKelas: ClassLevel,
  selectedSemester: SemesterType
): (string | number)[][] {
  const siswaKelas = db.siswa.filter((s) => s.kelas === selectedKelas);

  const headers = [
    'No',
    'NISN',
    'Nama Siswa',
    'Kelas',
    'Semester',
    'Mata Pelajaran',
    'KKM',
    'Formatif',
    'Nilai PTS',
    'Sumatif / PAS',
    'Jumlah Nilai',
    'Nilai Akhir',
    'Predikat',
    'Capaian Kompetensi',
    'Deskripsi Capaian Pembelajaran'
  ];

  const rows: (string | number)[][] = [];
  let counter = 1;

  siswaKelas.forEach((student) => {
    db.mataPelajaran.forEach((mapel) => {
      const sc = db.nilaiAkademik.find(
        (n) =>
          matchesStudentScore(n, student) &&
          n.mataPelajaran === mapel.mataPelajaran &&
          n.kelas === selectedKelas &&
          n.semester === selectedSemester
      );
      const kkm = sc?.kkm ?? mapel.kkm ?? 75;
      const formatif = sc?.formatif ?? '';
      const nilaiPts = sc?.pts ?? '';
      const sumatif = sc?.sumatif ?? '';
      const summary = sc
        ? calculateScoreSummaryFromFreeInputs(sc, SCORE_INPUT_FIELDS)
        : { jumlahNilai: 0, nilaiAkhir: 0, filledCount: 0 };
      const jumlahNilai = summary.filledCount > 0 ? summary.jumlahNilai : (sc?.jumlahNilai ?? 0);
      const nilaiAkhir = summary.filledCount > 0 ? summary.nilaiAkhir : (sc?.nilaiAkhir ?? 0);
      const hasScore = summary.filledCount > 0 || nilaiAkhir > 0;
      const predikat = hasScore ? (sc?.predikat || getPredikatFromScore(nilaiAkhir)) : '-';
      const capaian = hasScore ? (sc?.capaianKompetensi || getCapaianFromScore(nilaiAkhir)) : '-';
      const tpRes = hasScore
        ? generateReportDescriptionFromTP(
            mapel.mataPelajaran,
            selectedKelas,
            nilaiAkhir,
            db.tujuanPembelajaran,
            student.namaSiswa,
            student.agama
          )
        : { deskripsiRapor: '' };
      const deskripsi =
        sc?.deskripsiRapor && sc.deskripsiRapor.trim() !== ''
          ? sc.deskripsiRapor
          : tpRes.deskripsiRapor;

      rows.push([
        counter++,
        !isPlaceholderNisn(student.nisn) && !student.nisn.startsWith('BLM_') ? student.nisn : '-',
        student.namaSiswa,
        selectedKelas,
        selectedSemester,
        mapel.mataPelajaran,
        kkm,
        formatif,
        nilaiPts,
        sumatif,
        jumlahNilai,
        nilaiAkhir,
        predikat,
        capaian,
        deskripsi,
      ]);
    });
  });

  return [headers, ...rows];
}

export function buildReportSummarySheetValues(
  db: DatabaseState,
  selectedKelas: ClassLevel,
  selectedSemester: SemesterType
): (string | number)[][] {
  const siswaKelas = db.siswa.filter((s) => s.kelas === selectedKelas);

  const headers = [
    'No',
    'NISN',
    'Nama Siswa',
    'Kelas',
    'Semester',
    'Jumlah Nilai',
    'Rata-Rata Nilai',
    'Sakit',
    'Izin',
    'Alpa',
    'Catatan Wali Kelas',
    'Keputusan'
  ];

  const rows = siswaKelas.map((student, idx) => {
    const scores = db.nilaiAkademik
      .filter(
        (n) =>
          matchesStudentScore(n, student) &&
          n.kelas === selectedKelas &&
          n.semester === selectedSemester &&
          n.nilaiAkhir > 0
      )
      .map((n) => n.nilaiAkhir);

    const total = scores.reduce((a, b) => a + b, 0);
    const avg = scores.length > 0 ? Number((total / scores.length).toFixed(2)) : 0;

    const att = db.kehadiran.find(
      (h) => h.nisn === student.nisn && h.kelas === selectedKelas && h.semester === selectedSemester
    ) || { sakit: 0, izin: 0, alpa: 0 };

    const note =
      db.catatanWali.find(
        (c) => c.nisn === student.nisn && c.kelas === selectedKelas && c.semester === selectedSemester
      )?.catatanWaliKelas || '-';

    const dec = db.keputusanSiswa?.find(
      (k) => k.nisn === student.nisn && k.kelas === selectedKelas && k.semester === selectedSemester
    );

    const decisionText =
      dec?.statusKeputusan === 'Naik Kelas'
        ? dec.naikKelas || 'Naik Kelas'
        : dec?.statusKeputusan === 'Tinggal di Kelas'
        ? dec.tinggalKelas || 'Tinggal di Kelas'
        : '-';

    return [
      idx + 1,
      student.nisn || '-',
      student.namaSiswa,
      selectedKelas,
      selectedSemester,
      total,
      avg,
      att.sakit,
      att.izin,
      att.alpa,
      note,
      decisionText,
    ];
  });

  return [headers, ...rows];
}

export function buildFullDatabaseMultiSheets(
  db: DatabaseState,
  selectedKelas: ClassLevel,
  selectedSemester: SemesterType
): { title: string; values: (string | number)[][] }[] {
  const schoolSheet: (string | number)[][] = [
    ['Field', 'Nilai'],
    ['Nama Pemerintah', db.sekolah.namaPemerintah || ''],
    ['Nama Instansi', db.sekolah.namaInstansi || ''],
    ['Nama Sekolah', db.sekolah.namaSekolah || ''],
    ['NPSN', db.sekolah.npsn || ''],
    ['NSS', db.sekolah.nss || ''],
    ['Alamat', db.sekolah.alamat || ''],
    ['Distrik / Kecamatan', db.sekolah.distrikKecamatan || ''],
    ['Kabupaten', db.sekolah.kabupaten || ''],
    ['Provinsi', db.sekolah.provinsi || ''],
    ['Kepala Sekolah', db.sekolah.namaKepalaSekolah || ''],
    ['NIP Kepala Sekolah', db.sekolah.nipKepalaSekolah || ''],
    ['Tahun Pelajaran', db.sekolah.tahunPelajaran || ''],
    ['Tempat Rapor', db.sekolah.tempatRapor || ''],
    ['Tanggal Rapor', db.sekolah.tanggalRapor || ''],
  ];

  const guruSheet: (string | number)[][] = [
    ['No', 'NIP', 'Nama Guru', 'L/P', 'Jabatan', 'Mata Pelajaran', 'Kelas', 'Pendidikan', 'Status', 'No HP'],
    ...db.guru.map((g, idx) => [
      idx + 1,
      g.nip || '',
      g.namaGuru || '',
      g.jenisKelamin || 'L',
      g.jabatan || '',
      g.mataPelajaran || '',
      g.kelas || '',
      g.pendidikan || '',
      g.status || '',
      g.noHp || '',
    ]),
  ];

  const tpSheet: (string | number)[][] = [
    ['No', 'Kode TP', 'Mata Pelajaran', 'Kelas', 'Fase', 'Agama', 'Tujuan Pembelajaran'],
    ...db.tujuanPembelajaran.map((tp, idx) => [
      idx + 1,
      tp.kodeTp || '',
      tp.mataPelajaran || '',
      tp.kelas || '',
      tp.fase || '',
      tp.agama || 'Semua',
      tp.tujuanPembelajaran || '',
    ]),
  ];

  return [
    { title: 'Identitas Sekolah', values: schoolSheet },
    { title: 'Data Siswa', values: buildStudentsSheetValues(db, 'SEMUA') },
    { title: `Nilai Kelas ${selectedKelas}`, values: buildAcademicScoresSheetValues(db, selectedKelas, selectedSemester) },
    { title: `Rekap Kelas ${selectedKelas}`, values: buildReportSummarySheetValues(db, selectedKelas, selectedSemester) },
    { title: 'Data Guru', values: guruSheet },
    { title: 'Tujuan Pembelajaran', values: tpSheet },
  ];
}

// =========================================================================
// PARSERS: Import rows from Google Sheets back into E-Rapor Database
// =========================================================================

function findHeaderIdx(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const c of candidates) {
    const target = c.toLowerCase().replace(/[^a-z0-9]/g, '');
    const exact = normalized.findIndex((h) => h === target);
    if (exact >= 0) return exact;
  }
  for (const c of candidates) {
    const target = c.toLowerCase().replace(/[^a-z0-9]/g, '');
    const partial = normalized.findIndex((h) => h.includes(target));
    if (partial >= 0) return partial;
  }
  return -1;
}

function deriveFase(kelas: string): FaseType {
  if (kelas === 'I' || kelas === 'II') return 'A';
  if (kelas === 'III' || kelas === 'IV') return 'B';
  if (kelas === 'V' || kelas === 'VI') return 'C';
  if (kelas === 'VII' || kelas === 'VIII' || kelas === 'IX') return 'D';
  if (kelas === 'X') return 'E';
  return 'F';
}

export function parseSheetRowsToStudents(
  headers: string[],
  rows: string[][],
  defaultKelas: ClassLevel,
  defaultSemester: SemesterType,
  defaultTahun: string
): Student[] {
  const idxNama = findHeaderIdx(headers, ['namasiswa', 'namalengkap', 'namapesertadidik', 'nama']);
  const idxNisn = findHeaderIdx(headers, ['nisn']);
  const idxNis = findHeaderIdx(headers, ['nis']);
  const idxLp = findHeaderIdx(headers, ['lp', 'jeniskelamin', 'jk', 'kelamin']);
  const idxTempat = findHeaderIdx(headers, ['tempatlahir', 'tmplahir']);
  const idxTgl = findHeaderIdx(headers, ['tanggallahir', 'tgllahir']);
  const idxNik = findHeaderIdx(headers, ['nik']);
  const idxAgama = findHeaderIdx(headers, ['agama']);
  const idxKelas = findHeaderIdx(headers, ['kelas', 'kls']);
  const idxAyah = findHeaderIdx(headers, ['namaayah', 'ayah']);
  const idxPekerjaanAyah = findHeaderIdx(headers, ['pekerjaanayah']);
  const idxIbu = findHeaderIdx(headers, ['namaibu', 'ibu']);
  const idxPekerjaanIbu = findHeaderIdx(headers, ['pekerjaanibu']);
  const idxWali = findHeaderIdx(headers, ['namawali', 'wali', 'walipesertadidik']);
  const idxPekerjaanWali = findHeaderIdx(headers, ['pekerjaanwali']);
  const idxAlamatWali = findHeaderIdx(headers, ['alamatwali']);
  const idxAlamat = findHeaderIdx(headers, ['alamat', 'alamatsiswa']);
  const idxStatus = findHeaderIdx(headers, ['status', 'statussiswa']);

  const parsed: Student[] = [];
  rows.forEach((row, i) => {
    const nama = (idxNama >= 0 ? row[idxNama] : row[1] || row[0] || '').trim();
    if (!nama || nama.toLowerCase().includes('nama siswa')) return;

    const rawNisn = idxNisn >= 0 ? (row[idxNisn] || '').trim() : '';
    const nisn = !isPlaceholderNisn(rawNisn) ? rawNisn : `BLM_GS_${Date.now().toString().slice(-4)}_${i + 1}`;
    const rawLp = idxLp >= 0 ? (row[idxLp] || 'L').trim().toUpperCase() : 'L';
    const jenisKelamin: 'L' | 'P' = rawLp.startsWith('P') ? 'P' : 'L';
    const rawKelas = (idxKelas >= 0 ? (row[idxKelas] || '').trim() : '') as ClassLevel;
    const kelas = rawKelas || defaultKelas;
    const rawStatus = idxStatus >= 0 ? (row[idxStatus] || 'Aktif').trim() : 'Aktif';
    const statusSiswa: Student['statusSiswa'] =
      rawStatus.toLowerCase().includes('lulus')
        ? 'Lulus'
        : rawStatus.toLowerCase().includes('mutasi')
        ? 'Mutasi'
        : 'Aktif';

    parsed.push({
      idSiswa: `GS_S_${nisn}_${i}`,
      nisn,
      nis: idxNis >= 0 ? (row[idxNis] || '-').trim() : '-',
      namaSiswa: nama,
      jenisKelamin,
      tempatLahir: idxTempat >= 0 ? (row[idxTempat] || '').trim() : '',
      tanggalLahir: idxTgl >= 0 ? (row[idxTgl] || '').trim() : '',
      nik: idxNik >= 0 ? (row[idxNik] || '').trim() : '',
      agama: idxAgama >= 0 && row[idxAgama] ? row[idxAgama].trim() : 'Kristen',
      kelas,
      fase: deriveFase(kelas),
      semester: defaultSemester,
      tahunPelajaran: defaultTahun,
      namaAyah: idxAyah >= 0 ? (row[idxAyah] || '').trim() : '',
      pekerjaanAyah: idxPekerjaanAyah >= 0 ? (row[idxPekerjaanAyah] || '').trim() : '',
      namaIbu: idxIbu >= 0 ? (row[idxIbu] || '').trim() : '',
      pekerjaanIbu: idxPekerjaanIbu >= 0 ? (row[idxPekerjaanIbu] || '').trim() : '',
      namaWali: idxWali >= 0 ? (row[idxWali] || '').trim() : '',
      pekerjaanWali: idxPekerjaanWali >= 0 ? (row[idxPekerjaanWali] || '').trim() : '',
      alamatWali: idxAlamatWali >= 0 ? (row[idxAlamatWali] || '').trim() : '',
      alamat: idxAlamat >= 0 ? (row[idxAlamat] || '').trim() : '',
      statusSiswa,
    });
  });

  return parsed;
}

export function parseSheetRowsToScores(
  headers: string[],
  rows: string[][],
  students: Student[],
  subjects: Subject[],
  tujuanPembelajaran: LearningObjective[],
  defaultKelas: ClassLevel,
  defaultSemester: SemesterType,
  defaultTahun: string
): AcademicScore[] {
  const idxNisn = findHeaderIdx(headers, ['nisn']);
  const idxNama = findHeaderIdx(headers, ['namasiswa', 'nama']);
  const idxMapel = findHeaderIdx(headers, ['matapelajaran', 'mapel']);
  const idxKelas = findHeaderIdx(headers, ['kelas']);
  const idxSemester = findHeaderIdx(headers, ['semester']);
  const idxKkm = findHeaderIdx(headers, ['kkm']);
  const idxFormatif = findHeaderIdx(headers, ['formatif', 'nilaiformatif']);
  const idxPts = findHeaderIdx(headers, ['nilaipts', 'pts']);
  const idxSumatif = findHeaderIdx(headers, ['sumatifpas', 'sumatif', 'nilaisumatif', 'pas']);
  const idxAkhir = findHeaderIdx(headers, ['nilaiakhir', 'na']);
  const idxDeskripsi = findHeaderIdx(headers, ['deskripsicapaianpembelajaran', 'deskripsirapor', 'deskripsi']);

  const parsed: AcademicScore[] = [];

  rows.forEach((row, i) => {
    const nama = idxNama >= 0 ? (row[idxNama] || '').trim() : '';
    const rawNisn = idxNisn >= 0 ? (row[idxNisn] || '').trim() : '';
    const mapelName = idxMapel >= 0 ? (row[idxMapel] || '').trim() : '';
    if ((!nama && !rawNisn) || !mapelName) return;

    const matchedStudent =
      students.find((s) => !isPlaceholderNisn(rawNisn) && s.nisn === rawNisn) ||
      students.find((s) => nama && s.namaSiswa.toLowerCase() === nama.toLowerCase());

    const nisn = matchedStudent?.nisn || (!isPlaceholderNisn(rawNisn) ? rawNisn : `BLM_GS_${i + 1}`);
    const namaSiswa = matchedStudent?.namaSiswa || nama;
    const kelas = ((idxKelas >= 0 ? row[idxKelas] : '')?.trim() as ClassLevel) || matchedStudent?.kelas || defaultKelas;
    const semester = ((idxSemester >= 0 ? row[idxSemester] : '')?.trim() as SemesterType) || defaultSemester;

    const matchedMapel = subjects.find(
      (m) => m.mataPelajaran.toLowerCase() === mapelName.toLowerCase()
    );
    const kkm = idxKkm >= 0 && Number(row[idxKkm]) > 0 ? Number(row[idxKkm]) : matchedMapel?.kkm ?? 75;

    const parseOptNum = (idx: number): number | undefined => {
      if (idx < 0) return undefined;
      const cell = (row[idx] ?? '').trim();
      if (!cell || cell === '-' || cell === '_') return undefined;
      const num = Number(cell.replace(',', '.'));
      return isNaN(num) ? undefined : clampScore(num);
    };

    const formatif = parseOptNum(idxFormatif);
    const pts = parseOptNum(idxPts);
    const sumatif = parseOptNum(idxSumatif);
    const explicitAkhir = parseOptNum(idxAkhir);

    const summary = calculateScoreSummaryFromFreeInputs({ formatif, sumatif, pts }, SCORE_INPUT_FIELDS);
    const nilaiAkhir = explicitAkhir !== undefined ? explicitAkhir : summary.nilaiAkhir;
    const hasScore = summary.filledCount > 0 || nilaiAkhir > 0;

    const tpRes = hasScore
      ? generateReportDescriptionFromTP(
          matchedMapel?.mataPelajaran || mapelName,
          kelas,
          nilaiAkhir,
          tujuanPembelajaran,
          namaSiswa,
          matchedStudent?.agama
        )
      : { deskripsiTercapai: '', deskripsiPerluPeningkatan: '', deskripsiRapor: '' };

    const deskripsiCustom = idxDeskripsi >= 0 ? (row[idxDeskripsi] || '').trim() : '';

    parsed.push({
      idNilai: `GS_N_${matchedStudent?.idSiswa || nisn}_${(matchedMapel?.mataPelajaran || mapelName).slice(0, 8)}_${i}`,
      idSiswa: matchedStudent?.idSiswa,
      tahunPelajaran: defaultTahun,
      semester,
      kelas,
      nisn,
      namaSiswa,
      mataPelajaran: matchedMapel?.mataPelajaran || mapelName,
      kkm,
      formatif,
      sumatif,
      pts,
      jumlahNilai: summary.jumlahNilai,
      nilaiAkhir,
      predikat: getPredikatFromScore(nilaiAkhir),
      capaianKompetensi: getCapaianFromScore(nilaiAkhir),
      deskripsiTercapai: tpRes.deskripsiTercapai,
      deskripsiPerluPeningkatan: tpRes.deskripsiPerluPeningkatan,
      deskripsiRapor: deskripsiCustom || tpRes.deskripsiRapor,
    });
  });

  return parsed;
}
