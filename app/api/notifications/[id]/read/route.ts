import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { NotificationService } from '@/lib/notificationService';

// PUT /api/notifications/[id]/read - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const notification = await NotificationService.markAsRead(params.id, authenticatedReq.user!.userId);
      
      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
        notification,
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      return NextResponse.json(
        { error: 'Failed to mark notification as read' },
        { status: 500 }
      );
    }
  });
} 