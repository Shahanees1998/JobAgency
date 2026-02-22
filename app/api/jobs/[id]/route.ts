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

      const reviewStats = await prisma.companyReview.aggregate({
        where: { employerId: job.employer.id },
        _avg: { rating: true },
        _count: true,
      });
      const averageRating = reviewStats._avg.rating != null ? Math.round(reviewStats._avg.rating * 10) / 10 : null;
      const reviewCount = reviewStats._count ?? 0;

      // For authenticated candidates, include hasApplied and saved
      let hasApplied = false;
      let saved = false;
      const authUser = authenticatedReq.user;
      if (authUser?.userId && authUser?.role === 'CANDIDATE') {
        const candidate = await prisma.candidate.findUnique({
          where: { userId: authUser.userId },
          select: { id: true },
        });
        if (candidate) {
          const [application, savedJob] = await Promise.all([
            prisma.application.findUnique({
              where: {
                jobId_candidateId: { jobId: id, candidateId: candidate.id },
              },
              select: { id: true },
            }),
            prisma.savedJob.findUnique({
              where: {
                candidateId_jobId: { candidateId: candidate.id, jobId: id },
              },
              select: { id: true },
            }),
          ]);
          hasApplied = !!application;
          saved = !!savedJob;
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          id: job.id,
          title: job.title,
          hasApplied,
          saved,
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
            companyBanner: job.employer.companyBanner,
            companyWebsite: job.employer.companyWebsite,
            industry: job.employer.industry,
            companySize: job.employer.companySize,
            address: job.employer.address,
            city: job.employer.city,
            country: job.employer.country,
            averageRating,
            reviewCount,
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


