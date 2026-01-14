import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/employers/[id]
 * Get a single employer by ID with full details (admin only)
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

      const employer = await prisma.employer.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
              profileImage: true,
              createdAt: true,
            },
          },
          jobs: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              jobs: true,
            },
          },
        },
      });

      if (!employer) {
        return NextResponse.json(
          { error: 'Employer not found' },
          { status: 404 }
        );
      }

      // Transform the data
      return NextResponse.json({
        data: {
          id: employer.id,
          userId: employer.userId,
          companyName: employer.companyName,
          companyDescription: employer.companyDescription,
          companyWebsite: employer.companyWebsite,
          companyLogo: employer.companyLogo,
          industry: employer.industry,
          companySize: employer.companySize,
          address: employer.address,
          city: employer.city,
          country: employer.country,
          verificationStatus: employer.verificationStatus,
          verificationNotes: employer.verificationNotes,
          verifiedAt: employer.verifiedAt?.toISOString(),
          isSuspended: employer.isSuspended,
          suspensionReason: employer.suspensionReason,
          suspendedAt: employer.suspendedAt?.toISOString(),
          totalJobs: employer._count.jobs,
          createdAt: employer.createdAt.toISOString(),
          updatedAt: employer.updatedAt.toISOString(),
          user: employer.user,
          recentJobs: employer.jobs,
        },
      });
    } catch (error) {
      console.error('Error fetching employer:', error);
      return NextResponse.json(
        { error: 'Failed to fetch employer' },
        { status: 500 }
      );
    }
  });
}

