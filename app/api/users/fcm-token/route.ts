import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/** Truncate token for safe logging (first 12 + ... + last 8). */
function tokenPreview(token: string): string {
  if (token.length <= 24) return `${token.length} chars`;
  return `${token.slice(0, 12)}...${token.slice(-8)}`;
}

/**
 * POST /api/users/fcm-token
 * Register or update FCM device token for the authenticated user (mobile app).
 * Body: { token: string, platform?: "ios" | "android" }
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      console.log('[FCM device token] Request received from mobile app.');
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        console.warn('[FCM device token] Not saved: no userId (unauthorized).');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      let body: { token?: string; platform?: string };
      try {
        body = await request.json();
      } catch {
        console.warn('[FCM device token] Not saved: invalid JSON body.');
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      const platform = body.platform === 'ios' || body.platform === 'android' ? body.platform : undefined;

      if (!token) {
        console.warn('[FCM device token] Not received from mobile app: missing or empty token. userId:', userId);
        return NextResponse.json(
          { error: 'FCM token is required' },
          { status: 400 }
        );
      }
      console.log('[FCM device token] Received from mobile app:', tokenPreview(token), 'platform:', platform ?? 'unknown');

      console.log('[FCM device token] Saving to database...');
      await prisma.fcmToken.upsert({
        where: {
          userId_token: { userId, token },
        },
        create: {
          userId,
          token,
          platform,
        },
        update: {
          platform: platform ?? undefined,
          updatedAt: new Date(),
        },
      });

      console.log('[FCM device token] Saved successfully. userId:', userId, 'platform:', platform ?? 'unknown');
      return NextResponse.json({ success: true, message: 'FCM token registered' });
    } catch (error) {
      console.error('[FCM device token] Not saved: error:', error instanceof Error ? error.message : error);
      return NextResponse.json(
        { error: 'Failed to register FCM token' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/users/fcm-token
 * Unregister FCM token (e.g. on logout).
 * Body: { token: string }
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      console.log('[FCM device token] Unregister request received from mobile app.');
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        console.warn('[FCM device token] Unregister: no userId (unauthorized).');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json().catch(() => ({}));
      const token = typeof body.token === 'string' ? body.token.trim() : '';

      if (!token) {
        console.warn('[FCM device token] Unregister: missing or empty token.');
        return NextResponse.json(
          { error: 'FCM token is required' },
          { status: 400 }
        );
      }

      await prisma.fcmToken.deleteMany({
        where: { userId, token },
      });
      console.log('[FCM device token] Removed successfully. userId:', userId, 'token:', tokenPreview(token));

      return NextResponse.json({ success: true, message: 'FCM token removed' });
    } catch (error) {
      console.error('[FCM device token] Unregister failed:', error instanceof Error ? error.message : error);
      return NextResponse.json(
        { error: 'Failed to remove FCM token' },
        { status: 500 }
      );
    }
  });
}
