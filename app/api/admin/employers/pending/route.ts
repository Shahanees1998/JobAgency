import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/employers/pending
 * Get pending employer approvals with server-side pagination and search
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

      // Base where: only PENDING, not suspended
      const where: any = {
        verificationStatus: 'PENDING',
        isSuspended: false,
      };

      if (search && search.trim() !== '') {
        where.OR = [
          { companyName: { contains: search, mode: 'insensitive' } },
          { industry: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { country: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const skip = (page - 1) * limit;

      const [employers, total] = await Promise.all([
        prisma.employer.findMany({
          where,
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
          skip,
          take: limit,
        }),
        prisma.employer.count({ where }),
      ]);

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

      return NextResponse.json({
        data: transformedEmployers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching pending employers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pending employers' },
        { status: 500 }
      );
    }
  });
}

