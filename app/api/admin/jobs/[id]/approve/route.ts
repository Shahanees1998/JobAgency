import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { sendUserNotification } from '@/lib/notificationService';
import { NotificationTemplates } from '@/lib/notificationService';

/**
 * PUT /api/admin/jobs/[id]/approve
 * Approve a job listing and log the action
 */
export async function PUT(
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
      const body = await request.json();
      const { notes } = body;

      // Get job
      const job = await prisma.job.findUnique({
        where: { id },
        include: { employer: true },
      });

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      // Update job status
      const updatedJob = await prisma.job.update({
        where: { id },
        data: {
          status: 'APPROVED',
          moderationNotes: notes || null,
          moderatedAt: new Date(),
          moderatedById: authenticatedReq.user?.userId,
        },
        include: {
          employer: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      });

      // Log admin action
      await prisma.adminLog.create({
        data: {
          adminId: authenticatedReq.user?.userId!,
          action: 'JOB_APPROVED',
          entityType: 'JOB',
          entityId: id,
          description: `Approved job: ${job.title}`,
          metadata: JSON.stringify({ notes }),
        },
      });

      // Notify employer (in-app + Pusher real-time + FCM push when app in background)
      const employerUserId = job.employer.userId;
      try {
        await sendUserNotification({
          id: updatedJob.id,
          userId: employerUserId,
          title: NotificationTemplates.jobApproved(updatedJob.title).title,
          message: NotificationTemplates.jobApproved(updatedJob.title).message,
          type: 'JOB_APPROVED',
          relatedId: id,
          relatedType: 'job',
        });
        console.info('[Admin approve job] Notification sent to employer userId:', employerUserId);
      } catch (e) {
        console.error('[Admin approve job] Failed to send notification to employer:', e);
        // Still return success; job was approved
      }

      return NextResponse.json({
        data: {
          id: updatedJob.id,
          title: updatedJob.title,
          status: updatedJob.status,
          moderatedAt: updatedJob.moderatedAt?.toISOString(),
        },
        message: 'Job approved successfully',
      });
    } catch (error) {
      console.error('Error approving job:', error);
      return NextResponse.json(
        { error: 'Failed to approve job' },
        { status: 500 }
      );
    }
  });
}

