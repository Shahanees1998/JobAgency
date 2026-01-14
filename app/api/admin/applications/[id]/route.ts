import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/applications/[id]
 * Get a single application by ID with full details
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

      const application = await prisma.application.findUnique({
        where: { id },
        include: {
          job: {
            include: {
              employer: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          candidate: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                  profileImage: true,
                },
              },
            },
          },
          chat: {
            include: {
              messages: {
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                  sender: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!application) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      return NextResponse.json({
        data: {
          id: application.id,
          jobId: application.jobId,
          candidateId: application.candidateId,
          status: application.status,
          coverLetter: application.coverLetter,
          appliedAt: application.appliedAt.toISOString(),
          reviewedAt: application.reviewedAt?.toISOString(),
          interviewScheduled: application.interviewScheduled,
          interviewDate: application.interviewDate?.toISOString(),
          interviewLocation: application.interviewLocation,
          interviewNotes: application.interviewNotes,
          rejectionReason: application.rejectionReason,
          createdAt: application.createdAt.toISOString(),
          updatedAt: application.updatedAt.toISOString(),
          job: application.job,
          candidate: application.candidate,
          chat: application.chat,
        },
      });
    } catch (error) {
      console.error('Error fetching application:', error);
      return NextResponse.json(
        { error: 'Failed to fetch application' },
        { status: 500 }
      );
    }
  });
}

