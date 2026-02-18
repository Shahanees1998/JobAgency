import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { pusherServer, chatChannelName } from '@/lib/realtime';
import { sendFcmToUser } from '@/lib/fcmService';

/**
 * GET /api/chats/[chatId]/messages
 * Get messages for a specific chat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { chatId } = params;
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');

      // Verify user is a participant
      const participant = await prisma.chatParticipant.findUnique({
        where: {
          chatId_userId: {
            chatId,
            userId,
          },
        },
      });

      if (!participant) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized to access this chat' },
          { status: 403 }
        );
      }

      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: {
            chatId,
            isDeleted: false,
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.message.count({
          where: {
            chatId,
            isDeleted: false,
          },
        }),
      ]);

      // Update last read time
      await prisma.chatParticipant.update({
        where: {
          chatId_userId: {
            chatId,
            userId,
          },
        },
        data: {
          lastReadAt: new Date(),
        },
      });

      const transformedMessages = messages.reverse().map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        messageType: msg.messageType,
        isEdited: msg.isEdited,
        createdAt: msg.createdAt.toISOString(),
        updatedAt: msg.updatedAt.toISOString(),
        sender: {
          id: msg.sender.id,
          firstName: msg.sender.firstName,
          lastName: msg.sender.lastName,
          profileImage: msg.sender.profileImage,
        },
      }));

      return NextResponse.json({
        success: true,
        data: {
          messages: transformedMessages,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/chats/[chatId]/messages
 * Send a message in a chat
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { chatId } = params;

      // Verify user is a participant and chat is active
      const participant = await prisma.chatParticipant.findUnique({
        where: {
          chatId_userId: {
            chatId,
            userId,
          },
        },
        include: {
          chat: {
            select: {
              isActive: true,
            },
          },
        },
      });

      if (!participant) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized to send messages in this chat' },
          { status: 403 }
        );
      }

      if (!participant.chat.isActive) {
        return NextResponse.json(
          { success: false, error: 'This chat is not active' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { content, messageType: rawMessageType } = body;

      const messageType = rawMessageType === 'IMAGE' || rawMessageType === 'FILE' ? rawMessageType : 'TEXT';
      const contentStr = typeof content === 'string' ? content.trim() : '';

      if (!contentStr) {
        return NextResponse.json(
          { success: false, error: 'Message content is required' },
          { status: 400 }
        );
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          chatId,
          senderId: userId,
          content: contentStr,
          messageType,
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
      });

      // Update chat last message time
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          lastMessageAt: new Date(),
        },
      });

      // Get other participant to send notification
      const otherParticipant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId: { not: userId },
        },
      });

      if (otherParticipant) {
        await prisma.notification.create({
          data: {
            userId: otherParticipant.userId,
            title: 'New Message',
            message: contentStr.length > 50 ? contentStr.substring(0, 50) + '...' : contentStr,
            type: 'NEW_CHAT_MESSAGE',
            relatedId: chatId,
            relatedType: 'CHAT',
          },
        });
        // Mobile: FCM push for new message
        const senderName = message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Someone';
        sendFcmToUser(otherParticipant.userId, {
          title: 'New Message',
          body: `${senderName}: ${contentStr.length > 80 ? contentStr.substring(0, 80) + '...' : contentStr}`,
          data: { chatId, type: 'NEW_CHAT_MESSAGE', relatedId: chatId, relatedType: 'CHAT' },
        }).catch(() => {});
      }

      // Real-time 1-1 chat: Pusher so both web and mobile can receive live messages
      try {
        await pusherServer.trigger(chatChannelName(chatId), 'new-message', {
          id: message.id,
          senderId: message.senderId,
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt.toISOString(),
          sender: message.sender,
        });
      } catch (pusherErr) {
        console.warn('[Chat] Pusher trigger failed:', (pusherErr as Error).message);
      }

      return NextResponse.json({
        success: true,
        data: {
          id: message.id,
          senderId: message.senderId,
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt.toISOString(),
          sender: message.sender,
        },
        message: 'Message sent successfully',
      }, { status: 201 });
    } catch (error) {
      console.error('Error sending message:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send message' },
        { status: 500 }
      );
    }
  });
}


