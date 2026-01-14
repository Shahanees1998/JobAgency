import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  status: string;
  profileImage?: string;
  profileImagePublicId?: string;
  lastLogin?: string;
  isPasswordChanged?: boolean;
  createdAt?: string;
  updatedAt?: string;
  hotelId?: string;
  hotelSlug?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount (only once)
  const hasCheckedAuthRef = useRef(false);
  useEffect(() => {
    console.log('🔄 [useAuth] useEffect triggered, hasChecked:', hasCheckedAuthRef.current);
    if (!hasCheckedAuthRef.current) {
      hasCheckedAuthRef.current = true;
      console.log('🚀 [useAuth] Calling checkAuth on mount');
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (!user) return;

    // Refresh token every 6 hours (before the 7-day expiry)
    const refreshInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          console.warn('Token refresh failed, user may need to re-login');
          // Don't logout immediately, let the next API call handle it
        }
      } catch (error) {
        console.error('Token refresh error:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Refresh token when user returns to the tab
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });

          if (!response.ok) {
            console.warn('Token refresh on visibility change failed');
          }
        } catch (error) {
          console.error('Token refresh on visibility change error:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const isCheckingAuthRef = useRef(false);
  const checkAuth = async () => {
    // Prevent multiple simultaneous checks
    if (isCheckingAuthRef.current) {
      console.log('⏸️ [useAuth] Already checking auth, skipping...');
      return;
    }
    
    console.log('🔍 [useAuth] Starting auth check...');
    isCheckingAuthRef.current = true;
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Include cookies
        cache: 'no-store', // Prevent caching
      });
      
      console.log('📡 [useAuth] Auth check response:', {
        status: response.status,
        ok: response.ok,
        url: response.url,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📡 [useAuth] Auth check data:', {
          success: data.success,
          hasUser: !!data.user,
          userId: data.user?.id,
        });
        
        if (data.success && data.user) {
          console.log('✅ [useAuth] Setting user:', data.user.id);
          setUser(data.user);
        } else {
          console.log('❌ [useAuth] No user in response, clearing user');
          setUser(null);
        }
      } else {
        console.log('❌ [useAuth] Response not OK, clearing user');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ [useAuth] Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
      isCheckingAuthRef.current = false;
      console.log('✅ [useAuth] Auth check completed');
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client': 'admin-web',
        },
        credentials: 'include', // CRITICAL: Include cookies in request/response
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const loginData = await response.json();
      console.log('Login response:', { success: loginData.success, hasUser: !!loginData.user });
      
      // Use user data directly from login response (cookies are set by server in response headers)
      if (loginData.success && loginData.user && loginData.user.id) {
        // Set user state immediately
        setUser(loginData.user);
        console.log('User set from login response:', loginData.user.id);
        return loginData.user;
      }

      // Fallback: Wait a moment for cookies to propagate, then verify with /api/auth/me
      console.log('Waiting for cookies to propagate...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const userResponse = await fetch('/api/auth/me', {
        credentials: 'include', // Include cookies
        cache: 'no-store',
      });
      
      console.log('Auth check after login:', userResponse.status, userResponse.ok);
      
      if (userResponse.ok) {
        const data = await userResponse.json();
        if (data.success && data.user) {
          setUser(data.user);
          console.log('User set from /api/auth/me:', data.user.id);
          return data.user;
        }
      }
      
      throw new Error('Failed to get user data after login');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear user state
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protected routes
export function useRequireAuth() {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login if not authenticated
      window.location.href = '/auth/login';
    }
  }, [user, loading]);

  return { user, loading, logout };
}

// Hook for admin-only routes
export function useRequireAdmin() {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to login if not authenticated
        window.location.href = '/auth/login';
      } else if (user.role !== 'ADMIN') {
        // Redirect to access denied if not admin
        window.location.href = '/auth/access';
      }
    }
  }, [user, loading]);

  return { user, loading, logout };
} 