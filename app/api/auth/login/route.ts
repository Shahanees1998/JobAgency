import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, password, googleToken } = body;

    // Google OAuth login
    if (googleToken) {
      // TODO: Verify Google token with Google API
      // For now, return error - implement Google OAuth verification
      return NextResponse.json(
        { error: 'Google login not yet implemented. Please use email/phone and password.' },
        { status: 501 }
      );
    }

    // Validate input - email or phone required
    const identifier = email || phone;
    if (!identifier || !password) {
      console.log('❌ [API /auth/login] Missing credentials');
      return NextResponse.json(
        { error: 'Email/phone and password are required' },
        { status: 400 }
      );
    }

    console.log('🔐 [API /auth/login] Calling authenticateUser with:', {
      identifier,
      hasPassword: !!password,
      passwordLength: password.length,
    });

    // Authenticate user (supports both email and phone)
    const { accessToken, refreshToken } = await AuthService.authenticateUser({
      email: identifier, // AuthService handles both email and phone
      password,
    });
    
    console.log('✅ [API /auth/login] Authentication successful, tokens generated');

    // Get user details for response
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
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

    // Check if user exists and is ADMIN (only ADMIN can login to admin panel)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials or unauthorized access' },
        { status: 403 }
      );
    }
    
    // Only ADMIN users can login to the admin panel
    if (user.role !== 'ADMIN') {
      console.log('❌ [API /auth/login] Non-ADMIN user attempted login:', {
        email: user.email,
        role: user.role,
      });
      return NextResponse.json(
        { error: 'Only admin users can access this panel. Please contact administrator.' },
        { status: 403 }
      );
    }
    // Create response with token for mobile apps
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      accessToken, // Include token for mobile apps
      refreshToken, // Include refresh token for mobile apps
      user: {
        id: user?.id,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        phone: user?.phone,
        role: user?.role,
        status: user?.status,
        profileImage: user?.profileImage,
        profileImagePublicId: user?.profileImagePublicId,
        lastLogin: user?.lastLogin,
        createdAt: user?.createdAt,
        updatedAt: user?.updatedAt,
      },
    });
    const isProd = process.env.NODE_ENV === 'production';
    
    // Set authentication cookies for all web logins
    // In development (localhost), use secure: false and sameSite: 'lax'
    // In production, use secure: true and sameSite: 'none' (for cross-site)
    console.log('🍪 [API /auth/login] Setting cookies:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length,
      refreshTokenLength: refreshToken?.length,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      environment: isProd ? 'production' : 'development',
    });
    
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: isProd, // true in production, false in development
      sameSite: isProd ? 'none' : 'lax', // 'none' for production (cross-site), 'lax' for localhost
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd, // true in production, false in development
      sameSite: isProd ? 'none' : 'lax', // 'none' for production (cross-site), 'lax' for localhost
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    });
    
    // Verify cookies were set
    const setCookies = response.cookies.getAll();
    console.log('🍪 [API /auth/login] Cookies in response:', {
      total: setCookies.length,
      cookieNames: setCookies.map(c => c.name),
      hasAccessToken: !!response.cookies.get('access_token'),
      hasRefreshToken: !!response.cookies.get('refresh_token'),
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 