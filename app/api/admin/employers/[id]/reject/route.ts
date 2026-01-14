import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/admin/employers/[id]/reject
 * Reject an employer and log the action
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
      const { reason, notes } = body;

      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        );
      }

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
          verificationStatus: 'REJECTED',
          verificationNotes: notes || reason,
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

      // Update user status to INACTIVE
      await prisma.user.update({
        where: { id: employer.userId },
        data: { status: 'INACTIVE' },
      });

      // Log admin action
      await prisma.adminLog.create({
        data: {
          adminId: authenticatedReq.user?.userId!,
          action: 'EMPLOYER_REJECTED',
          entityType: 'EMPLOYER',
          entityId: id,
          description: `Rejected employer: ${employer.companyName}`,
          metadata: JSON.stringify({ reason, notes }),
        },
      });

      // TODO: Send notification to employer
      // await createNotification(...)

      return NextResponse.json({
        data: {
          id: updatedEmployer.id,
          companyName: updatedEmployer.companyName,
          verificationStatus: updatedEmployer.verificationStatus,
        },
        message: 'Employer rejected successfully',
      });
    } catch (error) {
      console.error('Error rejecting employer:', error);
      return NextResponse.json(
        { error: 'Failed to reject employer' },
        { status: 500 }
      );
    }
  });
}

