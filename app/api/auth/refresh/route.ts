import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getAuthCookieOptions } from '@/lib/authCookieOptions';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const refreshToken = request.cookies.get('refresh_token')?.value || null;
    
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
    const baseCookieOptions = getAuthCookieOptions(request);
    // Set new access token in cookie
    response.cookies.set('access_token', newAccessToken, {
      ...baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
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