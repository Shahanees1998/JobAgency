import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// IMPORTANT: This route must be evaluated per-request (cookies-based redirect).
// Otherwise, some deployments may cache the "logged out" redirect and keep sending users to /auth/login.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  // Check if user is authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  // Debug (server logs). Do NOT log full tokens.
  console.log('🏠 [ROOT /] Request:', {
    hasAccessToken: !!token,
    tokenPrefix: token ? `${token.slice(0, 16)}...` : null,
  });

  // If we have a token cookie, let middleware enforce validity/role on /admin.
  // This avoids root getting "stuck" and guarantees / always forwards logged-in users to /admin.
  if (token) {
    console.log('🏠 [ROOT /] Token cookie present, redirecting to /admin');
    redirect('/admin');
  }

  console.log('🏠 [ROOT /] No token, redirecting to /auth/login');
  redirect('/auth/login');
} 