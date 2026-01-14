import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const search = searchParams.get('search') || '';
      const type = searchParams.get('type') || '';
      const status = searchParams.get('status') || '';
      const sortField = searchParams.get('sortField') || 'createdAt';
      const sortOrder = searchParams.get('sortOrder') || 'desc';
      
      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: any = { 
        userId: authenticatedReq.user!.userId 
      };
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      if (type) {
        where.type = type;
      }
      
      if (status === 'unread') {
        where.isRead = false;
      } else if (status === 'read') {
        where.isRead = true;
      } else if (status === 'archived') {
        where.isArchived = true;
      }
      
      // Build orderBy clause
      let orderBy: any = { [sortField]: sortOrder === 'desc' ? 'desc' : 'asc' };
      
      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profileImage: true,
              },
            },
          },
        }),
        prisma.notification.count({ where }),
      ]);
      
      return NextResponse.json({
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }
  });
}

// POST /api/notifications - Create new notification
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const {
        userId,
        title,
        message,
        type,
        relatedId,
        relatedType,
        metadata,
      } = await request.json();

      if (!userId || !title || !message || !type) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          relatedId,
          relatedType,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
      });

      return NextResponse.json(notification, { status: 201 });
    } catch (error) {
      console.error('Create notification error:', error);
      return NextResponse.json(
        { error: 'Failed to create notification' },
        { status: 500 }
      );
    }
  });
}

// PUT /api/notifications - Mark notification as read
export async function PUT(request: NextRequest) {
  try {
    const { notificationId, isRead } = await request.json();
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: isRead !== undefined ? isRead : true },
    });
    return NextResponse.json(notification);
  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
} 