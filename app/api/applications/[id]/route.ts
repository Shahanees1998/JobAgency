import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/applications/[id]
 * Get application details (for candidates and employers)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      const userRole = authenticatedReq.user?.role;
      
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
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
                      id: true,
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
        },
      });

      if (!application) {
        return NextResponse.json(
          { success: false, error: 'Application not found' },
          { status: 404 }
        );
      }

      // Verify access permissions
      if (userRole === 'CANDIDATE') {
        // Candidate can only view their own applications
        if (application.candidate.userId !== userId) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 403 }
          );
        }
      } else if (userRole === 'EMPLOYER') {
        // Employer can only view applications for their jobs
        if (application.job.employer.userId !== userId) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 403 }
          );
        }
        // Notify candidate that their application was viewed by the employer
        await prisma.notification.create({
          data: {
            userId: application.candidate.userId,
            title: 'Application Viewed',
            message: `An employer viewed your application for ${application.job.title}.`,
            type: 'APPLICATION_VIEWED',
            relatedId: application.id,
            relatedType: 'APPLICATION',
          },
        });
      } else if (userRole !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
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
          job: {
            id: application.job.id,
            title: application.job.title,
            description: application.job.description,
            location: application.job.location,
            employmentType: application.job.employmentType,
            salaryRange: application.job.salaryRange,
            employer: {
              id: application.job.employer.id,
              companyName: application.job.employer.companyName,
              companyLogo: application.job.employer.companyLogo,
            },
          },
          candidate: {
            id: application.candidate.id,
            cvUrl: application.candidate.cvUrl,
            bio: application.candidate.bio,
            skills: application.candidate.skills,
            experience: application.candidate.experience,
            education: application.candidate.education,
            location: application.candidate.location,
            availability: application.candidate.availability,
            expectedSalary: application.candidate.expectedSalary,
            languages: application.candidate.languages ?? [],
            certifications: application.candidate.certifications ?? [],
            user: application.candidate.user,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching application:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch application' },
        { status: 500 }
      );
    }
  });
}


