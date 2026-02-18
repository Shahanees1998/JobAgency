import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/users/fcm-token
 * Register or update FCM device token for the authenticated user (mobile app).
 * Body: { token: string, platform?: "ios" | "android" }
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      const platform = body.platform === 'ios' || body.platform === 'android' ? body.platform : undefined;

      if (!token) {
        return NextResponse.json(
          { error: 'FCM token is required' },
          { status: 400 }
        );
      }

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

      return NextResponse.json({ success: true, message: 'FCM token registered' });
    } catch (error) {
      console.error('Error registering FCM token:', error);
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
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json().catch(() => ({}));
      const token = typeof body.token === 'string' ? body.token.trim() : '';

      if (!token) {
        return NextResponse.json(
          { error: 'FCM token is required' },
          { status: 400 }
        );
      }

      await prisma.fcmToken.deleteMany({
        where: { userId, token },
      });

      return NextResponse.json({ success: true, message: 'FCM token removed' });
    } catch (error) {
      console.error('Error removing FCM token:', error);
      return NextResponse.json(
        { error: 'Failed to remove FCM token' },
        { status: 500 }
      );
    }
  });
}
