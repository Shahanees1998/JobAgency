import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// GET /api/admin/notifications/[id] - Get specific notification
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const notification = await prisma.notification.findFirst({
        where: { 
          id: params.id,
          userId: authenticatedReq.user!.userId 
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
      if (!notification) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      return NextResponse.json(notification);
    } catch (error) {
      console.error('Get notification error:', error);
      return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 });
    }
  });
}

// PUT /api/admin/notifications/[id] - Update notification
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { title, message, type, isArchived } = await request.json();
      const updateData: any = {};
      if (title) updateData.title = title;
      if (message) updateData.message = message;
      if (type) updateData.type = type;
      if (isArchived !== undefined) updateData.isArchived = isArchived;
      
      const notification = await prisma.notification.update({
        where: { 
          id: params.id,
          userId: authenticatedReq.user!.userId 
        },
        data: updateData,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
      return NextResponse.json(notification);
    } catch (error) {
      console.error('Update notification error:', error);
      const err = error as any;
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
    }
  });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const { searchParams } = new URL(request.url);
            const action = searchParams.get('action');

            if (action === 'read') {
                const notification = await prisma.notification.update({
                    where: { 
                        id: params.id,
                        userId: authenticatedReq.user!.userId 
                    },
                    data: { isRead: true },
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
                });

                return NextResponse.json({
                    ...notification,
                    createdAt: notification.createdAt.toISOString(),
                });
            }

            if (action === 'archive') {
                const notification = await prisma.notification.update({
                    where: { 
                        id: params.id,
                        userId: authenticatedReq.user!.userId 
                    },
                    data: { isArchived: true },
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
                });

                return NextResponse.json({
                    ...notification,
                    createdAt: notification.createdAt.toISOString(),
                });
            }

            return NextResponse.json(
                { error: 'Invalid action' },
                { status: 400 }
            );
        } catch (error) {
            console.error('Error updating notification:', error);
            return NextResponse.json(
                { error: 'Failed to update notification' },
                { status: 500 }
            );
        }
    });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            await prisma.notification.delete({
                where: { 
                    id: params.id,
                    userId: authenticatedReq.user!.userId 
                },
            });

            return NextResponse.json({ message: 'Notification deleted successfully' });
        } catch (error) {
            console.error('Error deleting notification:', error);
            return NextResponse.json(
                { error: 'Failed to delete notification' },
                { status: 500 }
            );
        }
    });
} 