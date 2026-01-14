import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/employers/pending
 * Get all pending employer approvals
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const employers = await prisma.employer.findMany({
        where: {
          verificationStatus: 'PENDING',
          isSuspended: false,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' }, // Oldest first
      });

      const transformedEmployers = employers.map(employer => ({
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
        createdAt: employer.createdAt.toISOString(),
        user: {
          id: employer.user.id,
          firstName: employer.user.firstName,
          lastName: employer.user.lastName,
          email: employer.user.email,
          phone: employer.user.phone,
          status: employer.user.status,
          createdAt: employer.user.createdAt.toISOString(),
        },
      }));

      return NextResponse.json({ data: transformedEmployers });
    } catch (error) {
      console.error('Error fetching pending employers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pending employers' },
        { status: 500 }
      );
    }
  });
}

