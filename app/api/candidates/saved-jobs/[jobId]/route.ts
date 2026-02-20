import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/candidates/saved-jobs/[jobId]
 * Remove a job from saved (unlike/unbookmark)
 */
export async function DELETE(
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
          { success: false, error: 'Only candidates can unsave jobs' },
          { status: 403 }
        );
      }

      const { jobId } = params;
      if (!jobId) {
        return NextResponse.json(
          { success: false, error: 'jobId is required' },
          { status: 400 }
        );
      }

      const candidate = await prisma.candidate.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!candidate) {
        return NextResponse.json({
          success: true,
          data: { saved: false, jobId },
        });
      }

      await prisma.savedJob.deleteMany({
        where: {
          candidateId: candidate.id,
          jobId,
        },
      });

      return NextResponse.json({
        success: true,
        data: { saved: false, jobId },
      });
    } catch (error) {
      console.error('Error unsaving job:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to unsave job' },
        { status: 500 }
      );
    }
  });
}
