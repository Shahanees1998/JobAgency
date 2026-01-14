"use client";
import type { Page } from "@/types/index";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { InputText } from "primereact/inputtext";
import { useContext, useState, Suspense, useEffect, useRef } from "react";
import { LayoutContext } from "../../../../layout/context/layoutcontext";
import { useAuth } from "@/hooks/useAuth";
import { Toast } from "primereact/toast";
import { getDefaultRedirectPath } from "@/lib/rolePermissions";
import Image from "next/image";

const LoginContent = () => {
    const [rememberMe, setRememberMe] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const { layoutConfig } = useContext(LayoutContext);
    const { user, login, loading: authLoading } = useAuth();
    const toast = useRef<Toast>(null);
    const dark = layoutConfig.colorScheme !== "light";
    const [showPassword, setShowPassword] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const hasRedirectedRef = useRef(false);

    // Redirect if already logged in (using useEffect to avoid setState during render)
    useEffect(() => {
        console.log('🔄 [LOGIN PAGE] Redirect check:', {
            authLoading,
            hasUser: !!user,
            userId: user?.id,
            redirecting,
            loading,
            hasRedirected: hasRedirectedRef.current,
        });
        
        // Only redirect once and only if auth is fully loaded AND user exists
        if (!authLoading && user && user.id && !redirecting && !loading && !hasRedirectedRef.current) {
            console.log('✅ [LOGIN PAGE] Conditions met, preparing redirect...');
            
            let callbackUrl = searchParams.get('callbackUrl') || getDefaultRedirectPath(user.role);
            
            // If callbackUrl is /admin but user is not ADMIN, use default path for their role
            if (callbackUrl === '/admin' && user.role !== 'ADMIN') {
                console.log('⚠️ [LOGIN PAGE] User is not ADMIN, using default path for role:', user.role);
                callbackUrl = getDefaultRedirectPath(user.role);
            }
            
            // If redirecting back to login (for CANDIDATE/EMPLOYER), don't redirect
            if (callbackUrl.startsWith('/auth/login')) {
                console.log('ℹ️ [LOGIN PAGE] Default path is login page, staying on page');
                return; // Don't redirect, stay on login page
            }
            
            console.log('🔄 [LOGIN PAGE] Redirecting to:', callbackUrl);
            hasRedirectedRef.current = true;
            setRedirecting(true);
            
            // Use a longer delay to ensure all state is stable
            const redirectTimer = setTimeout(() => {
                if (hasRedirectedRef.current) { // Double check
                    console.log('🚀 [LOGIN PAGE] Executing redirect to:', callbackUrl);
                    window.location.replace(callbackUrl);
                }
            }, 300);
            
            return () => clearTimeout(redirectTimer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, redirecting, loading, authLoading]); // Only depend on stable values

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex justify-content-center align-items-center">
                <div className="text-center">
                    <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    // Show redirecting only if we have a user and are redirecting
    if (user && user.id && (redirecting || (!loading))) {
        return (
            <div className="min-h-screen flex justify-content-center align-items-center">
                <div className="text-center">
                    <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
                    <p>Redirecting...</p>
                </div>
            </div>
        );
    }

    const handleLogin = async () => {
        // Clear previous errors
        setEmailError("");
        setPasswordError("");

        // Validate inputs
        let hasError = false;
        if (!email) {
            setEmailError("Email is required");
            hasError = true;
        } else if (!email.includes('@')) {
            setEmailError("Please enter a valid email address");
            hasError = true;
        }

        if (!password) {
            setPasswordError("Password is required");
            hasError = true;
        }

        if (hasError) {
            return;
        }

        setLoading(true);
        console.log('🔐 [LOGIN PAGE] Starting login...');
        try {
            const loggedInUser = await login(email, password);
            console.log('✅ [LOGIN PAGE] Login successful:', {
                userId: loggedInUser?.id,
                email: loggedInUser?.email,
                role: loggedInUser?.role,
            });
            
            if (!loggedInUser || !loggedInUser.id) {
                console.error('❌ [LOGIN PAGE] No user data after login');
                throw new Error('Failed to get user data after login');
            }
            
            // Small delay to ensure cookies are set and user state is updated
            console.log('⏳ [LOGIN PAGE] Waiting for cookies to propagate...');
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Get redirect URL - but check if user has access to admin routes
            let callbackUrl = searchParams.get('callbackUrl');
            
            // If callbackUrl is /admin but user is not ADMIN, use default path for their role
            if (callbackUrl === '/admin' && loggedInUser.role !== 'ADMIN') {
                console.log('⚠️ [LOGIN PAGE] User is not ADMIN, using default path for role:', loggedInUser.role);
                callbackUrl = getDefaultRedirectPath(loggedInUser.role);
            } else if (!callbackUrl) {
                callbackUrl = getDefaultRedirectPath(loggedInUser.role);
            }
            
            console.log('🔄 [LOGIN PAGE] Preparing redirect to:', callbackUrl, 'for role:', loggedInUser.role);
            
            // If redirecting back to login (for CANDIDATE/EMPLOYER), don't redirect - just show message
            if (callbackUrl.startsWith('/auth/login')) {
                console.log('ℹ️ [LOGIN PAGE] Redirecting to login page with message, staying on page');
                // Extract message from URL if present
                const url = new URL(callbackUrl, window.location.origin);
                const message = url.searchParams.get('message');
                if (message) {
                    toast.current?.show({
                        severity: 'info',
                        summary: 'Dashboard Coming Soon',
                        detail: 'Your dashboard is under development. Please contact admin for access.',
                        life: 5000
                    });
                }
                setLoading(false);
                return; // Don't redirect, stay on login page
            }
            
            // Mark as redirected to prevent loop
            hasRedirectedRef.current = true;
            setRedirecting(true);
            
            // Force immediate redirect - this will cause a full page reload
            // This ensures cookies are set and page reloads with new auth state
            console.log('🚀 [LOGIN PAGE] Executing redirect to:', callbackUrl);
            window.location.replace(callbackUrl);
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'An unexpected error occurred. Please try again.';

            if (error instanceof Error) {
                errorMessage = error.message;
                if (error.message === 'Invalid email or password') {
                    setPasswordError('Invalid email or password');
                } else if (error.message === 'No account found with this email address') {
                    setEmailError('No account found with this email address');
                } else if (error.message === 'Incorrect password') {
                    setPasswordError('Incorrect password');
                } else if (error.message === 'Account is not active. Please contact admin.') {
                    errorMessage = 'Account is not active. Please contact admin.';
                } else if (error.message.includes('Only admin users can access')) {
                    errorMessage = 'Only admin users can access this panel. Please contact administrator.';
                    setEmailError('Admin access required');
                }
            }

            toast.current?.show({
                severity: 'error',
                summary: 'Login Failed',
                detail: errorMessage,
                life: 5000
            });
            setLoading(false);
        }
    };

    return (
        <>
            <Toast ref={toast} />
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1600 800"
                className="fixed left-0 top-0 min-h-screen min-w-screen"
                preserveAspectRatio="none"
            >
                <rect
                    fill={dark ? "var(--primary-900)" : "var(--primary-500)"}
                    width="1600"
                    height="800"
                />
                <path
                    fill={dark ? "var(--primary-800)" : "var(--primary-400)"}
                    d="M478.4 581c3.2 0.8 6.4 1.7 9.5 2.5c196.2 52.5 388.7 133.5 593.5 176.6c174.2 36.6 349.5 29.2 518.6-10.2V0H0v574.9c52.3-17.6 106.5-27.7 161.1-30.9C268.4 537.4 375.7 554.2 478.4 581z"
                />
                <path
                    fill={dark ? "var(--primary-700)" : "var(--primary-300)"}
                    d="M181.8 259.4c98.2 6 191.9 35.2 281.3 72.1c2.8 1.1 5.5 2.3 8.3 3.4c171 71.6 342.7 158.5 531.3 207.7c198.8 51.8 403.4 40.8 597.3-14.8V0H0v283.2C59 263.6 120.6 255.7 181.8 259.4z"
                />
                <path
                    fill={dark ? "var(--primary-600)" : "var(--primary-200)"}
                    d="M454.9 86.3C600.7 177 751.6 269.3 924.1 325c208.6 67.4 431.3 60.8 637.9-5.3c12.8-4.1 25.4-8.4 38.1-12.9V0H288.1c56 21.3 108.7 50.6 159.7 82C450.2 83.4 452.5 84.9 454.9 86.3z"
                />
                <path
                    fill={dark ? "var(--primary-500)" : "var(--primary-100)"}
                    d="M1397.5 154.8c47.2-10.6 93.6-25.3 138.6-43.8c21.7-8.9 43-18.8 63.9-29.5V0H643.4c62.9 41.7 129.7 78.2 202.1 107.4C1020.4 178.1 1214.2 196.1 1397.5 154.8z"
                />
            </svg>
            <div className="min-h-screen flex justify-content-center align-items-center">
                <div className="border-1 surface-border surface-card border-round py-7 px-4 md:px-7 z-1">
                    <div className="mb-4">
                        <div style={{ display: 'flex', alignItems: 'center' }} className="app-logo flex items-center justify-content-center gap-3">
                            <Image 
                                src="/images/logo.png" 
                                alt="JobPortal Logo" 
                                width={50} 
                                height={50}
                                priority
                            />
                            <div style={{ fontSize: '2rem' }}>|</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontStyle: 'italic' }}>Admin</div>
                        </div>
                        <div className="text-900 text-xl font-bold mb-2 mt-4">
                            Log in
                        </div>
                        <span className="text-600 font-medium">
                            Please enter your details
                        </span>
                    </div>
                    <div className="flex flex-column">
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-envelope"></i>
                            <InputText
                                id="email"
                                type="email"
                                className={`w-full md:w-25rem ${emailError ? 'p-invalid' : ''}`}
                                placeholder="Email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError("");
                                }}
                                disabled={loading}
                            />
                        </span>
                        {emailError && (
                            <small className="p-error block mb-3">{emailError}</small>
                        )}
                        <div style={{ position: "relative" }} className="w-full mb-4">
                            <InputText
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className={`w-full md:w-25rem ${passwordError ? 'p-invalid' : ''}`}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (passwordError) setPasswordError("");
                                }}
                                disabled={loading}
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                style={{ paddingRight: "2.5rem" }}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword((v) => !v)}
                                style={{
                                    position: "absolute",
                                    right: "0.75rem",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 0,
                                    zIndex: 2,
                                }}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                <i className={`pi ${showPassword ? "pi-eye-slash" : "pi-eye"}`}></i>
                            </button>
                        </div>
                        {passwordError && (
                            <small className="p-error block mb-3">{passwordError}</small>
                        )}
                        <div className="mb-4 flex flex-wrap gap-3 align-items-center">
                            {/* <div className="flex align-items-center">
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={e => setRememberMe(e.target.checked)}
                                    disabled={loading}
                                    className="mr-2"
                                />
                                <label
                                    htmlFor="rememberMe"
                                    className="text-900 font-medium mr-8 mb-0"
                                    style={{ verticalAlign: 'middle' }}
                                >
                                    Remember Me
                                </label>
                            </div> */}
                            <a
                                className="text-600 cursor-pointer hover:text-primary ml-auto transition-colors transition-duration-300"
                                onClick={() => router.push('/auth/forgotpassword')}
                            >
                                Reset password
                            </a>
                        </div>
                        <Button
                            label={loading || authLoading ? "Logging In..." : "Log In"}
                            className="w-full mb-4"
                            onClick={handleLogin}
                            loading={loading || authLoading}
                            disabled={loading || authLoading}
                        ></Button>
                       <div className="text-center">
                           <span className="font-medium text-600">
                               Don't have an account?{" "}
                               <a
                                   className="font-semibold cursor-pointer text-900 hover:text-primary transition-colors transition-duration-300"
                                   onClick={() => router.push('/auth/register')}
                               >
                                   Sign Up
                               </a>
                           </span>
                       </div>
                       <div className="text-center mt-3">
                           <span className="font-medium text-600">
                               New to the platform?{" "}
                               <a
                                   className="font-semibold cursor-pointer text-900 hover:text-primary transition-colors transition-duration-300"
                                   onClick={() => router.push('/auth/register')}
                               >
                                   Register Here
                               </a>
                           </span>
                       </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const Login: Page = () => {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex justify-content-center align-items-center">
                <div className="text-center">
                    <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
                    <p>Loading...</p>
                </div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
};

export default Login;
