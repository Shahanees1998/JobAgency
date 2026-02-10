import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOTPEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
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
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate 6-digit OTP for password reset
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store reset token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: otp,
        resetTokenExpiry,
      },
    });

    // Send OTP email (fallback: return OTP in response for dev/testing)
    let emailSent = false;
    try {
      await sendOTPEmail(user.email, otp, user.firstName);
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset code has been sent.',
      ...(process.env.NODE_ENV !== 'production' && {
        data: {
          debugOtp: otp,
          // For quick troubleshooting/testing on mobile when email isn't delivered
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
