import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/admin/employers/[id]/suspend
 * Suspend an employer and log the action
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
      const { reason } = body;

      if (!reason) {
        return NextResponse.json(
          { error: 'Suspension reason is required' },
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
          isSuspended: true,
          suspensionReason: reason,
          suspendedAt: new Date(),
          suspendedById: authenticatedReq.user?.userId,
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

      // Update user status to SUSPENDED
      await prisma.user.update({
        where: { id: employer.userId },
        data: { status: 'SUSPENDED' },
      });

      // Suspend all active jobs from this employer
      await prisma.job.updateMany({
        where: {
          employerId: id,
          status: { in: ['APPROVED', 'PENDING'] },
        },
        data: {
          status: 'SUSPENDED',
        },
      });

      // Log admin action
      await prisma.adminLog.create({
        data: {
          adminId: authenticatedReq.user?.userId!,
          action: 'EMPLOYER_SUSPENDED',
          entityType: 'EMPLOYER',
          entityId: id,
          description: `Suspended employer: ${employer.companyName}`,
          metadata: JSON.stringify({ reason }),
        },
      });

      // TODO: Send notification to employer
      // await createNotification(...)

      return NextResponse.json({
        data: {
          id: updatedEmployer.id,
          companyName: updatedEmployer.companyName,
          isSuspended: updatedEmployer.isSuspended,
          suspendedAt: updatedEmployer.suspendedAt?.toISOString(),
        },
        message: 'Employer suspended successfully',
      });
    } catch (error) {
      console.error('Error suspending employer:', error);
      return NextResponse.json(
        { error: 'Failed to suspend employer' },
        { status: 500 }
      );
    }
  });
}

