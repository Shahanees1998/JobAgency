import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOTPEmail } from '@/lib/emailService';

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone is required' },
        { status: 400 }
      );
    }

    const otp = generateOTP();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10); // OTP valid for 10 minutes

    if (email) {
      // Send OTP to email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Update user with email OTP
      await prisma.user.update({
        where: { email },
        data: {
          emailOtp: otp,
          emailOtpExpiry: expiry,
        },
      });

      // Send OTP via SendGrid
      try {
        await sendOTPEmail(email, otp, user.firstName);
      } catch (emailError) {
        console.error('Failed to send OTP email:', emailError);
        // Log OTP to console for testing
        console.log('========================================');
        console.log('📧 OTP VERIFICATION (Console Log)');
        console.log('========================================');
        console.log(`Email: ${email}`);
        console.log(`Name: ${user.firstName} ${user.lastName || ''}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`OTP Expires: ${expiry.toLocaleString()}`);
        console.log(`Verification Link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verification?email=${encodeURIComponent(email)}&otp=${otp}`);
        console.log('========================================');
        // Don't fail the request if email fails, but log it
        // The OTP is still saved and can be verified
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent to email',
      });
    }

    if (phone) {
      // Send OTP to phone
      const user = await prisma.user.findFirst({
        where: { phone },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Update user with phone OTP
      await prisma.user.update({
        where: { phone },
        data: {
          phoneOtp: otp,
          phoneOtpExpiry: expiry,
        },
      });

      // TODO: Send OTP via SMS service (Twilio, AWS SNS, etc.)
      console.log(`Phone OTP for ${phone}: ${otp}`); // Remove in production

      return NextResponse.json({
        success: true,
        message: 'OTP sent to phone',
        // In production, don't return OTP
        // otp: otp, // Only for development
      });
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Send OTP error:', error);
    
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

