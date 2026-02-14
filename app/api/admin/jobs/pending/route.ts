import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/jobs/pending
 * Get pending job moderations with server-side pagination and search
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

      const where: any = { status: 'PENDING' };
      if (search && search.trim() !== '') {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { employer: { companyName: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const skip = (page - 1) * limit;

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
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
          orderBy: { createdAt: 'asc' },
          skip,
          take: limit,
        }),
        prisma.job.count({ where }),
      ]);

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

      return NextResponse.json({
        data: transformedJobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching pending jobs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pending jobs' },
        { status: 500 }
      );
    }
  });
}

