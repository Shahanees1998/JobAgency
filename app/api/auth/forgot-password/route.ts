import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendPasswordResetEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Create JWT token for the reset link
    const jwtToken = jwt.sign(
      { 
        userId: user.id, 
        resetToken,
        type: 'password-reset'
      },
      '6ac1ce8466e02c6383fb70103b51cdffd9cb3394970606ef0b2e2835afe77a7e',
        // process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${jwtToken}`;

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, jwtToken, user.firstName);
      console.log(`Password reset email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      
      // Log reset link to console for testing
      console.log('========================================');
      console.log('🔐 PASSWORD RESET (Console Log)');
      console.log('========================================');
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.firstName} ${user.lastName || ''}`);
      console.log(`Reset Token: ${jwtToken}`);
      console.log(`Reset Link: ${resetUrl}`);
      console.log(`Expires: ${resetTokenExpiry.toLocaleString()}`);
      console.log('========================================');
      
      // Don't clear the token - allow testing with console link
      // The token is still valid and can be used
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
