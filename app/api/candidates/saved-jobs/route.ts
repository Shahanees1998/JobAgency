import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/candidates/saved-jobs
 * List jobs saved (liked/bookmarked) by the current candidate
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

      if (authenticatedReq.user?.role !== 'CANDIDATE') {
        return NextResponse.json(
          { success: false, error: 'Only candidates can access saved jobs' },
          { status: 403 }
        );
      }

      const candidate = await prisma.candidate.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!candidate) {
        return NextResponse.json({
          success: true,
          data: { jobs: [], total: 0 },
        });
      }

      const saved = await prisma.savedJob.findMany({
        where: { candidateId: candidate.id },
        include: {
          job: {
            include: {
              employer: {
                select: {
                  id: true,
                  companyName: true,
                  companyLogo: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const jobs = saved
        .filter((s) => s.job.status === 'APPROVED')
        .map((s) => ({
          id: s.job.id,
          title: s.job.title,
          location: s.job.location,
          salaryRange: s.job.salaryRange,
          employmentType: s.job.employmentType,
          category: s.job.category,
          benefits: s.job.benefits || [],
          status: s.job.status,
          employer: s.job.employer,
          savedAt: s.createdAt.toISOString(),
        }));

      return NextResponse.json({
        success: true,
        data: { jobs, total: jobs.length },
      });
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch saved jobs' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/candidates/saved-jobs
 * Save (like/bookmark) a job. Body: { jobId: string }
 */
export async function POST(request: NextRequest) {
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
          { success: false, error: 'Only candidates can save jobs' },
          { status: 403 }
        );
      }

      const body = await request.json().catch(() => ({}));
      const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : '';

      if (!jobId) {
        return NextResponse.json(
          { success: false, error: 'jobId is required' },
          { status: 400 }
        );
      }

      let candidate = await prisma.candidate.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!candidate) {
        candidate = await prisma.candidate.create({
          data: { userId },
          select: { id: true },
        });
      }

      const cid = candidate.id;

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, status: true },
      });

      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }

      if (job.status !== 'APPROVED') {
        return NextResponse.json(
          { success: false, error: 'Job is not available to save' },
          { status: 400 }
        );
      }

      await prisma.savedJob.upsert({
        where: {
          candidateId_jobId: { candidateId: cid, jobId },
        },
        create: { candidateId: cid, jobId },
        update: {},
      });

      return NextResponse.json({
        success: true,
        data: { saved: true, jobId },
      });
    } catch (error) {
      console.error('Error saving job:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save job' },
        { status: 500 }
      );
    }
  });
}
