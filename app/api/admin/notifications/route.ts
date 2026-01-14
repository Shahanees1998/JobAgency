import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      console.log('User ID:', authenticatedReq.user?.userId, 'Role:', authenticatedReq.user?.role);
      
      const notifications = await prisma.notification.findMany({
        where: {
          userId: authenticatedReq.user?.userId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      
      console.log('Found notifications:', notifications.length);

      // Transform the data to match the expected interface
      const transformedNotifications = notifications.map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        isArchived: notification.isArchived,
        userId: notification.userId,
        userName: `${notification.user.firstName} ${notification.user.lastName}`,
        userEmail: notification.user.email,
        relatedId: notification.relatedId,
        relatedType: notification.relatedType,
        createdAt: notification.createdAt.toISOString(),
      }));

      return NextResponse.json({ data: transformedNotifications });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }
  });
}