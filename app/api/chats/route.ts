import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/chats
 * Get all chats for the current user
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Get user role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Get chats where user is a participant
      const chatParticipants = await prisma.chatParticipant.findMany({
        where: { userId },
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
                        select: {
                          id: true,
                          companyName: true,
                        },
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
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  senderId: true,
                },
              },
            },
          },
        },
        orderBy: {
          chat: {
            lastMessageAt: 'desc',
          },
        },
      });

      const chats = chatParticipants
        .filter(cp => cp.chat.isActive)
        .map(cp => {
          const chat = cp.chat;
          const application = chat.application;
          
          // Determine the other participant
          let otherParticipant;
          if (user.role === 'CANDIDATE') {
            otherParticipant = application.job.employer;
          } else {
            otherParticipant = application.candidate.user;
          }

          return {
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
          };
        });

      return NextResponse.json({
        success: true,
        data: chats,
      });
    } catch (error) {
      console.error('Error fetching chats:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch chats' },
        { status: 500 }
      );
    }
  });
}

