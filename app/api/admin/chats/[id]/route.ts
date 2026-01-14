import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/chats/[id]
 * Get chat history for moderation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { id } = params;
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');

      const chat = await prisma.chat.findUnique({
        where: { id },
        include: {
          application: {
            include: {
              job: {
                include: {
                  employer: {
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
          participants: {
            include: {
              candidate: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }

      const skip = (page - 1) * limit;

      const [messages, totalMessages] = await Promise.all([
        prisma.message.findMany({
          where: { chatId: id },
          include: {
            sender: {
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
        prisma.message.count({ where: { chatId: id } }),
      ]);

      return NextResponse.json({
        data: {
          id: chat.id,
          applicationId: chat.applicationId,
          isActive: chat.isActive,
          lastMessageAt: chat.lastMessageAt?.toISOString(),
          createdAt: chat.createdAt.toISOString(),
          application: chat.application,
          participants: chat.participants,
          messages: messages.reverse(), // Reverse to show oldest first
          pagination: {
            page,
            limit,
            total: totalMessages,
            totalPages: Math.ceil(totalMessages / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching chat:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chat' },
        { status: 500 }
      );
    }
  });
}

