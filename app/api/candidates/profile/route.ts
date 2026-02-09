import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/candidates/profile
 * Get current candidate's profile
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

      // Check if user is a candidate
      if (authenticatedReq.user?.role !== 'CANDIDATE') {
        return NextResponse.json(
          { success: false, error: 'Only candidates can access this endpoint' },
          { status: 403 }
        );
      }

      let candidate = await prisma.candidate.findUnique({
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
              applications: true,
            },
          },
        },
      });

      // Create candidate profile if missing (e.g. user registered before we added auto-creation)
      if (!candidate) {
        candidate = await prisma.candidate.create({
          data: { userId },
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
              select: { applications: true },
            },
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: candidate.id,
          cvUrl: candidate.cvUrl,
          bio: candidate.bio,
          skills: candidate.skills,
          experience: candidate.experience,
          education: candidate.education,
          location: candidate.location,
          availability: candidate.availability,
          expectedSalary: candidate.expectedSalary,
          languages: candidate.languages ?? [],
          certifications: candidate.certifications ?? [],
          isProfileComplete: candidate.isProfileComplete,
          totalApplications: candidate._count.applications,
          createdAt: candidate.createdAt.toISOString(),
          updatedAt: candidate.updatedAt.toISOString(),
          user: candidate.user,
        },
      });
    } catch (error) {
      console.error('Error fetching candidate profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch candidate profile' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/candidates/profile
 * Update candidate profile
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

      if (authenticatedReq.user?.role !== 'CANDIDATE') {
        return NextResponse.json(
          { success: false, error: 'Only candidates can access this endpoint' },
          { status: 403 }
        );
      }

      const body = await request.json();
      const {
        bio,
        skills,
        experience,
        education,
        location,
        availability,
        expectedSalary,
        languages,
        certifications,
      } = body;

      // Check if profile is complete (has CV and basic info)
      const candidate = await prisma.candidate.findUnique({
        where: { userId },
        select: { cvUrl: true },
      });

      const isProfileComplete = !!(
        candidate?.cvUrl &&
        bio &&
        skills &&
        skills.length > 0
      );

      const updatedCandidate = await prisma.candidate.update({
        where: { userId },
        data: {
          ...(bio !== undefined && { bio }),
          ...(skills !== undefined && { skills }),
          ...(experience !== undefined && { experience }),
          ...(education !== undefined && { education }),
          ...(location !== undefined && { location }),
          ...(availability !== undefined && { availability }),
          ...(expectedSalary !== undefined && { expectedSalary }),
          ...(languages !== undefined && { languages: Array.isArray(languages) ? languages : [] }),
          ...(certifications !== undefined && { certifications: Array.isArray(certifications) ? certifications : [] }),
          isProfileComplete,
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
        data: updatedCandidate,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating candidate profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update candidate profile' },
        { status: 500 }
      );
    }
  });
}


