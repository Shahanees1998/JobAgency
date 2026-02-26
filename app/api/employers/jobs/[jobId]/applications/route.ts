import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/employers/jobs/[jobId]/applications
 * Get all applications for a specific job
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

      const { jobId } = params;

      // Verify the job belongs to this employer
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { employer: true },
      });

      if (!job || !job.employer || job.employer.userId !== userId) {
        return NextResponse.json(
          { success: false, error: 'Job not found or unauthorized' },
          { status: 404 }
        );
      }

      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = (page - 1) * limit;

      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where: { jobId },
          select: {
            id: true,
            status: true,
            coverLetter: true,
            appliedAt: true,
            reviewedAt: true,
            interviewScheduled: true,
            interviewDate: true,
            interviewLocation: true,
            interviewNotes: true,
            rejectionReason: true,
            candidate: {
              select: {
                id: true,
                cvUrl: true,
                bio: true,
                skills: true,
                experience: true,
                education: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    profileImage: true,
                  },
                },
              },
            },
            job: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { appliedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.application.count({ where: { jobId } }),
      ]);

      const transformedApplications = applications.map((app) => ({
        id: app.id,
        status: app.status,
        coverLetter: app.coverLetter ? app.coverLetter.slice(0, 400) : null,
        appliedAt: app.appliedAt.toISOString(),
        reviewedAt: app.reviewedAt?.toISOString() ?? null,
        interviewScheduled: app.interviewScheduled,
        interviewDate: app.interviewDate?.toISOString() ?? null,
        interviewLocation: app.interviewLocation,
        interviewNotes: app.interviewNotes,
        rejectionReason: app.rejectionReason,
        candidate: {
          id: app.candidate.id,
          cvUrl: app.candidate.cvUrl,
          bio: app.candidate.bio ? app.candidate.bio.slice(0, 200) : null,
          skills: app.candidate.skills,
          experience: app.candidate.experience,
          education: app.candidate.education,
          user: app.candidate.user,
        },
        job: app.job,
      }));

      return NextResponse.json({
        success: true,
        data: {
          applications: transformedApplications,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch applications' },
        { status: 500 }
      );
    }
  });
}


