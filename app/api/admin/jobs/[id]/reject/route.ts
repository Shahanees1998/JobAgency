import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/admin/jobs/[id]/reject
 * Reject a job listing and log the action
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
      const { reason, notes } = body;

      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        );
      }

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
          status: 'REJECTED',
          moderationNotes: notes || reason,
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
          action: 'JOB_REJECTED',
          entityType: 'JOB',
          entityId: id,
          description: `Rejected job: ${job.title}`,
          metadata: JSON.stringify({ reason, notes }),
        },
      });

      // TODO: Send notification to employer
      // await createNotification(...)

      return NextResponse.json({
        data: {
          id: updatedJob.id,
          title: updatedJob.title,
          status: updatedJob.status,
        },
        message: 'Job rejected successfully',
      });
    } catch (error) {
      console.error('Error rejecting job:', error);
      return NextResponse.json(
        { error: 'Failed to reject job' },
        { status: 500 }
      );
    }
  });
}

