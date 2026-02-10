import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/candidates/jobs/[jobId]/applications/[applicationId]/withdraw
 * Withdraw (delete) an application for the current candidate.
 *
 * Notes:
 * - We delete the Application record so the candidate can re-apply later.
 * - Chat is linked to Application and will cascade-delete via schema relations.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string; applicationId: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      if (authenticatedReq.user?.role !== 'CANDIDATE') {
        return NextResponse.json(
          { success: false, error: 'Only candidates can withdraw applications' },
          { status: 403 }
        );
      }

      const { jobId, applicationId } = params;

      const candidate = await prisma.candidate.findUnique({
        where: { userId },
        select: { id: true, user: { select: { firstName: true, lastName: true } } },
      });

      if (!candidate) {
        return NextResponse.json({ success: false, error: 'Candidate profile not found' }, { status: 404 });
      }

      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              applicationCount: true,
              employer: { select: { user: { select: { id: true } } } },
            },
          },
        },
      });

      if (!application || application.jobId !== jobId || application.candidateId !== candidate.id) {
        return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
      }

      const candidateName = `${candidate.user?.firstName || ''} ${candidate.user?.lastName || ''}`.trim() || 'A candidate';

      await prisma.$transaction(async (tx) => {
        await tx.application.delete({ where: { id: applicationId } });
        if (application.job.applicationCount > 0) {
          await tx.job.update({
            where: { id: jobId },
            data: { applicationCount: { decrement: 1 } },
          });
        }
      });

      // Notify employer
      await prisma.notification.create({
        data: {
          userId: application.job.employer.user.id,
          title: 'Application withdrawn',
          message: `${candidateName} withdrew their application for ${application.job.title}.`,
          type: 'SYSTEM_ALERT',
          relatedId: applicationId,
          relatedType: 'APPLICATION',
          metadata: JSON.stringify({ jobId }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Application withdrawn successfully',
      });
    } catch (error) {
      console.error('Error withdrawing application:', error);
      return NextResponse.json({ success: false, error: 'Failed to withdraw application' }, { status: 500 });
    }
  });
}

