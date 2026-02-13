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
      const datePosted = searchParams.get('datePosted'); // all | 24h | 3d | 7d
      const sortBy = searchParams.get('sortBy'); // relevance | date
      const remote = searchParams.get('remote'); // comma-separated: on-site,remote,hybrid
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
        // Allow comma-separated multi select
        const types = employmentType
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        where.employmentType = types.length > 1 ? { in: types } : types[0];
      }

      // Date posted filter (createdAt)
      if (datePosted && datePosted !== 'all') {
        const now = Date.now();
        const ms =
          datePosted === '24h'
            ? 24 * 60 * 60 * 1000
            : datePosted === '3d'
              ? 3 * 24 * 60 * 60 * 1000
              : datePosted === '7d'
                ? 7 * 24 * 60 * 60 * 1000
                : 0;
        if (ms > 0) {
          where.createdAt = { gte: new Date(now - ms) };
        }
      }

      // Remote/hybrid filter (best-effort using location string)
      // If user selects only remote/hybrid (without on-site), filter location containing those keywords.
      if (remote) {
        const parts = remote
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const wantsOnSite = parts.includes('on-site') || parts.includes('onsite');
        const wantsRemote = parts.includes('remote');
        const wantsHybrid = parts.includes('hybrid');
        if (!wantsOnSite && (wantsRemote || wantsHybrid)) {
          const ors: any[] = [];
          if (wantsRemote) ors.push({ location: { contains: 'remote', mode: 'insensitive' } });
          if (wantsHybrid) ors.push({ location: { contains: 'hybrid', mode: 'insensitive' } });
          if (ors.length) {
            where.AND = [...(where.AND ?? []), { OR: ors }];
          }
        }
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
          orderBy:
            sortBy === 'date'
              ? [{ createdAt: 'desc' }]
              : [
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
        benefits: job.benefits || [],
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


