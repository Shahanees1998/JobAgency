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

      const announcements = await prisma.announcement.findMany({
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
      });

      // Transform the data to match the expected interface
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

      return NextResponse.json({ data: transformedAnnouncements });
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