import { NextRequest, NextResponse } from 'next/server';
import { withOptionalAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/jobs
 * Get all approved jobs (public endpoint)
 * Optional authentication for personalized results
 */
export async function GET(request: NextRequest) {
  return withOptionalAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');
      const category = searchParams.get('category');
      const employmentType = searchParams.get('employmentType');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      // Only show approved jobs to public
      const where: any = {
        status: 'APPROVED',
        employer: {
          verificationStatus: 'APPROVED',
          isSuspended: false,
        },
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { employer: { companyName: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (category) {
        where.category = { contains: category, mode: 'insensitive' };
      }

      if (employmentType) {
        where.employmentType = employmentType;
      }

      const skip = (page - 1) * limit;

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
          include: {
            employer: {
              select: {
                id: true,
                companyName: true,
                companyLogo: true,
              },
            },
            _count: {
              select: {
                applications: true,
              },
            },
          },
          orderBy: [
            { isBoosted: 'desc' },
            { isSponsored: 'desc' },
            { createdAt: 'desc' },
          ],
          skip,
          take: limit,
        }),
        prisma.job.count({ where }),
      ]);

      // Increment view count for each job
      if (jobs.length > 0) {
        await prisma.job.updateMany({
          where: {
            id: { in: jobs.map(j => j.id) },
          },
          data: {
            views: { increment: 1 },
          },
        });
      }

      const transformedJobs = jobs.map(job => ({
        id: job.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        location: job.location,
        salaryRange: job.salaryRange,
        employmentType: job.employmentType,
        category: job.category,
        status: job.status,
        isSponsored: job.isSponsored,
        isBoosted: job.isBoosted,
        views: job.views,
        applicationCount: job._count.applications,
        expiresAt: job.expiresAt?.toISOString(),
        createdAt: job.createdAt.toISOString(),
        employer: {
          id: job.employer.id,
          companyName: job.employer.companyName,
          companyLogo: job.employer.companyLogo,
        },
      }));

      return NextResponse.json({
        success: true,
        data: {
          jobs: transformedJobs,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }
  });
}


