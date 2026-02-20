"use client";
import type { Page } from "@/types/index";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { useState, Suspense, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Toast } from "primereact/toast";
import { getDefaultRedirectPath } from "@/lib/rolePermissions";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { useLanguage } from "@/context/LanguageContext";

const LoginContent = () => {
    const { t, locale, setLocale } = useLanguage();
    const [rememberMe, setRememberMe] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, login, loading: authLoading } = useAuth();
    const toast = useRef<Toast>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const hasRedirectedRef = useRef(false);

    // Redirect if already logged in (using useEffect to avoid setState during render)
    useEffect(() => {
        const callbackParam = searchParams.get('callbackUrl');
        console.log('🔄 [LOGIN PAGE] Redirect check:', {
            authLoading,
            hasUser: !!user,
            userId: user?.id,
            role: user?.role,
            redirecting,
            loading,
            hasRedirected: hasRedirectedRef.current,
            callbackUrlParam: callbackParam,
        });
        
        // Only redirect once and only if auth is fully loaded AND user exists
        if (!authLoading && user && user.id && !redirecting && !loading && !hasRedirectedRef.current) {
            console.log('✅ [LOGIN PAGE] Conditions met, preparing redirect...');
            
            let callbackUrl = callbackParam || getDefaultRedirectPath(user.role);
            
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

            // Debug: if we're still on the login page after a while, log state
            const stuckTimer = setTimeout(() => {
                console.warn('⚠️ [LOGIN PAGE] Still on login after redirect attempt', {
                    pathname: window.location.pathname,
                    callbackUrl,
                    hasUser: !!user?.id,
                    role: user?.role,
                    redirecting: true,
                    hasRedirected: hasRedirectedRef.current,
                });
            }, 2500);
            
            return () => {
                clearTimeout(redirectTimer);
                clearTimeout(stuckTimer);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, redirecting, loading, authLoading]); // Only depend on stable values

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex justify-content-center align-items-center">
                <div className="text-center">
                    <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
                    <p>{t("common.loading")}</p>
                </div>
            </div>
        );
    }

    // Show redirecting only if we have a user and are redirecting
    if (user && user.id && redirecting) {
        return (
            <div className="min-h-screen flex justify-content-center align-items-center">
                <div className="text-center">
                    <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
                    <p>{t("auth.redirecting")}</p>
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
            setEmailError(t("auth.emailRequired"));
            hasError = true;
        } else if (!email.includes('@')) {
            setEmailError(t("auth.validEmail"));
            hasError = true;
        }

        if (!password) {
            setPasswordError(t("auth.passwordRequired"));
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
                        summary: t('auth.dashboardComingSoon'),
                        detail: t('auth.dashboardUnderDevelopment'),
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
            let errorMessage = t('auth.unexpectedError');

            if (error instanceof Error) {
                errorMessage = error.message;
                if (error.message === 'Invalid email or password') {
                    setPasswordError(t('auth.invalidCredentials'));
                } else if (error.message === 'No account found with this email address') {
                    setEmailError(t('auth.noAccountFound'));
                } else if (error.message === 'Incorrect password') {
                    setPasswordError(t('auth.incorrectPassword'));
                } else if (error.message === 'Account is not active. Please contact admin.') {
                    errorMessage = t('auth.accountInactive');
                } else if (error.message.includes('Only admin users can access')) {
                    errorMessage = t('auth.onlyAdminAccess');
                    setEmailError(t('auth.adminAccessRequired'));
                }
            }

            toast.current?.show({
                severity: 'error',
                summary: t('auth.loginFailed'),
                detail: errorMessage,
                life: 5000
            });
            setLoading(false);
        }
    };

    return (
        <>
            <Toast ref={toast} />
            <AuthSplitLayout>
                <div className="auth-form-content">
                    <div className="flex justify-content-end align-items-center gap-2 mb-3">
                        <button
                            type="button"
                            className={`p-button p-button-text p-button-rounded text-white ${locale === 'en' ? 'font-semibold opacity-100' : 'opacity-70'}`}
                            onClick={() => setLocale('en')}
                            aria-label="English"
                        >
                            EN
                        </button>
                        <span className="text-white-alpha-70">|</span>
                        <button
                            type="button"
                            className={`p-button p-button-text p-button-rounded text-white ${locale === 'es' ? 'font-semibold opacity-100' : 'opacity-70'}`}
                            onClick={() => setLocale('es')}
                            aria-label="Español"
                        >
                            ES
                        </button>
                    </div>
                    <div className="mb-4">
                        <h1 className="text-2xl font-bold mb-2 text-white m-0">
                            {t("auth.loginTitle")}
                        </h1>
                        <span className="text-white-alpha-90 font-medium text-lg">
                            {t("auth.pleaseEnterDetails")}
                        </span>
                    </div>
                    <div className="flex flex-column">
                        <span className="p-input-icon-left w-full mb-4 auth-input-wrap">
                            <i className="pi pi-envelope"></i>
                            <InputText
                                id="email"
                                type="email"
                                className={`w-full ${emailError ? 'p-invalid' : ''}`}
                                placeholder={t("auth.emailPlaceholder")}
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
                        <div className="auth-password-wrap w-full mb-4">
                            <InputText
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className={`w-full auth-password-input ${passwordError ? 'p-invalid' : ''}`}
                                placeholder={t("auth.passwordPlaceholder")}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (passwordError) setPasswordError("");
                                }}
                                disabled={loading}
                                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                className="auth-password-toggle"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
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
                                className="text-white-alpha-90 cursor-pointer hover:text-white ml-auto transition-colors transition-duration-300 text-lg"
                                onClick={() => router.push('/auth/forgotpassword')}
                            >
                                {t("auth.resetPassword")}
                            </a>
                        </div>
                        <Button
                            label={loading || authLoading ? t("auth.loggingIn") : t("auth.logIn")}
                            className="w-full mb-4"
                            onClick={handleLogin}
                            loading={loading || authLoading}
                            disabled={loading || authLoading}
                        ></Button>
                    </div>
                </div>
            </AuthSplitLayout>
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
