import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/employers/jobs/[jobId]/applications/[applicationId]
 * Update application status (approve/reject)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { jobId: string; applicationId: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId || authenticatedReq.user?.role !== 'EMPLOYER') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const { jobId, applicationId } = params;

      // Verify the job belongs to this employer
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          employer: {
            where: { userId },
          },
        },
      });

      if (!job || !job.employer) {
        return NextResponse.json(
          { success: false, error: 'Job not found or unauthorized' },
          { status: 404 }
        );
      }

      const body = await request.json();
      const { status, notes } = body;

      if (!status || !['APPROVED', 'REJECTED', 'REVIEWING'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }

      // Get the application
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          candidate: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!application || application.jobId !== jobId) {
        return NextResponse.json(
          { success: false, error: 'Application not found' },
          { status: 404 }
        );
      }

      // Update application
      const updatedApplication = await prisma.application.update({
        where: { id: applicationId },
        data: {
          status,
          reviewedAt: new Date(),
          reviewedById: userId,
          ...(notes && { rejectionReason: notes }),
        },
        include: {
          candidate: {
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
          },
          job: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // If approved, create/activate chat
      if (status === 'APPROVED') {
        // Check if chat already exists
        let chat = await prisma.chat.findUnique({
          where: { applicationId },
        });

        if (!chat) {
          // Create chat
          chat = await prisma.chat.create({
            data: {
              applicationId,
              isActive: true,
            },
          });

          // Create chat participants
          await prisma.chatParticipant.createMany({
            data: [
              {
                chatId: chat.id,
                userId: application.candidate.userId,
                candidateId: application.candidateId,
              },
              {
                chatId: chat.id,
                userId: userId,
                employerId: job.employerId,
              },
            ],
          });
        } else {
          // Activate existing chat
          await prisma.chat.update({
            where: { id: chat.id },
            data: { isActive: true },
          });
        }

        // Create notification for candidate
        await prisma.notification.create({
          data: {
            userId: application.candidate.userId,
            title: 'Application Approved',
            message: `Your application for ${job.title} has been approved! You can now chat with the employer.`,
            type: 'APPLICATION_APPROVED',
            relatedId: applicationId,
            relatedType: 'APPLICATION',
          },
        });
      } else if (status === 'REJECTED') {
        // Create notification for candidate
        await prisma.notification.create({
          data: {
            userId: application.candidate.userId,
            title: 'Application Rejected',
            message: `Your application for ${job.title} has been rejected.`,
            type: 'APPLICATION_REJECTED',
            relatedId: applicationId,
            relatedType: 'APPLICATION',
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: updatedApplication,
        message: 'Application status updated successfully',
      });
    } catch (error) {
      console.error('Error updating application:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update application' },
        { status: 500 }
      );
    }
  });
}

