import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { DatabaseState } from '../types';

const SCHOOL_DOC_ID = 'sdn_balil_current';

export interface CloudSyncResult {
  success: boolean;
  message: string;
  timestamp?: string;
}

async function syncStateToCloudSql(state: DatabaseState): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch('/api/rapor/state', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        npsn: state.sekolah?.npsn || '69970290',
        namaSekolah: state.sekolah?.namaSekolah || 'SD NEGERI BALIL',
        tahunPelajaran: state.sekolah?.tahunPelajaran || '2026/2027',
        payloadJson: JSON.stringify(state),
      }),
    });
  } catch {
    // Silent fallback for offline-first mode
  }
}

async function loadStateFromCloudSql(): Promise<DatabaseState | null> {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdToken();
    const res = await fetch('/api/rapor/state', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const row = await res.json();
    if (row?.payloadJson && typeof row.payloadJson === 'string') {
      return JSON.parse(row.payloadJson) as DatabaseState;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save current DatabaseState to Firebase Firestore & Cloud SQL
 */
export async function saveStateToFirestore(state: DatabaseState, userEmail?: string): Promise<CloudSyncResult> {
  const path = `schools/${SCHOOL_DOC_ID}/state/current`;
  try {
    const docRef = doc(db, 'schools', SCHOOL_DOC_ID, 'state', 'current');
    const nowIso = new Date().toISOString();

    await setDoc(docRef, {
      id: 'current',
      schoolId: state.sekolah?.npsn || '60301140',
      namaSekolah: state.sekolah?.namaSekolah || 'SD NEGERI BALIL',
      tahunPelajaran: state.sekolah?.tahunPelajaran || '2026/2027',
      updatedAt: nowIso,
      updatedBy: userEmail || 'Guru / Operator Balil',
      payloadJson: JSON.stringify(state),
      serverTime: serverTimestamp()
    });

    const backupId = `backup_${nowIso.replace(/[:.]/g, '-')}`;
    const backupRef = doc(db, 'schools', SCHOOL_DOC_ID, 'backups', backupId);
    await setDoc(backupRef, {
      id: backupId,
      schoolId: state.sekolah?.npsn || '60301140',
      updatedAt: nowIso,
      updatedBy: userEmail || 'Guru / Operator Balil',
      payloadJson: JSON.stringify(state),
      serverTime: serverTimestamp()
    });

    void syncStateToCloudSql(state);

    return {
      success: true,
      message: 'Data berhasil disinkronkan ke Cloud!',
      timestamp: nowIso
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Load DatabaseState from Cloud SQL or Firebase Firestore
 */
export async function loadStateFromFirestore(): Promise<{ success: boolean; data?: DatabaseState; message: string }> {
  const path = `schools/${SCHOOL_DOC_ID}/state/current`;
  try {
    const sqlData = await loadStateFromCloudSql();
    if (sqlData) {
      return {
        success: true,
        data: sqlData,
        message: 'Data berhasil dimuat dari Cloud!'
      };
    }

    const docRef = doc(db, 'schools', SCHOOL_DOC_ID, 'state', 'current');
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        message: 'Belum ada data di cloud untuk sekolah ini.'
      };
    }

    const docData = snapshot.data();
    if (!docData?.payloadJson) {
      return {
        success: false,
        message: 'Format data di cloud tidak valid.'
      };
    }

    const parsedState: DatabaseState = JSON.parse(docData.payloadJson);
    return {
      success: true,
      data: parsedState,
      message: `Data berhasil dimuat dari Cloud! (Terakhir diperbarui: ${docData.updatedAt || '-'})`
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * List backups from Firestore
 */
export async function listCloudBackups(): Promise<Array<{ id: string; updatedAt: string; updatedBy: string }>> {
  const path = `schools/${SCHOOL_DOC_ID}/backups`;
  try {
    const colRef = collection(db, 'schools', SCHOOL_DOC_ID, 'backups');
    const snapshot = await getDocs(colRef);
    const backups: Array<{ id: string; updatedAt: string; updatedBy: string }> = [];

    snapshot.forEach((d) => {
      const data = d.data();
      backups.push({
        id: d.id,
        updatedAt: data.updatedAt || '-',
        updatedBy: data.updatedBy || '-'
      });
    });

    return backups.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
