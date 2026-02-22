import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/config
 * Public config for clients (e.g. mobile app) - Pusher key and cluster for real-time chat.
 * No auth required. Returns only public/safe values.
 */
export async function GET() {
  try {
    let pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || '';
    let pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1';

    const settings = await prisma.systemSettings.findFirst({
      select: { pusherKey: true },
    });
    if (settings?.pusherKey) {
      pusherKey = settings.pusherKey;
    }

    return NextResponse.json({
      success: true,
      data: {
        pusherKey: pusherKey || null,
        pusherCluster,
      },
    });
  } catch (error) {
    console.error('[GET /api/config]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load config' },
      { status: 500 }
    );
  }
}
