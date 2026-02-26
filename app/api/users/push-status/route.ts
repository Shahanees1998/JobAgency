import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { getFcmStatus } from '@/lib/fcmService';

/**
 * GET /api/users/push-status
 * Returns push notification readiness for the authenticated user (mobile app).
 * Response: { ok, fcmConfigured, tokenCount, message }
 * - ok: true if backend can send push and user has at least one device token
 * - fcmConfigured: true if Firebase credentials are set and FCM is initialized
 * - tokenCount: number of FCM tokens registered for this user
 * - message: short human-readable status (e.g. "Ready" or "No device registered")
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const status = await getFcmStatus(userId);

      const fcmConfigured = status.initialized;
      const tokenCount = status.tokenCount ?? 0;
      const ok = status.ok;

      let message: string;
      if (!fcmConfigured) {
        message = 'Backend push not configured';
      } else if (tokenCount === 0) {
        message = 'No device registered (open app and log in)';
      } else {
        message = 'Ready';
      }

      return NextResponse.json({
        ok,
        fcmConfigured,
        tokenCount,
        message,
      });
    } catch (error) {
      console.error('[Push status]', error);
      return NextResponse.json(
        { ok: false, fcmConfigured: false, tokenCount: 0, message: 'Error checking status' },
        { status: 500 }
      );
    }
  });
}
