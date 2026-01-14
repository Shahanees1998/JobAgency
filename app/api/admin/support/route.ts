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

      const supportRequests = await prisma.supportRequest.findMany({
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
      const transformedRequests = supportRequests.map(request => ({
        id: request.id,
        subject: request.subject,
        message: request.message,
        status: request.status,
        priority: request.priority,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        user: {
          firstName: request.user.firstName,
          lastName: request.user.lastName,
          email: request.user.email,
          role: request.user.role,
        },
        adminResponse: request.adminResponse,
      }));

      return NextResponse.json({ data: transformedRequests });
    } catch (error) {
      console.error('Error fetching support requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch support requests' },
        { status: 500 }
      );
    }
  });
}