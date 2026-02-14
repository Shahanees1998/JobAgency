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

      const [escalations, total] = await Promise.all([
        prisma.adminEscalation.findMany({
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
        prisma.adminEscalation.count({ where }),
      ]);

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

      return NextResponse.json({
        data: transformedEscalations,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Error fetching escalations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch escalations' },
        { status: 500 }
      );
    }
  });
}
