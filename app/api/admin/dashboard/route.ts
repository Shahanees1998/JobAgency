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

      // Get dashboard statistics for job portal
      const [
        totalEmployers,
        totalCandidates,
        totalJobs,
        totalApplications,
        pendingEmployerApprovals,
        pendingJobModerations,
        supportRequests,
      ] = await Promise.all([
        prisma.employer.count({ where: { verificationStatus: { in: ['APPROVED', 'PENDING'] }, isSuspended: false } }),
        prisma.candidate.count(),
        prisma.job.count({ where: { status: { in: ['APPROVED', 'PENDING'] } } }),
        prisma.application.count(),
        prisma.employer.count({ where: { verificationStatus: 'PENDING' } }),
        prisma.job.count({ where: { status: 'PENDING' } }),
        prisma.supportRequest.count({ where: { status: 'OPEN' } }),
      ]);

      // Get recent activity - employers, candidates, jobs, and applications
      const [recentEmployers, recentCandidates, recentJobs, recentApplications] = await Promise.all([
        prisma.employer.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.candidate.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        prisma.job.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            employer: {
              include: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        }),
        prisma.application.findMany({
          take: 5,
          orderBy: { appliedAt: 'desc' },
          include: {
            candidate: {
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
            job: {
              select: {
                title: true,
              },
            },
          },
        }),
      ]);

      // Transform recent activity
      const transformedActivity = [
        ...recentEmployers.map((employer) => ({
          id: employer.id,
          type: 'EMPLOYER_REGISTRATION',
          description: `New employer registered: ${employer.companyName}`,
          timestamp: employer.createdAt.toISOString(),
          user: employer.user.email,
          status: employer.verificationStatus,
        })),
        ...recentCandidates.map((candidate) => ({
          id: candidate.id,
          type: 'CANDIDATE_REGISTRATION',
          description: `New candidate registered: ${candidate.user.firstName} ${candidate.user.lastName}`,
          timestamp: candidate.createdAt.toISOString(),
          user: candidate.user.email,
          status: candidate.isProfileComplete ? 'COMPLETE' : 'INCOMPLETE',
        })),
        ...recentJobs.map((job) => ({
          id: job.id,
          type: 'JOB_POSTED',
          description: `New job posted: ${job.title}`,
          timestamp: job.createdAt.toISOString(),
          user: job.employer.user.email,
          status: job.status,
        })),
        ...recentApplications.map((application) => ({
          id: application.id,
          type: 'APPLICATION_SUBMITTED',
          description: `${application.candidate.user.firstName} ${application.candidate.user.lastName} applied for ${application.job.title}`,
          timestamp: application.appliedAt.toISOString(),
          user: application.candidate.user.email,
          status: application.status,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

      // Get growth data for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyData = [];
      const labels = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const [newEmployers, newCandidates, newJobs, newApplications] = await Promise.all([
          prisma.employer.count({
            where: {
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          }),
          prisma.candidate.count({
            where: {
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          }),
          prisma.job.count({
            where: {
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          }),
          prisma.application.count({
            where: {
              appliedAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          }),
        ]);

        monthlyData.push({ newEmployers, newCandidates, newJobs, newApplications });
        labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      }

      const growthData = {
        labels,
        newEmployers: monthlyData.map(d => d.newEmployers),
        newCandidates: monthlyData.map(d => d.newCandidates),
        newJobs: monthlyData.map(d => d.newJobs),
        newApplications: monthlyData.map(d => d.newApplications),
      };

      return NextResponse.json({
        stats: {
          totalEmployers,
          totalCandidates,
          totalJobs,
          totalApplications,
          pendingEmployerApprovals,
          pendingJobModerations,
          supportRequests,
        },
        recentActivity: transformedActivity,
        growthData,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch dashboard data' },
        { status: 500 }
      );
    }
  });
} 