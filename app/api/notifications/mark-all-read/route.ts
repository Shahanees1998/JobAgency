import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { NotificationService } from '@/lib/notificationService';

// PUT /api/notifications/mark-all-read - Mark all notifications as read
export async function PUT(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const result = await NotificationService.markAllAsRead(authenticatedReq.user!.userId);
      
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        count: result.count,
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      return NextResponse.json(
        { error: 'Failed to mark all notifications as read' },
        { status: 500 }
      );
    }
  });
} 