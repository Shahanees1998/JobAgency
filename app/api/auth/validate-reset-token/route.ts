import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const jwtSecret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '';
    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing NEXTAUTH_SECRET' },
        { status: 500 }
      );
    }
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Check if token is for password reset
    if (decoded.type !== 'password-reset') {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 400 }
      );
    }

    // Find user and check if reset token matches
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        resetToken: true,
        resetTokenExpiry: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if reset token matches and is not expired
    if (!user.resetToken || user.resetToken !== decoded.resetToken) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Token is valid',
      userId: user.id,
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 