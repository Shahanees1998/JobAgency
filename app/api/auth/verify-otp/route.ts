import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const RESET_JWT_SECRET =
  '6ac1ce8466e02c6383fb70103b51cdffd9cb3394970606ef0b2e2835afe77a7e';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, otp } = body;

    if ((!email && !phone) || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email/phone and OTP are required' },
        { status: 400 }
      );
    }

    const where = email ? { email } : { phone };
    const user = await prisma.user.findFirst({
      where,
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Password reset OTP flow:
    // If resetToken matches, issue a short-lived JWT to be used on /api/auth/reset-password
    if (email && user.resetToken && user.resetTokenExpiry) {
      if (user.resetToken !== otp) {
        return NextResponse.json({ success: false, error: 'Invalid OTP' }, { status: 400 });
      }
      if (new Date() > user.resetTokenExpiry) {
        return NextResponse.json({ success: false, error: 'OTP has expired. Please request a new code.' }, { status: 400 });
      }

      const token = jwt.sign(
        { userId: user.id, resetToken: user.resetToken, type: 'password-reset' },
        RESET_JWT_SECRET,
        { expiresIn: '1h' }
      );

      return NextResponse.json({
        success: true,
        message: 'OTP verified',
        data: { token },
      });
    }

    // Check OTP
    const storedOtp = email ? user.emailOtp : user.phoneOtp;
    const otpExpiry = email ? user.emailOtpExpiry : user.phoneOtpExpiry;

    if (!storedOtp || !otpExpiry) {
      return NextResponse.json(
        { success: false, error: 'OTP not found. Please request a new OTP.' },
        { status: 400 }
      );
    }

    if (storedOtp !== otp) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP' },
        { status: 400 }
      );
    }

    if (new Date() > otpExpiry) {
      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // Verify email or phone
    const updateData: any = {
      emailOtp: null,
      emailOtpExpiry: null,
      phoneOtp: null,
      phoneOtpExpiry: null,
    };

    if (email) {
      updateData.emailVerified = true;
    } else {
      updateData.phoneVerified = true;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: email ? 'Email verified successfully' : 'Phone verified successfully',
      verified: true,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

