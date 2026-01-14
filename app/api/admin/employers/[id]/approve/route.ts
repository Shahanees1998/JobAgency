import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/admin/employers/[id]/approve
 * Approve an employer and log the action
 */
export async function PUT(
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
      const body = await request.json();
      const { notes } = body;

      // Get employer
      const employer = await prisma.employer.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!employer) {
        return NextResponse.json({ error: 'Employer not found' }, { status: 404 });
      }

      // Update employer status
      const updatedEmployer = await prisma.employer.update({
        where: { id },
        data: {
          verificationStatus: 'APPROVED',
          verificationNotes: notes || null,
          verifiedAt: new Date(),
          verifiedById: authenticatedReq.user?.userId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Update user status to ACTIVE
      await prisma.user.update({
        where: { id: employer.userId },
        data: { status: 'ACTIVE' },
      });

      // Log admin action
      await prisma.adminLog.create({
        data: {
          adminId: authenticatedReq.user?.userId!,
          action: 'EMPLOYER_APPROVED',
          entityType: 'EMPLOYER',
          entityId: id,
          description: `Approved employer: ${employer.companyName}`,
          metadata: JSON.stringify({ notes }),
        },
      });

      // TODO: Send notification to employer
      // await createNotification(...)

      return NextResponse.json({
        data: {
          id: updatedEmployer.id,
          companyName: updatedEmployer.companyName,
          verificationStatus: updatedEmployer.verificationStatus,
          verifiedAt: updatedEmployer.verifiedAt?.toISOString(),
        },
        message: 'Employer approved successfully',
      });
    } catch (error) {
      console.error('Error approving employer:', error);
      return NextResponse.json(
        { error: 'Failed to approve employer' },
        { status: 500 }
      );
    }
  });
}

