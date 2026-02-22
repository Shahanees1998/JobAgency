import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || '7b537c24d1f5b2a460c4b3f88ad3e78b2f7462d49a9d9a93c3c86b48a211bc39'
);

const ACCESS_TOKEN_EXPIRY = '7d'; // 7 days
const REFRESH_TOKEN_EXPIRY = '30d'; // 30 days

/** Minimal claims stored in JWT to keep token small and avoid REQUEST_HEADER_TOO_LARGE (494) */
export interface JWTClaims {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/** Full payload shape for backward compatibility; token now only contains JWTClaims */
export interface JWTPayload extends JWTClaims {
  firstName?: string;
  lastName?: string;
  status?: string;
  membershipNumber?: string;
  profileImage?: string;
  profileImagePublicId?: string;
  phone?: string;
  joinDate?: Date;
  paidDate?: Date;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string; // Can be email or phone
  password: string;
}

export class AuthService {
  /**
   * Generate access token (minimal payload to avoid REQUEST_HEADER_TOO_LARGE)
   */
  static async generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    const minimal: Pick<JWTPayload, 'userId' | 'email' | 'role'> = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    return await new SignJWT(minimal)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_EXPIRY)
      .sign(JWT_SECRET);
  }

  /**
   * Generate refresh token (minimal payload to keep size small)
   */
  static async generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    const minimal: Pick<JWTPayload, 'userId' | 'email' | 'role'> = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    return await new SignJWT(minimal)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(REFRESH_TOKEN_EXPIRY)
      .sign(JWT_SECRET);
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return payload as unknown as JWTPayload; // may only have userId, email, role
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Decode JWT token without verification (for getting payload from expired tokens)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return decodeJwt(token) as unknown as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Authenticate user with email and password
   */
  static async authenticateUser(credentials: LoginCredentials): Promise<AuthTokens> {
    const { email, password } = credentials;

    // Find user by email or phone
    console.log('🔍 [AUTH] Looking for user with:', { email, hasPassword: !!password });
    
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone: email }, // Allow phone as login identifier
        ],
      },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        isDeleted: true,
        profileImage: true,
        profileImagePublicId: true,
        lastLogin: true,
        isPasswordChanged: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('🔍 [AUTH] User lookup result:', {
      found: !!user,
      email: user?.email,
      role: user?.role,
      status: user?.status,
      isDeleted: user?.isDeleted,
      hasPassword: !!user?.password,
    });

    if (!user) {
      console.log('❌ [AUTH] User not found');
      throw new Error('Invalid email or password');
    }

    if (user.isDeleted) {
      console.log('❌ [AUTH] User is deleted');
      throw new Error('Account has been deleted. Please contact admin.');
    }

    if (user.status === 'DEACTIVATED') {
      console.log('❌ [AUTH] User is deactivated');
      throw new Error('Account has been deactivated. Please contact admin.');
    }
    
    // Allow PENDING status for EMPLOYER role (they need to login to see their pending status)
    // Other roles must be ACTIVE
    if (user.status !== 'ACTIVE' && !(user.status === 'PENDING' && user.role === 'EMPLOYER')) {
      console.log('❌ [AUTH] User status check failed:', { status: user.status, role: user.role });
      throw new Error('Account is not active. Please contact admin.');
    }

    // Verify password
    console.log('🔐 [AUTH] Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('🔐 [AUTH] Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ [AUTH] Invalid password');
      throw new Error('Invalid email or password');
    }
    
    console.log('✅ [AUTH] Authentication successful:', { userId: user.id, email: user.email, role: user.role });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
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
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const payload = await this.verifyToken(refreshToken);
      return await this.generateAccessToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      });
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get token from request (supports both cookies and headers)
   */
  static getTokenFromRequest(req: NextRequest): string | null {
    // First try to get from Authorization header (for mobile clients)
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Then try to get from cookies (for web clients)
    const token = req.cookies.get('access_token')?.value;
    return token || null;
  }

  /**
   * Set authentication cookies
   */
  static setAuthCookies(accessToken: string, refreshToken: string) {
    const cookieStore = cookies();
    
    // Set access token as HTTP-only cookie
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    // Set refresh token as HTTP-only cookie
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    });
  }

  /**
   * Clear authentication cookies
   */
  static clearAuthCookies() {
    const cookieStore = cookies();
    
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
  }

  /**
   * Get refresh token from cookies
   */
  static getRefreshTokenFromCookies(): string | null {
    const cookieStore = cookies();
    return cookieStore.get('refresh_token')?.value || null;
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

} 