import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const escalations = await prisma.adminEscalation.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Transform the data to match the expected interface
      const transformedEscalations = escalations.map(escalation => ({
        id: escalation.id,
        subject: escalation.subject,
        message: escalation.message,
        status: escalation.status,
        priority: escalation.priority,
        userRole: escalation.user.role,
        userName: `${escalation.user.firstName} ${escalation.user.lastName}`,
        userEmail: escalation.user.email,
        createdAt: escalation.createdAt.toISOString(),
        updatedAt: escalation.updatedAt.toISOString(),
        adminResponse: escalation.adminResponse,
      }));

      return NextResponse.json({ data: transformedEscalations });
    } catch (error) {
      console.error('Error fetching escalations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch escalations' },
        { status: 500 }
      );
    }
  });
}
