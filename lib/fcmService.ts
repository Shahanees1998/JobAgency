/**
 * FCM (Firebase Cloud Messaging) for mobile push notifications.
 * Env: FIREBASE_SERVICE_ACCOUNT_JSON (JSON string or base64) or GOOGLE_APPLICATION_CREDENTIALS (path to JSON).
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
    if (serviceAccountJson) {
      const parsed = typeof serviceAccountJson === 'string' && serviceAccountJson.startsWith('{')
        ? JSON.parse(serviceAccountJson)
        : JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString('utf-8'));
      admin.initializeApp({ credential: admin.credential.cert(parsed) });
    } else if (credentialsPath) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else {
      return false;
    }
    fcmInitialized = true;
    return true;
  } catch (e) {
    console.warn('[FCM] Initialization skipped:', (e as Error).message);
    return false;
  }
}

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send FCM notification to all devices registered for a user.
 * Used for all notification types (announcements, job updates, application status, etc.)
 * so mobile app users receive push notifications.
 */
export async function sendFcmToUser(userId: string, payload: FcmPayload): Promise<void> {
  if (!initFcm()) return;
  try {
    const tokens = await prisma.fcmToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) return;
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
        notification: { channelId: 'default', priority: 'high' as const },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
        fcmOptions: {},
      },
    };
    const result = await messaging.sendEachForMulticast(message);
    if (result.failureCount > 0) {
      const invalid: string[] = [];
      result.responses.forEach((resp, i) => {
        if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
          invalid.push(tokens[i].token);
        }
      });
      if (invalid.length > 0) {
        await prisma.fcmToken.deleteMany({
          where: { userId, token: { in: invalid } },
        });
      }
    }
  } catch (error) {
    console.error('[FCM] Send to user failed:', userId, (error as Error).message);
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
