import type { NextRequest } from 'next/server';

type SameSite = 'lax' | 'strict' | 'none';

function getForwardedProto(req: NextRequest): string | null {
  const h = req.headers.get('x-forwarded-proto');
  if (!h) return null;
  // Can be "https" or "https,http"
  return h.split(',')[0]?.trim() || null;
}

export function isSecureRequest(req: NextRequest): boolean {
  const forwarded = getForwardedProto(req);
  if (forwarded) return forwarded === 'https';
  // Fallback: nextUrl protocol (may be "http:" behind proxies)
  return req.nextUrl.protocol === 'https:';
}

export function getAuthCookieOptions(req: NextRequest): {
  httpOnly: true;
  secure: boolean;
  sameSite: SameSite;
  path: '/';
} {
  // For this app, web UI and API are same-origin, so Lax is correct and avoids
  // Secure+SameSite=None issues on HTTP deployments / misconfigured proxies.
  const secure = isSecureRequest(req);
  const sameSite: SameSite = 'lax';
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
}

