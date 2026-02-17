import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { NotificationService } from '@/lib/notificationService';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const body = await request.json();
            const data: Record<string, any> = {};
            if (body.title !== undefined) data.title = body.title;
            if (body.content !== undefined) data.content = body.content;
            if (body.type !== undefined) data.type = body.type;
            if (body.status !== undefined) data.status = body.status;

            if (Object.keys(data).length === 0) {
                return NextResponse.json(
                    { error: 'At least one field (title, content, type, status) is required' },
                    { status: 400 }
                );
            }

            const previous = await prisma.announcement.findUnique({
                where: { id: params.id },
                select: { status: true },
            });

            // Update announcement
            const announcement = await prisma.announcement.update({
                where: { id: params.id },
                data,
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
            });

            const statusChangedToPublished =
                data.status === 'PUBLISHED' && previous?.status !== 'PUBLISHED';
            if (statusChangedToPublished) {
                try {
                    await NotificationService.sendAnnouncementToAllUsers({
                        announcementId: announcement.id,
                        title: announcement.title,
                        content: announcement.content,
                        type: announcement.type,
                    });
                } catch (notifErr) {
                    console.error('Error sending announcement notifications:', notifErr);
                }
            }

            return NextResponse.json({
                ...announcement,
                createdAt: announcement.createdAt.toISOString(),
                updatedAt: announcement.updatedAt.toISOString(),
            });
        } catch (error) {
            console.error('Error updating announcement:', error);
            return NextResponse.json(
                { error: 'Failed to update announcement' },
                { status: 500 }
            );
        }
    });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            await prisma.announcement.delete({
                where: { id: params.id },
            });

            return NextResponse.json({ message: 'Announcement deleted successfully' });
        } catch (error) {
            console.error('Error deleting announcement:', error);
            return NextResponse.json(
                { error: 'Failed to delete announcement' },
                { status: 500 }
            );
        }
    });
} 