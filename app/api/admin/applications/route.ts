import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/applications
 * Get all applications with optional filtering
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const jobId = searchParams.get('jobId');
      const candidateId = searchParams.get('candidateId');
      const search = searchParams.get('search');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      // Build where clause for filtering
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (jobId) {
        where.jobId = jobId;
      }
      
      if (candidateId) {
        where.candidateId = candidateId;
      }
      
      if (search) {
        where.OR = [
          { job: { title: { contains: search, mode: 'insensitive' } } },
          { candidate: { user: { firstName: { contains: search, mode: 'insensitive' } } } },
          { candidate: { user: { lastName: { contains: search, mode: 'insensitive' } } } },
          { candidate: { user: { email: { contains: search, mode: 'insensitive' } } } },
          { coverLetter: { contains: search, mode: 'insensitive' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where,
          include: {
            job: {
              select: {
                id: true,
                title: true,
                employer: {
                  select: {
                    id: true,
                    companyName: true,
                  },
                },
              },
            },
            candidate: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
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

      // Transform the data
      const transformedApplications = applications.map(application => ({
        id: application.id,
        jobId: application.jobId,
        candidateId: application.candidateId,
        status: application.status,
        coverLetter: application.coverLetter,
        appliedAt: application.appliedAt.toISOString(),
        reviewedAt: application.reviewedAt?.toISOString(),
        interviewScheduled: application.interviewScheduled,
        interviewDate: application.interviewDate?.toISOString(),
        interviewLocation: application.interviewLocation,
        interviewNotes: application.interviewNotes,
        rejectionReason: application.rejectionReason,
        createdAt: application.createdAt.toISOString(),
        updatedAt: application.updatedAt.toISOString(),
        job: application.job,
        candidate: {
          id: application.candidate.id,
          userId: application.candidate.userId,
          user: application.candidate.user,
        },
      }));

      return NextResponse.json({
        data: transformedApplications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      );
    }
  });
}

