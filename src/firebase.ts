import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

// Built-in fallback config so external deployments (e.g. Vercel / GitHub export)
// work seamlessly on all mobile phones, public phones, and desktop browsers.
export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'inbound-approach-r6ppv',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:234533909903:web:b00112650cbe13421907fa',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCu3zzr2C05rA4MNj2Y54NzH6yC6Fqmmjc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'inbound-approach-r6ppv.firebaseapp.com',
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    'ai-studio-fleetledgervehic-91ad5514-dc8e-4625-89a2-d94329b7ee1b',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'inbound-approach-r6ppv.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '234533909903',
};

// Initialize the online Firebase applet
export const app = initializeApp(firebaseConfig);

// CRITICAL: Use experimentalAutoDetectLongPolling so mobile carrier networks (4G/5G),
// public Wi-Fi proxies, and in-app mobile browsers never hang on WebChannel streams.
function createMobileSafeFirestore() {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createMobileSafeFirestore();

// Firebase Authentication
export const auth = getAuth(app);

// Error handler helper matching Firebase integration skill
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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
