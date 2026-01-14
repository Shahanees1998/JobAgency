import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/jobs/pending
 * Get all pending job moderations
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const jobs = await prisma.job.findMany({
        where: {
          status: 'PENDING',
        },
        include: {
          employer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' }, // Oldest first
      });

      const transformedJobs = jobs.map(job => ({
        id: job.id,
        employerId: job.employerId,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        location: job.location,
        salaryRange: job.salaryRange,
        employmentType: job.employmentType,
        category: job.category,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
        employer: {
          id: job.employer.id,
          companyName: job.employer.companyName,
          user: job.employer.user,
        },
      }));

      return NextResponse.json({ data: transformedJobs });
    } catch (error) {
      console.error('Error fetching pending jobs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pending jobs' },
        { status: 500 }
      );
    }
  });
}

