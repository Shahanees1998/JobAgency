import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/candidates/applications
 * Get all applications for the current candidate
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
          { success: false, error: 'Only candidates can access this endpoint' },
          { status: 403 }
        );
      }

      const candidate = await prisma.candidate.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!candidate) {
        return NextResponse.json(
          { success: false, error: 'Candidate profile not found' },
          { status: 404 }
        );
      }

      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      const where: any = {
        candidateId: candidate.id,
      };

      if (status) {
        where.status = status;
      }

      const skip = (page - 1) * limit;

      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where,
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
          orderBy: { appliedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.application.count({ where }),
      ]);

      const transformedApplications = applications.map(app => ({
        id: app.id,
        status: app.status,
        coverLetter: app.coverLetter,
        appliedAt: app.appliedAt.toISOString(),
        reviewedAt: app.reviewedAt?.toISOString(),
        interviewScheduled: app.interviewScheduled,
        interviewDate: app.interviewDate?.toISOString(),
        interviewLocation: app.interviewLocation,
        interviewNotes: app.interviewNotes,
        rejectionReason: app.rejectionReason,
        job: {
          id: app.job.id,
          title: app.job.title,
          description: app.job.description,
          location: app.job.location,
          employmentType: app.job.employmentType,
          salaryRange: app.job.salaryRange,
          employer: app.job.employer,
        },
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


