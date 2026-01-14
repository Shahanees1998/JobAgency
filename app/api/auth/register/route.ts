import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail, sendOTPEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, phone, role, googleToken, googleId } = body;

    // Validate input - email or phone required
    if (!firstName || !lastName || (!email && !phone)) {
      return NextResponse.json(
        { error: 'First name, last name, and email or phone are required' },
        { status: 400 }
      );
    }

    // Google OAuth registration
    if (googleToken && googleId) {
      // TODO: Verify Google token with Google API
      // For now, create user with Google ID
      const existingGoogleUser = await prisma.user.findUnique({
        where: { googleId },
      });

      if (existingGoogleUser) {
        return NextResponse.json(
          { error: 'User with this Google account already exists' },
          { status: 409 }
        );
      }

      // Check if email already exists
      if (email) {
        const existingEmailUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingEmailUser) {
          return NextResponse.json(
            { error: 'User with this email already exists' },
            { status: 409 }
          );
        }
      }

      // Create user with Google account (no password required)
      const user = await prisma.user.create({
        data: {
          email: email || `google_${googleId}@temp.com`, // Temporary email if not provided
          password: await bcrypt.hash(Math.random().toString(36), 10), // Random password
          firstName,
          lastName,
          phone: phone || null,
          googleId,
          emailVerified: email ? true : false,
          role: role === 'EMPLOYER' || role === 'CANDIDATE' ? role : 'CANDIDATE',
          status: role === 'EMPLOYER' ? 'PENDING' : 'ACTIVE',
          isPasswordChanged: false, // User needs to set password
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Registration successful with Google account.',
        user,
      }, { status: 201 });
    }

    // Regular registration with email or phone
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required for email/phone registration' },
        { status: 400 }
      );
    }

    // Check if user already exists by email
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Check if user already exists by phone
    if (phone) {
      const existingPhoneUser = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhoneUser) {
        return NextResponse.json(
          { error: 'User with this phone already exists' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate role (must be EMPLOYER or CANDIDATE)
    const validRole = role === 'EMPLOYER' || role === 'CANDIDATE' ? role : 'CANDIDATE';
    
    // Generate OTP for email verification if email provided
    let emailOtp: string | null = null;
    let emailOtpExpiry: Date | null = null;
    
    if (email && !email.includes('@temp.com')) {
      emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
      emailOtpExpiry = new Date();
      emailOtpExpiry.setMinutes(emailOtpExpiry.getMinutes() + 10);
    }

    // Create user (email/phone verification will be done via OTP)
    const user = await prisma.user.create({
      data: {
        email: email || `phone_${phone}@temp.com`, // Temporary email if only phone provided
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role: validRole,
        status: validRole === 'EMPLOYER' ? 'PENDING' : 'ACTIVE',
        emailVerified: false,
        phoneVerified: false,
        emailOtp: emailOtp,
        emailOtpExpiry: emailOtpExpiry,
        isPasswordChanged: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Send welcome email and OTP if email is provided
    if (email && !email.includes('@temp.com') && emailOtp) {
      try {
        // Send welcome email
        await sendWelcomeEmail(email, firstName, validRole);
        
        // Send OTP email
        await sendOTPEmail(email, emailOtp, firstName);
      } catch (emailError) {
        console.error('Failed to send welcome/OTP email:', emailError);
        // Log OTP to console for testing
        console.log('========================================');
        console.log('📧 EMAIL VERIFICATION (Console Log)');
        console.log('========================================');
        console.log(`Email: ${email}`);
        console.log(`Name: ${firstName} ${lastName}`);
        console.log(`OTP Code: ${emailOtp}`);
        console.log(`OTP Expires: ${emailOtpExpiry?.toLocaleString()}`);
        console.log(`Verification Link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verification?email=${encodeURIComponent(email)}&otp=${emailOtp}`);
        console.log('========================================');
        // Don't fail registration if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: email 
        ? 'Registration successful. Please check your email for verification code.'
        : 'Registration successful. Please verify your phone with OTP.',
      user,
      requiresVerification: true,
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    
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
