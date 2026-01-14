import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { googleToken, googleId, email, firstName, lastName, phone } = body;

    if (!googleToken || !googleId) {
      return NextResponse.json(
        { error: 'Google token and Google ID are required' },
        { status: 400 }
      );
    }

    // TODO: Verify Google token with Google API
    // For now, we'll trust the client (NOT PRODUCTION READY)
    // In production, verify token with: https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=TOKEN

    // Check if user exists with Google ID
    let user = await prisma.user.findUnique({
      where: { googleId },
    });

    // If user doesn't exist, create new user
    if (!user) {
      // Check if email already exists
      if (email) {
        const existingEmailUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingEmailUser) {
          // Link Google account to existing user
          user = await prisma.user.update({
            where: { email },
            data: {
              googleId,
              emailVerified: true,
            },
          });
        }
      }

      // Create new user if still doesn't exist
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: email || `google_${googleId}@temp.com`,
            password: await bcrypt.hash(Math.random().toString(36), 10), // Random password
            firstName: firstName || 'User',
            lastName: lastName || '',
            phone: phone || null,
            googleId,
            emailVerified: email ? true : false,
            role: 'CANDIDATE', // Default role
            status: 'ACTIVE',
            isPasswordChanged: false,
          },
        });
      }
    }

    // Generate tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      profileImage: user.profileImage || undefined,
      profileImagePublicId: user.profileImagePublicId || undefined,
      phone: user.phone || undefined,
      lastLogin: user.lastLogin || undefined,
      createdAt: user.createdAt || undefined,
      updatedAt: user.updatedAt || undefined,
    };

    const [accessToken, refreshToken] = await Promise.all([
      AuthService.generateAccessToken(payload),
      AuthService.generateRefreshToken(payload),
    ]);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Google login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage,
        profileImagePublicId: user.profileImagePublicId,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });

    const isProd = process.env.NODE_ENV === 'production';
    
    // Set authentication cookies
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google login error:', error);
    
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

