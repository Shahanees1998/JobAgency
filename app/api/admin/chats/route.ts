import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/chats
 * Get all chats for moderation
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      // Build where clause for filtering
      const where: any = {};
      
      if (search) {
        where.OR = [
          { application: { job: { title: { contains: search, mode: 'insensitive' } } } },
          { application: { candidate: { user: { firstName: { contains: search, mode: 'insensitive' } } } } },
          { application: { candidate: { user: { lastName: { contains: search, mode: 'insensitive' } } } } },
          { application: { job: { employer: { companyName: { contains: search, mode: 'insensitive' } } } } },
        ];
      }

      const skip = (page - 1) * limit;

      const [chats, total] = await Promise.all([
        prisma.chat.findMany({
          where,
          include: {
            application: {
              include: {
                job: {
                  select: {
                    id: true,
                    title: true,
                    employer: {
                      select: {
                        companyName: true,
                      },
                    },
                  },
                },
                candidate: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                messages: true,
              },
            },
          },
          orderBy: { lastMessageAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.chat.count({ where }),
      ]);

      // Transform the data
      const transformedChats = chats.map(chat => ({
        id: chat.id,
        applicationId: chat.applicationId,
        isActive: chat.isActive,
        lastMessageAt: chat.lastMessageAt?.toISOString(),
        totalMessages: chat._count.messages,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
        application: {
          id: chat.application.id,
          status: chat.application.status,
          job: chat.application.job,
          candidate: chat.application.candidate,
        },
      }));

      return NextResponse.json({
        data: transformedChats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching chats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chats' },
        { status: 500 }
      );
    }
  });
}

