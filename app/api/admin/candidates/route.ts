import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/candidates
 * Get all candidates with optional filtering
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
      const isProfileComplete = searchParams.get('isProfileComplete');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      // Build where clause for filtering
      const where: any = {};
      
      if (isProfileComplete !== null && isProfileComplete !== undefined) {
        where.isProfileComplete = isProfileComplete === 'true';
      }
      
      if (search) {
        where.OR = [
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { skills: { has: search } },
          { bio: { contains: search, mode: 'insensitive' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [candidates, total] = await Promise.all([
        prisma.candidate.findMany({
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
        prisma.candidate.count({ where }),
      ]);

      // Transform the data
      const transformedCandidates = candidates.map(candidate => ({
        id: candidate.id,
        userId: candidate.userId,
        cvUrl: candidate.cvUrl,
        bio: candidate.bio,
        skills: candidate.skills,
        experience: candidate.experience,
        education: candidate.education,
        location: candidate.location,
        availability: candidate.availability,
        expectedSalary: candidate.expectedSalary,
        isProfileComplete: candidate.isProfileComplete,
        totalApplications: candidate._count.applications,
        createdAt: candidate.createdAt.toISOString(),
        updatedAt: candidate.updatedAt.toISOString(),
        user: {
          id: candidate.user.id,
          firstName: candidate.user.firstName,
          lastName: candidate.user.lastName,
          email: candidate.user.email,
          phone: candidate.user.phone,
          status: candidate.user.status,
          createdAt: candidate.user.createdAt.toISOString(),
        },
      }));

      return NextResponse.json({
        data: transformedCandidates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching candidates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch candidates' },
        { status: 500 }
      );
    }
  });
}

