import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/chats/[chatId]
 * Get a single chat (header/info) for current user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      const { chatId } = params;

      const participant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
        include: {
          chat: {
            include: {
              application: {
                include: {
                  job: {
                    select: {
                      id: true,
                      title: true,
                      employer: {
                        select: { id: true, companyName: true },
                      },
                    },
                  },
                  candidate: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          firstName: true,
                          lastName: true,
                          profileImage: true,
                        },
                      },
                    },
                  },
                },
              },
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { id: true, content: true, createdAt: true, senderId: true },
              },
            },
          },
        },
      });

      if (!participant) {
        return NextResponse.json({ success: false, error: 'Unauthorized to access this chat' }, { status: 403 });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const chat = participant.chat;
      if (!chat.isActive) {
        return NextResponse.json({ success: false, error: 'This chat is not active' }, { status: 400 });
      }

      const application = chat.application;
      const otherParticipant =
        user.role === 'CANDIDATE'
          ? application.job.employer
          : application.candidate.user;

      return NextResponse.json({
        success: true,
        data: {
          id: chat.id,
          applicationId: application.id,
          lastMessage: chat.messages[0] || null,
          lastMessageAt: chat.lastMessageAt?.toISOString(),
          createdAt: chat.createdAt.toISOString(),
          application: {
            id: application.id,
            job: {
              id: application.job.id,
              title: application.job.title,
              employer: application.job.employer,
            },
            candidate: application.candidate,
          },
          otherParticipant,
        },
      });
    } catch (error) {
      console.error('Error fetching chat:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch chat' }, { status: 500 });
    }
  });
}

