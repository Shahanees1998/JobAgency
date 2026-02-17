import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/notificationService';

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
      const statusParam = searchParams.get('status');
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

      const where: any = {};
      if (typeParam && typeParam.trim() !== '') {
        where.type = typeParam;
      }
      if (statusParam && statusParam.trim() !== '') {
        where.status = statusParam;
      }
      if (search && search.trim() !== '') {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [announcements, total] = await Promise.all([
        prisma.announcement.findMany({
          where,
          include: {
            createdBy: {
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
        prisma.announcement.count({ where }),
      ]);

      const transformedAnnouncements = announcements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        status: announcement.status,
        createdBy: announcement.createdById,
        createdByName: `${announcement.createdBy.firstName} ${announcement.createdBy.lastName}`,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
      }));

      return NextResponse.json({
        data: transformedAnnouncements,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const { title, content, type } = body;

      if (!title || !content || !type) {
        return NextResponse.json(
          { error: 'Title, content, and type are required' },
          { status: 400 }
        );
      }

      const announcement = await prisma.announcement.create({
        data: {
          title,
          content,
          type,
          createdById: authenticatedReq.user.userId,
        },
        include: {
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      let notificationsSent = false;
      if (announcement.status === 'PUBLISHED') {
        try {
          await NotificationService.sendAnnouncementToAllUsers({
            announcementId: announcement.id,
            title: announcement.title,
            content: announcement.content,
            type: announcement.type,
          });
          notificationsSent = true;
        } catch (notifErr) {
          console.error('Error sending announcement notifications:', notifErr);
        }
      }

      return NextResponse.json({
        data: {
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          type: announcement.type,
          status: announcement.status,
          createdBy: announcement.createdById,
          createdByName: `${announcement.createdBy.firstName} ${announcement.createdBy.lastName}`,
          createdAt: announcement.createdAt.toISOString(),
          updatedAt: announcement.updatedAt.toISOString(),
        },
        notificationsSent,
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json(
        { error: 'Failed to create announcement' },
        { status: 500 }
      );
    }
  });
}