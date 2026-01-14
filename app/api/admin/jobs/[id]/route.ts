import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/jobs/[id]
 * Get a single job by ID with full details (admin only)
 */
export async function GET(
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

      const job = await prisma.job.findUnique({
        where: { id },
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
          _count: {
            select: {
              applications: true,
            },
          },
        },
      });

      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      // Transform the data
      return NextResponse.json({
        data: {
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
          moderationNotes: job.moderationNotes,
          moderatedAt: job.moderatedAt?.toISOString(),
          isSponsored: job.isSponsored,
          isBoosted: job.isBoosted,
          boostExpiresAt: job.boostExpiresAt?.toISOString(),
          views: job.views,
          applicationCount: job.applicationCount,
          expiresAt: job.expiresAt?.toISOString(),
          totalApplications: job._count.applications,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
          employer: {
            id: job.employer.id,
            companyName: job.employer.companyName,
            companyDescription: job.employer.companyDescription,
            companyWebsite: job.employer.companyWebsite,
            companyLogo: job.employer.companyLogo,
            industry: job.employer.industry,
            companySize: job.employer.companySize,
            city: job.employer.city,
            country: job.employer.country,
            verificationStatus: job.employer.verificationStatus,
            isSuspended: job.employer.isSuspended,
            user: job.employer.user,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      return NextResponse.json(
        { error: 'Failed to fetch job' },
        { status: 500 }
      );
    }
  });
}

