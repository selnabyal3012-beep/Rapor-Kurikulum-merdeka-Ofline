import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  setLogLevel,
  enableNetwork,
  type Firestore,
  type FirestoreSettings,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress internal SDK offline/timeout console.error noise for offline-first PWA usage
setLogLevel('silent');

// Initialize Firebase App safely (avoids duplicate app errors during reloads)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with long-polling XMLHttpRequest transport.
// Disables Fetch readable streams WebChannel transport which triggers unhandled
// AbortError ("signal is aborted without reason") behind reverse proxies/iframes.
function initDb(): Firestore {
  const settings = {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
  } as FirestoreSettings;

  const databaseId =
    (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId ||
    'ai-studio-aplikasiraporkur-99a0b9d8-9f28-4109-87d6-9216fc2f3e90';

  try {
    return initializeFirestore(app, settings, databaseId);
  } catch {
    return getFirestore(app, databaseId);
  }
}

export const db = initDb();

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
] as const;

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => {
  googleProvider.addScope(scope);
});
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory OAuth access token cache ONLY (never stored in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearAccessToken(): void {
  cachedAccessToken = null;
}

export function initWorkspaceAuth(
  onAuthSuccess?: (user: import('firebase/auth').User, token: string) => void,
  onAuthFailure?: (user: import('firebase/auth').User | null) => void
) {
  return auth.onAuthStateChanged((user) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.(user);
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.(null);
    }
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function ensureFirestoreNetwork(): Promise<void> {
  try {
    await enableNetwork(db);
  } catch {
    // Ignore if already enabled or offline
  }
}

// Validation connection helper
export async function testFirestoreConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Firestore connection check timeout')), 8000);
      }),
    ]);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.name === 'AbortError' ||
        error.message.includes('the client is offline') ||
        error.message.includes('timeout')
      ) {
        console.warn('Firestore operating in offline/local fallback mode:', error.message);
      } else {
        console.warn('Firestore connection check note:', error.message);
      }
    }
    return false;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

function isPopupCancelError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}

function normalizePopupAuthError(err: unknown): Error {
  const code = (err as { code?: string })?.code;
  if (code === 'auth/popup-blocked') {
    return new Error('Jendela login Google diblokir oleh browser. Silakan izinkan popup untuk situs ini lalu coba lagi.');
  }
  if (err instanceof Error) return err;
  return new Error('Gagal masuk dengan akun Google.');
}

// Google Sign-In Helper (also caches Google Workspace OAuth access token in memory)
export async function signInWithGoogle() {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return result.user;
  } catch (err) {
    if (isPopupCancelError(err)) {
      return null;
    }
    console.warn('Google Sign-In note:', err);
    throw normalizePopupAuthError(err);
  } finally {
    isSigningIn = false;
  }
}

export async function googleSignInWithWorkspace() {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Token akses Google Sheets & Drive tidak diterima. Silakan coba masuk kembali dan setujui izin akses.');
    }
    cachedAccessToken = credential.accessToken;
    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } catch (err) {
    if (isPopupCancelError(err)) {
      return null;
    }
    console.warn('Google Workspace Sign-In note:', err);
    throw normalizePopupAuthError(err);
  } finally {
    isSigningIn = false;
  }
}

// Sign-Out Helper
export async function signOutFirebase() {
  try {
    cachedAccessToken = null;
    await fbSignOut(auth);
  } catch (err) {
    console.error('Firebase Sign-Out Error:', err);
    throw err;
  }
}

