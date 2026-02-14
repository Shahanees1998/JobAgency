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

      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');
      const typeParam = searchParams.get('type');
      const statusParam = searchParams.get('status'); // "true" = read, "false" = unread
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

      const where: any = { userId: authenticatedReq.user?.userId };
      if (typeParam && typeParam.trim() !== '') where.type = typeParam;
      if (statusParam === 'true') where.isRead = true;
      else if (statusParam === 'false') where.isRead = false;
      if (search && search.trim() !== '') {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
        where,
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
        skip,
        take: limit,
      }),
        prisma.notification.count({ where }),
      ]);

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

      return NextResponse.json({
        data: transformedNotifications,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }
  });
}