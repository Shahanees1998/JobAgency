import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { sendUserNotification } from '@/lib/notificationService';
import { NotificationTemplates } from '@/lib/notificationService';

/**
 * POST /api/candidates/jobs/[jobId]/apply
 * Apply to a job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
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

      if (authenticatedReq.user?.role !== 'CANDIDATE') {
        return NextResponse.json(
          { success: false, error: 'Only candidates can apply to jobs' },
          { status: 403 }
        );
      }

      const { jobId } = params;

      // Get or create candidate (create if user registered before we added auto-creation)
      let candidate = await prisma.candidate.findUnique({
        where: { userId },
        select: { id: true, cvUrl: true },
      });

      if (!candidate) {
        candidate = await prisma.candidate.create({
          data: { userId },
          select: { id: true, cvUrl: true },
        });
      }

      // Allow apply without CV for now; candidate can add resume later in My Resume
      // Get job
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          employer: {
            select: {
              id: true,
              companyName: true,
              user: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }

      // Check if job is approved
      if (job.status !== 'APPROVED') {
        return NextResponse.json(
          { success: false, error: 'This job is not available for applications' },
          { status: 400 }
        );
      }

      // Check if already applied
      const existingApplication = await prisma.application.findUnique({
        where: {
          jobId_candidateId: {
            jobId,
            candidateId: candidate.id,
          },
        },
      });

      if (existingApplication) {
        return NextResponse.json(
          { success: false, error: 'You have already applied to this job' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { coverLetter } = body;

      // Create application
      const application = await prisma.application.create({
        data: {
          jobId,
          candidateId: candidate.id,
          coverLetter: coverLetter || null,
          status: 'APPLIED',
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
            },
          },
          candidate: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      // Increment application count on job
      await prisma.job.update({
        where: { id: jobId },
        data: {
          applicationCount: { increment: 1 },
        },
      });

      // Notify employer (in-app + FCM)
      const candidateName = `${application.candidate.user.firstName} ${application.candidate.user.lastName}`.trim() || 'A candidate';
      const template = NotificationTemplates.applicationReceived(candidateName, job.title, application.id);
      sendUserNotification({
        id: application.id,
        userId: job.employer.user.id,
        title: template.title,
        message: template.message,
        type: 'INFO',
        relatedId: application.id,
        relatedType: 'application',
        metadata: template.metadata,
      }).catch((e) => console.error('[FCM] Job applied notify employer:', e));

      return NextResponse.json({
        success: true,
        data: application,
        message: 'Application submitted successfully',
      }, { status: 201 });
    } catch (error) {
      console.error('Error applying to job:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to apply to job' },
        { status: 500 }
      );
    }
  });
}


