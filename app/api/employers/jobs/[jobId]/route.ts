import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/employers/jobs/[jobId]
 * Get a single job belonging to the current employer (any status)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId || authenticatedReq.user?.role !== 'EMPLOYER') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const employer = await prisma.employer.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!employer) {
        return NextResponse.json(
          { success: false, error: 'Employer profile not found' },
          { status: 404 }
        );
      }

      const job = await prisma.job.findFirst({
        where: { id: params.jobId, employerId: employer.id },
        include: {
          _count: { select: { applications: true } },
        },
      });

      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: job.id,
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
          location: job.location,
          salaryRange: job.salaryRange,
          employmentType: job.employmentType,
          category: job.category,
          benefits: job.benefits || [],
          status: job.status,
          views: job.views,
          applicationCount: job.applicationCount,
          totalApplications: job._count.applications,
          expiresAt: job.expiresAt?.toISOString(),
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error fetching employer job:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch job' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/employers/jobs/[jobId]
 * Update a job belonging to the current employer
 *
 * Notes:
 * - Employer can edit job fields.
 * - Employer can close/delist their job by setting status: "CLOSED".
 * - Employer cannot set status to other moderation statuses (APPROVED/REJECTED/SUSPENDED).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId || authenticatedReq.user?.role !== 'EMPLOYER') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const employer = await prisma.employer.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!employer) {
        return NextResponse.json(
          { success: false, error: 'Employer profile not found' },
          { status: 404 }
        );
      }

      const existingJob = await prisma.job.findFirst({
        where: { id: params.jobId, employerId: employer.id },
        select: { id: true, status: true },
      });

      if (!existingJob) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }

      const body = await request.json();
      const {
        title,
        description,
        requirements,
        responsibilities,
        location,
        salaryRange,
        employmentType,
        category,
        benefits,
        status,
      } = body;

      // If status provided, only allow closing the job
      if (status !== undefined && status !== 'CLOSED') {
        return NextResponse.json(
          { success: false, error: 'Invalid status update' },
          { status: 400 }
        );
      }

      const updatedJob = await prisma.job.update({
        where: { id: existingJob.id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(requirements !== undefined && { requirements }),
          ...(responsibilities !== undefined && { responsibilities }),
          ...(location !== undefined && { location }),
          ...(salaryRange !== undefined && { salaryRange }),
          ...(employmentType !== undefined && { employmentType }),
          ...(category !== undefined && { category }),
          ...(benefits !== undefined && { benefits: Array.isArray(benefits) ? benefits : [] }),
          ...(status === 'CLOSED' && { status: 'CLOSED' }),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updatedJob.id,
          title: updatedJob.title,
          description: updatedJob.description,
          requirements: updatedJob.requirements,
          responsibilities: updatedJob.responsibilities,
          location: updatedJob.location,
          salaryRange: updatedJob.salaryRange,
          employmentType: updatedJob.employmentType,
          category: updatedJob.category,
          benefits: updatedJob.benefits || [],
          status: updatedJob.status,
          views: updatedJob.views,
          applicationCount: updatedJob.applicationCount,
          expiresAt: updatedJob.expiresAt?.toISOString(),
          createdAt: updatedJob.createdAt.toISOString(),
          updatedAt: updatedJob.updatedAt.toISOString(),
        },
        message: status === 'CLOSED' ? 'Job closed successfully' : 'Job updated successfully',
      });
    } catch (error) {
      console.error('Error updating employer job:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update job' },
        { status: 500 }
      );
    }
  });
}

