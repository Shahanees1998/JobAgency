import { NextRequest, NextResponse } from 'next/server';
import { withOptionalAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  console.log('📡 [API /auth/me] Request received');
  
  return withOptionalAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    const user = authenticatedReq.user;
    const cookies = request.cookies.getAll();
    
    console.log('📡 [API /auth/me] Processing:', {
      hasUser: !!user,
      userId: user?.userId,
      cookieNames: cookies.map(c => c.name),
      hasAccessToken: !!request.cookies.get('access_token'),
    });
    
    // If no user in token, return null (not authenticated)
    if (!user) {
      console.log('📡 [API /auth/me] No user, returning null');
      return NextResponse.json({
        success: false,
        data: null,
        user: null,
      });
    }

    // Fetch complete user data from database to include all fields
    const completeUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        location: true,
        role: true,
        status: true,
        profileImage: true,
        profileImagePublicId: true,
        lastLogin: true,
        isPasswordChanged: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!completeUser) {
      console.log('📡 [API /auth/me] User not found in database');
      return NextResponse.json({
        success: false,
        data: null,
        user: null,
      });
    }

    console.log('📡 [API /auth/me] Returning user:', {
      id: completeUser.id,
      email: completeUser.email,
      role: completeUser.role,
    });

    // Return { success, data } so mobile app getCurrentUser() gets response.data = user
    return NextResponse.json({
      success: true,
      data: completeUser,
      user: completeUser, // keep for backward compatibility
    });
  });
} 