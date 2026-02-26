/**
 * FCM (Firebase Cloud Messaging) for mobile push notifications.
 * Env (any one of):
 *   - FIREBASE_SERVICE_ACCOUNT_JSON (full JSON string or base64)
 *   - GOOGLE_APPLICATION_CREDENTIALS (path to JSON file)
 *   - Or individual: FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *
 * Debugging "no FCM received":
 * 1. Local check (dev only): GET http://localhost:3000/api/debug/fcm?userId=RECIPIENT_USER_ID – shows init status, env, and token count. POST with body { "userId": "..." } sends a test notification.
 * 2. Backend logs: grep for [FCM] and [Chat]. Look for "Initialization failed", "No device tokens for userId", "Send to user failed".
 * 3. DB: Check FCM tokens for the recipient (fcm_tokens table, userId = recipient). If empty, recipient must open the app (dev build or APK, not Expo Go) and be logged in.
 * 4. App: Push works only in dev build or APK; Expo Go does not support FCM. After login the app registers token; backend logs "[FCM] Token registered for userId".
 */
import * as admin from 'firebase-admin';
import { prisma } from './prisma';

let fcmInitialized = false;

function initFcm(): boolean {
  if (fcmInitialized) return true;
  try {
    if (admin.apps.length > 0) {
      fcmInitialized = true;
      return true;
    }
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (serviceAccountJson) {
      const parsed = typeof serviceAccountJson === 'string' && serviceAccountJson.startsWith('{')
        ? JSON.parse(serviceAccountJson)
        : JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString('utf-8'));
      admin.initializeApp({ credential: admin.credential.cert(parsed) });
    } else if (credentialsPath) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else if (projectId && clientEmail && privateKey) {
      // Support separate env vars (e.g. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
      const privateKeyUnescaped = privateKey.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKeyUnescaped,
        }),
      });
    } else {
      console.warn('[FCM] Initialization skipped: no credentials (set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)');
      return false;
    }
    fcmInitialized = true;
    console.info('[FCM] Initialized successfully');
    return true;
  } catch (e) {
    console.warn('[FCM] Initialization failed:', (e as Error).message);
    return false;
  }
}

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Get FCM status for local/debug use. Safe to call anytime.
 * Returns whether FCM can initialize and which env vars are set (no secrets).
 */
export async function getFcmStatus(userId?: string): Promise<{
  ok: boolean;
  initialized: boolean;
  env: { hasProjectId: boolean; hasClientEmail: boolean; hasPrivateKey: boolean; hasServiceAccountJson: boolean };
  tokenCount?: number;
  message?: string;
}> {
  const env = {
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    hasServiceAccountJson: !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  };
  const canInit = env.hasServiceAccountJson || (env.hasProjectId && env.hasClientEmail && env.hasPrivateKey);
  const initialized = initFcm();

  let tokenCount: number | undefined;
  if (userId) {
    const count = await prisma.fcmToken.count({ where: { userId } });
    tokenCount = count;
  }

  let message: string | undefined;
  if (!canInit) message = 'Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in .env';
  else if (!initialized) message = 'FCM init failed (check server logs for [FCM])';
  else if (userId !== undefined && tokenCount === 0) message = 'No device token for this user – open the app (dev build/APK, not Expo Go) and log in';

  return {
    ok: initialized && (userId === undefined || (tokenCount !== undefined && tokenCount > 0)),
    initialized,
    env,
    tokenCount,
    message,
  };
}

/**
 * Send FCM notification to all devices registered for a user.
 * Used for all notification types (announcements, job updates, application status, etc.)
 * so mobile app users receive push notifications.
 */
export async function sendFcmToUser(userId: string, payload: FcmPayload): Promise<void> {
  if (!initFcm()) {
    console.warn('[FCM] Send skipped: FCM not initialized');
    return;
  }
  try {
    const tokens = await prisma.fcmToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) {
      console.warn('[FCM] No device tokens for userId:', userId, '- user must open the app (dev build/APK) and be logged in to register push token');
      return;
    }
    console.info('[FCM] Sending to userId:', userId, 'tokens:', tokens.length, 'title:', payload.title);
    const messaging = admin.messaging();
    const message: admin.messaging.MulticastMessage = {
      tokens: tokens.map((t) => t.token),
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data
        ? Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)]))
        : undefined,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          priority: 'high' as const,
          visibility: 'public' as const, // Show in status bar when app in background
        },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
        fcmOptions: {},
      },
    };
    const result = await messaging.sendEachForMulticast(message);
    console.info('[FCM] Send result userId:', userId, 'successCount:', result.successCount, 'failureCount:', result.failureCount);
    if (result.failureCount > 0) {
      const invalid: string[] = [];
      result.responses.forEach((resp, i) => {
        if (!resp.success && resp.error) {
          console.warn('[FCM] Token failed:', resp.error.code, resp.error.message);
          if (resp.error.code === 'messaging/invalid-registration-token' || resp.error.code === 'messaging/registration-token-not-registered') {
            invalid.push(tokens[i].token);
          }
        }
      });
      if (invalid.length > 0) {
        await prisma.fcmToken.deleteMany({
          where: { userId, token: { in: invalid } },
        });
        console.info('[FCM] Removed', invalid.length, 'invalid token(s) for userId:', userId);
      }
    }
  } catch (error) {
    console.error('[FCM] Send to user failed. userId:', userId, 'error:', (error as Error).message);
  }
}

/**
 * Send FCM to multiple users (e.g. all users for announcements).
 */
export async function sendFcmToUsers(
  userIds: string[],
  payload: FcmPayload
): Promise<void> {
  if (!initFcm() || userIds.length === 0) return;
  await Promise.all(userIds.map((id) => sendFcmToUser(id, payload)));
}
