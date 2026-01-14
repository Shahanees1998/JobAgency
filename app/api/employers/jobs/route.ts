import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/employers/jobs
 * Get all jobs posted by the current employer
 */
export async function GET(request: NextRequest) {
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

      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      const where: any = {
        employerId: employer.id,
      };

      if (status) {
        where.status = status;
      }

      const skip = (page - 1) * limit;

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
          include: {
            _count: {
              select: {
                applications: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.job.count({ where }),
      ]);

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
        views: job.views,
        applicationCount: job.applicationCount,
        totalApplications: job._count.applications,
        expiresAt: job.expiresAt?.toISOString(),
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
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
      console.error('Error fetching employer jobs:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/employers/jobs
 * Create a new job posting
 */
export async function POST(request: NextRequest) {
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
        select: { id: true, verificationStatus: true, isSuspended: true },
      });

      if (!employer) {
        return NextResponse.json(
          { success: false, error: 'Employer profile not found' },
          { status: 404 }
        );
      }

      // Check if employer is verified
      if (employer.verificationStatus !== 'APPROVED') {
        return NextResponse.json(
          { success: false, error: 'Employer must be verified before posting jobs' },
          { status: 403 }
        );
      }

      if (employer.isSuspended) {
        return NextResponse.json(
          { success: false, error: 'Suspended employers cannot post jobs' },
          { status: 403 }
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
      } = body;

      if (!title || !description) {
        return NextResponse.json(
          { success: false, error: 'Title and description are required' },
          { status: 400 }
        );
      }

      const job = await prisma.job.create({
        data: {
          employerId: employer.id,
          title,
          description,
          requirements: requirements || null,
          responsibilities: responsibilities || null,
          location: location || null,
          salaryRange: salaryRange || null,
          employmentType: employmentType || 'FULL_TIME',
          category: category || null,
          status: 'PENDING', // Jobs need admin approval
        },
        include: {
          employer: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: job,
        message: 'Job posted successfully. Waiting for admin approval.',
      }, { status: 201 });
    } catch (error) {
      console.error('Error creating job:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create job' },
        { status: 500 }
      );
    }
  });
}

