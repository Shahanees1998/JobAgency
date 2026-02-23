import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { sendOTPEmail, sendPasswordResetEmail } from '@/lib/emailService';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    const { email, sendLink } = await request.json();
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
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
        success: true,
        message: sendLink
          ? 'If an account with that email exists, a password reset link has been sent.'
          : 'If an account with that email exists, a password reset code has been sent.',
      });
    }

    if (sendLink === true) {
      // Admin / web: send reset link email
      if (!JWT_SECRET) {
        return NextResponse.json(
          { success: false, error: 'Server misconfiguration: NEXTAUTH_SECRET required for reset link' },
          { status: 500 }
        );
      }
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });
      const token = jwt.sign(
        { userId: user.id, resetToken, type: 'password-reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      try {
        await sendPasswordResetEmail(user.email, token, user.firstName);
      } catch (emailError) {
        console.error('Failed to send password reset link:', emailError);
      }
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Mobile: send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: otp, resetTokenExpiry },
    });
    let emailSent = false;
    try {
      await sendOTPEmail(user.email, otp, user.firstName);
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send password reset OTP:', emailError);
    }
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset code has been sent.',
      ...(process.env.NODE_ENV !== 'production' && {
        data: {
          debugOtp: otp,
          debugEmailSent: emailSent,
        },
      }),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
