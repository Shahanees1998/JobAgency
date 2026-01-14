import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    const user = authenticatedReq.user;
    
    return NextResponse.json({
      success: true,
      message: 'This is an admin-only protected route',
      user: {
        id: user?.userId,
        email: user?.email,
        role: user?.role,
        firstName: user?.firstName,
        lastName: user?.lastName,
      },
    });
  });
}

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    const user = authenticatedReq.user;
    const body = await request.json();
    
    return NextResponse.json({
      success: true,
      message: 'POST request to admin-only route successful',
      user: {
        id: user?.userId,
        email: user?.email,
        role: user?.role,
        firstName: user?.firstName,
        lastName: user?.lastName,
      },
      data: body,
    });
  });
} 