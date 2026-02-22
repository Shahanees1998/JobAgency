import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/employers/profile
 * Get current employer's profile
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check if user is an employer
      if (authenticatedReq.user?.role !== 'EMPLOYER') {
        return NextResponse.json(
          { success: false, error: 'Only employers can access this endpoint' },
          { status: 403 }
        );
      }

      const employer = await prisma.employer.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              profileImage: true,
              status: true,
            },
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
          { success: false, error: 'Employer profile not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: employer.id,
          companyName: employer.companyName,
          companyDescription: employer.companyDescription,
          companyWebsite: employer.companyWebsite,
          companyLogo: employer.companyLogo,
          companyBanner: employer.companyBanner,
          industry: employer.industry,
          companySize: employer.companySize,
          founded: employer.founded,
          revenue: employer.revenue,
          headquarter: employer.headquarter,
          address: employer.address,
          city: employer.city,
          country: employer.country,
          verificationStatus: employer.verificationStatus,
          isSuspended: employer.isSuspended,
          totalJobs: employer._count.jobs,
          createdAt: employer.createdAt.toISOString(),
          updatedAt: employer.updatedAt.toISOString(),
          user: employer.user,
        },
      });
    } catch (error) {
      console.error('Error fetching employer profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch employer profile' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/employers/profile
 * Update employer profile
 */
export async function PUT(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (authenticatedReq.user?.role !== 'EMPLOYER') {
        return NextResponse.json(
          { success: false, error: 'Only employers can access this endpoint' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const {
        companyName,
        companyDescription,
        companyWebsite,
        industry,
        companySize,
        founded,
        revenue,
        headquarter,
        address,
        city,
        country,
      } = body;

      const employer = await prisma.employer.update({
        where: { userId },
        data: {
          ...(companyName && { companyName }),
          ...(companyDescription !== undefined && { companyDescription }),
          ...(companyWebsite !== undefined && { companyWebsite }),
          ...(industry !== undefined && { industry }),
          ...(companySize !== undefined && { companySize }),
          ...(founded !== undefined && { founded }),
          ...(revenue !== undefined && { revenue }),
          ...(headquarter !== undefined && { headquarter }),
          ...(address !== undefined && { address }),
          ...(city !== undefined && { city }),
          ...(country !== undefined && { country }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              profileImage: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: employer,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating employer profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update employer profile' },
        { status: 500 }
      );
    }
  });
}


