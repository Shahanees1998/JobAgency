import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    const user = authenticatedReq.user;
    
    return NextResponse.json({
      success: true,
      message: 'This is a protected route',
      user: {
        id: user?.userId,
        email: user?.email,
        role: user?.role,
      },
    });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    const user = authenticatedReq.user;
    const body = await request.json();
    
    return NextResponse.json({
      success: true,
      message: 'POST request to protected route successful',
      user: {
        id: user?.userId,
        email: user?.email,
        role: user?.role,
      },
      data: body,
    });
  });
} 