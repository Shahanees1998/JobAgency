import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const refreshToken = AuthService.getRefreshTokenFromCookies();
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    // Generate new access token
    const newAccessToken = await AuthService.refreshAccessToken(refreshToken);

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
    });
    const isProd = process.env.NODE_ENV === 'production';
    // Set new access token in cookie
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Clear invalid tokens
    const response = NextResponse.json(
      { error: 'Invalid refresh token' },
      { status: 401 }
    );
    
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    
    return response;
  }
} 