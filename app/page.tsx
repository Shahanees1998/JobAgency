import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AuthService } from "@/lib/auth";

export default async function Home() {
  // Check if user is authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (token) {
    try {
      // Verify token and get user role
      const payload = await AuthService.verifyToken(token);
      
      // Redirect based on role
      if (payload.role === 'ADMIN') {
        redirect('/admin');
      } else if (payload.role === 'EMPLOYER') {
        // TODO: Redirect to employer dashboard when implemented
        redirect('/admin');
      } else if (payload.role === 'CANDIDATE') {
        // TODO: Redirect to candidate dashboard when implemented
        redirect('/admin');
      } else {
        redirect('/auth/login');
      }
    } catch (error) {
      // Token invalid, redirect to login
      redirect('/auth/login');
    }
  } else {
    // No token, redirect to login
    redirect('/auth/login');
  }
} 