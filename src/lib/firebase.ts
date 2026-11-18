import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, isSupported as isMessagingSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';
import { FirestoreErrorInfo, OperationType } from '../types/medimitra';

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Ignore persistence errors in restricted private browsing modes
});
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function testConnection(): Promise<{ ok: boolean; offlineError?: boolean }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { ok: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. Firestore reported client is offline.');
      return { ok: false, offlineError: true };
    }
    // Permission denied on default-deny test doc confirms server reachability
    return { ok: true };
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
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

export async function requestFCMToken(): Promise<{
  token: string | null;
  requiresVapidConfig: boolean;
  error?: string;
}> {
  try {
    const supported = await isMessagingSupported();
    if (!supported) {
      return { token: null, requiresVapidConfig: false, error: 'FCM is not supported in this browser.' };
    }
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      return {
        token: null,
        requiresVapidConfig: true,
        error: 'Set VITE_FIREBASE_VAPID_KEY in environment variables to enable live FCM push tokens.',
      };
    }
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    return { token: token || null, requiresVapidConfig: false };
  } catch (error: unknown) {
    return {
      token: null,
      requiresVapidConfig: false,
      error: error instanceof Error ? error.message : 'Unable to obtain FCM token.',
    };
  }
}
