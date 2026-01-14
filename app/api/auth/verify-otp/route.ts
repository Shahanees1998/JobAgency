import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, otp } = body;

    if ((!email && !phone) || !otp) {
      return NextResponse.json(
        { error: 'Email/phone and OTP are required' },
        { status: 400 }
      );
    }

    const where = email ? { email } : { phone };
    const user = await prisma.user.findFirst({
      where,
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check OTP
    const storedOtp = email ? user.emailOtp : user.phoneOtp;
    const otpExpiry = email ? user.emailOtpExpiry : user.phoneOtpExpiry;

    if (!storedOtp || !otpExpiry) {
      return NextResponse.json(
        { error: 'OTP not found. Please request a new OTP.' },
        { status: 400 }
      );
    }

    if (storedOtp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      );
    }

    if (new Date() > otpExpiry) {
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new OTP.' },
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
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

