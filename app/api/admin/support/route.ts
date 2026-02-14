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

      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');
      const statusParam = searchParams.get('status');
      const priorityParam = searchParams.get('priority');
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

      const where: any = {};
      if (statusParam && statusParam.trim() !== '') where.status = statusParam;
      if (priorityParam && priorityParam.trim() !== '') where.priority = priorityParam;
      if (search && search.trim() !== '') {
        where.OR = [
          { subject: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const skip = (page - 1) * limit;

      const [supportRequests, total] = await Promise.all([
        prisma.supportRequest.findMany({
        where,
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
        skip,
        take: limit,
      }),
        prisma.supportRequest.count({ where }),
      ]);

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

      return NextResponse.json({
        data: transformedRequests,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Error fetching support requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch support requests' },
        { status: 500 }
      );
    }
  });
}