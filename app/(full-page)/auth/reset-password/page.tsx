"use client";
import type { Page } from "@/types/index";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { useContext, useState, useRef, useEffect, Suspense } from "react";
import { LayoutContext } from "../../../../layout/context/layoutcontext";
import { Toast } from "primereact/toast";

const ResetPasswordContent = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [tokenValid, setTokenValid] = useState(false);
    const [token, setToken] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { layoutConfig } = useContext(LayoutContext);
    const toast = useRef<Toast>(null);
    const dark = layoutConfig.colorScheme !== "light";

    useEffect(() => {
        const tokenParam = searchParams.get('token');
        if (tokenParam) {
            setToken(tokenParam);
            // Validate token
            validateToken(tokenParam);
        } else {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid reset link',
                life: 3000
            });
            router.push('/auth/login');
        }
    }, [searchParams]);

    const validateToken = async (resetToken: string) => {
        try {
            const response = await fetch('/api/auth/validate-reset-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: resetToken }),
            });

            if (response.ok) {
                setTokenValid(true);
            } else {
                const data = await response.json();
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.error || 'Invalid or expired reset link',
                    life: 4000
                });
                router.push('/auth/login');
            }
        } catch (error) {
            console.error('Token validation error:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to validate reset link',
                life: 4000
            });
            router.push('/auth/login');
        }
    };

    const validatePassword = (password: string) => {
        if (password.length < 6) {
            return "Password must be at least 6 characters long";
        }
        if (password.length > 128) {
            return "Password must be less than 128 characters";
        }
        return "";
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setPassword(value);
        if (passwordError) setPasswordError("");
        
        // Clear confirm password error if passwords now match
        if (confirmPassword && value === confirmPassword && confirmPasswordError) {
            setConfirmPasswordError("");
        }
    };

    const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setConfirmPassword(value);
        if (confirmPasswordError) setConfirmPasswordError("");
    };

    const handleSubmit = async () => {
        // Clear previous errors
        setPasswordError("");
        setConfirmPasswordError("");

        // Validate password
        const passwordValidation = validatePassword(password);
        if (passwordValidation) {
            setPasswordError(passwordValidation);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: passwordValidation,
                life: 4000
            });
            return;
        }

        // Validate confirm password
        if (!confirmPassword) {
            setConfirmPasswordError("Please confirm your password");
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Please confirm your password',
                life: 4000
            });
            return;
        }

        if (password !== confirmPassword) {
            setConfirmPasswordError("Passwords do not match");
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Passwords do not match',
                life: 4000
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    token,
                    password 
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Password reset successfully. You can now log in with your new password.',
                    life: 5000
                });
                setTimeout(() => {
                    router.push('/auth/login');
                }, 2000);
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.error || 'Failed to reset password',
                    life: 4000
                });
            }
        } catch (error) {
            console.error('Reset password error:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'An unexpected error occurred',
                life: 4000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleSubmit();
        }
    };

    if (!tokenValid) {
        return (
            <div className="px-5 min-h-screen flex justify-content-center align-items-center">
                <div className="text-center">
                    <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
                    <p>Validating reset link...</p>
                </div>
            </div>
        );
    }

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
            <div className="min-h-screen flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="border-1 surface-border surface-card border-round py-7 px-4 md:px-7 z-1">
                    <div className="mb-4">
                        <div style={{ display: 'flex', alignItems: 'center' }} className="app-logo flex items-center justify-content-center gap-3 mb-4">
                            <img src="/images/logo.png" alt="JobPortal Logo" style={{ width: '50px' }} />
                          </div>
                        <div className="text-900 text-xl font-bold mb-2">
                            Reset Password
                        </div>
                        <span className="text-600 font-medium">
                            Enter your new password
                        </span>
                    </div>
                    <div className="flex flex-column">
                        <div style={{ position: "relative" }} className="w-full mb-4">
                            <InputText
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className={`w-full md:w-25rem ${passwordError ? 'p-invalid' : ''}`}
                                placeholder="New Password"
                                value={password}
                                onChange={handlePasswordChange}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
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
                        <div style={{ position: "relative" }} className="w-full mb-4">
                            <InputText
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                className={`w-full md:w-25rem ${confirmPasswordError ? 'p-invalid' : ''}`}
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={handleConfirmPasswordChange}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
                                style={{ paddingRight: "2.5rem" }}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowConfirmPassword((v) => !v)}
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
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                <i className={`pi ${showConfirmPassword ? "pi-eye-slash" : "pi-eye"}`}></i>
                            </button>
                        </div>
                        {confirmPasswordError && (
                            <small className="p-error block mb-3">{confirmPasswordError}</small>
                        )}
                        <div className="flex flex-wrap gap-2 justify-content-between">
                            <Button
                                label="Cancel"
                                outlined
                                className="flex-auto"
                                onClick={() => router.push("/auth/login")}
                                disabled={loading}
                            ></Button>
                            <Button
                                label={loading ? "Resetting..." : "Reset Password"}
                                className="flex-auto"
                                onClick={handleSubmit}
                                loading={loading}
                                disabled={loading}
                            ></Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const ResetPassword: Page = () => {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex justify-content-center align-items-center">
                <div className="text-center">
                    <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
                    <p>Loading...</p>
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
};

export default ResetPassword; 