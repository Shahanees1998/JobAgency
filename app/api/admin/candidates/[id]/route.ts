import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/candidates/[id]
 * Get a single candidate by ID with full details
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

      const candidate = await prisma.candidate.findUnique({
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
          applications: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  employer: {
                    select: {
                      companyName: true,
                    },
                  },
                },
              },
            },
            orderBy: { appliedAt: 'desc' },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      });

      if (!candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }

      return NextResponse.json({
        data: {
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
          user: candidate.user,
          applications: candidate.applications.map(app => ({
            id: app.id,
            status: app.status,
            appliedAt: app.appliedAt.toISOString(),
            job: app.job,
          })),
        },
      });
    } catch (error) {
      console.error('Error fetching candidate:', error);
      return NextResponse.json(
        { error: 'Failed to fetch candidate' },
        { status: 500 }
      );
    }
  });
}

