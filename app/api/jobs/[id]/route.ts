import { NextRequest, NextResponse } from 'next/server';
import { withOptionalAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/jobs/[id]
 * Get job details by ID (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withOptionalAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
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
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }

      // Only show approved jobs to public
      if (job.status !== 'APPROVED' || job.employer.verificationStatus !== 'APPROVED' || job.employer.isSuspended) {
        return NextResponse.json(
          { success: false, error: 'Job not available' },
          { status: 404 }
        );
      }

      // Increment view count
      await prisma.job.update({
        where: { id },
        data: {
          views: { increment: 1 },
        },
      });

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
          views: job.views + 1,
          applicationCount: job._count.applications,
          expiresAt: job.expiresAt?.toISOString(),
          createdAt: job.createdAt.toISOString(),
          employer: {
            id: job.employer.id,
            companyName: job.employer.companyName,
            companyDescription: job.employer.companyDescription,
            companyLogo: job.employer.companyLogo,
            companyWebsite: job.employer.companyWebsite,
            industry: job.employer.industry,
            companySize: job.employer.companySize,
            city: job.employer.city,
            country: job.employer.country,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching job:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch job' },
        { status: 500 }
      );
    }
  });
}


