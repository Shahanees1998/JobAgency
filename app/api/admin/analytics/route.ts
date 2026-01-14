import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const url = new URL(request.url);
      const timeRange = url.searchParams.get('timeRange') || '30';
      const metric = url.searchParams.get('metric') || 'overview';

      // Get analytics data based on time range
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalEmployers,
        totalCandidates,
        totalJobs,
        totalApplications,
        newEmployers,
        newCandidates,
        newJobs,
        newApplications,
      ] = await Promise.all([
        prisma.employer.count({ where: { verificationStatus: { in: ['APPROVED', 'PENDING'] }, isSuspended: false } }),
        prisma.candidate.count(),
        prisma.job.count({ where: { status: { in: ['APPROVED', 'PENDING'] } } }),
        prisma.application.count(),
        prisma.employer.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        prisma.candidate.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        prisma.job.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
        prisma.application.count({
          where: {
            appliedAt: { gte: startDate },
          },
        }),
      ]);

      const analytics = {
        totalEmployers,
        totalCandidates,
        totalJobs,
        totalApplications,
        newEmployers,
        newCandidates,
        newJobs,
        newApplications,
        timeRange: days,
        metric,
      };

      return NextResponse.json({ data: analytics });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }
  });
}
