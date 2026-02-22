import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/employers/[id]/profile-view
 * Record that the current user viewed this employer's profile (e.g. company/reviews page).
 * Employer gets a PROFILE_VIEWED notification (unless the viewer is the employer themselves).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { id: employerId } = await params;
      if (!employerId) {
        return NextResponse.json(
          { success: false, error: 'Employer ID required' },
          { status: 400 }
        );
      }

      const employer = await prisma.employer.findUnique({
        where: { id: employerId },
        select: { userId: true, companyName: true },
      });

      if (!employer) {
        return NextResponse.json(
          { success: false, error: 'Employer not found' },
          { status: 404 }
        );
      }

      if (employer.userId === userId) {
        return NextResponse.json({
          success: true,
          data: { recorded: false, message: 'Own profile view not recorded' },
        });
      }

      await prisma.notification.create({
        data: {
          userId: employer.userId,
          title: 'Profile Viewed',
          message: `Someone viewed your company profile (${employer.companyName}).`,
          type: 'PROFILE_VIEWED',
          relatedId: employerId,
          relatedType: 'EMPLOYER',
        },
      });

      return NextResponse.json({
        success: true,
        data: { recorded: true },
      });
    } catch (error) {
      console.error('Profile view recording error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to record profile view' },
        { status: 500 }
      );
    }
  });
}
