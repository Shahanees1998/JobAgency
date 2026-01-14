import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// GET /api/support - Get user's support requests
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const skip = (page - 1) * limit;
      
      // Use the authenticated user's ID
      const userId = authenticatedReq.user!.userId;
      
      const [supportRequests, total] = await Promise.all([
        prisma.supportRequest.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.supportRequest.count({ where: { userId } }),
      ]);
      return NextResponse.json({
        supportRequests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get support requests error:', error);
      return NextResponse.json({ error: 'Failed to fetch support requests' }, { status: 500 });
    }
  });
}

// POST /api/support - Submit support request
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { subject, message, priority = 'MEDIUM' } = await request.json();
      
      if (!subject || !message) {
        return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
      }
      
      // Use the authenticated user's ID
      const userId = authenticatedReq.user!.userId;
      
      const supportRequest = await prisma.supportRequest.create({
        data: {
          userId,
          subject,
          message,
          priority,
        },
      });
      return NextResponse.json(supportRequest, { status: 201 });
    } catch (error) {
      console.error('Submit support request error:', error);
      return NextResponse.json({ error: 'Failed to submit support request' }, { status: 500 });
    }
  });
} 