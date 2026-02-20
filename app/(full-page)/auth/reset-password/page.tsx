"use client";
import type { Page } from "@/types/index";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { useState, useRef, useEffect, Suspense } from "react";
import { Toast } from "primereact/toast";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { useLanguage } from "@/context/LanguageContext";

const ResetPasswordContent = () => {
    const { t } = useLanguage();
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
    const toast = useRef<Toast>(null);

    useEffect(() => {
        const tokenParam = searchParams.get('token');
        if (tokenParam) {
            setToken(tokenParam);
            // Validate token
            validateToken(tokenParam);
        } else {
            toast.current?.show({
                severity: 'error',
                summary: t('common.error'),
                detail: t('auth.invalidResetLink'),
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
                    summary: t('common.error'),
                    detail: data.error || t('auth.invalidOrExpiredResetLink'),
                    life: 4000
                });
                router.push('/auth/login');
            }
        } catch (error) {
            console.error('Token validation error:', error);
            toast.current?.show({
                severity: 'error',
                summary: t('common.error'),
                detail: t('auth.failedToValidateResetLink'),
                life: 4000
            });
            router.push('/auth/login');
        }
    };

    const validatePassword = (pwd: string) => {
        if (pwd.length < 6) {
            return t("auth.passwordMinLength");
        }
        if (pwd.length > 128) {
            return t("auth.passwordMaxLength");
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
            setConfirmPasswordError(t("auth.pleaseConfirmPassword"));
            toast.current?.show({
                severity: 'error',
                summary: t('common.error'),
                detail: t('auth.pleaseConfirmPassword'),
                life: 4000
            });
            return;
        }

        if (password !== confirmPassword) {
            setConfirmPasswordError(t("auth.passwordsDoNotMatch"));
            toast.current?.show({
                severity: 'error',
                summary: t('common.error'),
                detail: t('auth.passwordsDoNotMatch'),
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
                    summary: t('common.success'),
                    detail: t('auth.passwordResetSuccess'),
                    life: 5000
                });
                setTimeout(() => {
                    router.push('/auth/login');
                }, 2000);
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: t('common.error'),
                    detail: data.error || t('auth.failedToResetPassword'),
                    life: 4000
                });
            }
        } catch (error) {
            console.error('Reset password error:', error);
            toast.current?.show({
                severity: 'error',
                summary: t('common.error'),
                detail: t('auth.unexpectedError'),
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
            <AuthSplitLayout>
                <div className="flex justify-content-center align-items-center py-8">
                    <div className="text-center">
                        <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
                        <p>{t("auth.validatingResetLink")}</p>
                    </div>
                </div>
            </AuthSplitLayout>
        );
    }

    return (
        <>
            <Toast ref={toast} />
            <AuthSplitLayout>
                <div className="border-1 surface-border surface-card border-round py-7 px-4 md:px-7 shadow-2">
                    <div className="mb-4">
                        <div className="text-900 text-xl font-bold mb-2">
                            {t("auth.resetPasswordTitle")}
                        </div>
                        <span className="text-600 font-medium">
                            {t("auth.enterNewPassword")}
                        </span>
                    </div>
                    <div className="flex flex-column">
                        <div className="auth-password-wrap w-full mb-4">
                            <InputText
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className={`w-full auth-password-input ${passwordError ? 'p-invalid' : ''}`}
                                placeholder={t("auth.newPasswordPlaceholder")}
                                value={password}
                                onChange={handlePasswordChange}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
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
                        <div className="auth-password-wrap w-full mb-4">
                            <InputText
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                className={`w-full auth-password-input ${confirmPasswordError ? 'p-invalid' : ''}`}
                                placeholder={t("auth.confirmNewPasswordPlaceholder")}
                                value={confirmPassword}
                                onChange={handleConfirmPasswordChange}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                className="auth-password-toggle"
                                onClick={() => setShowConfirmPassword((v) => !v)}
                                aria-label={showConfirmPassword ? t("common.hidePassword") : t("common.showPassword")}
                            >
                                <i className={`pi ${showConfirmPassword ? "pi-eye-slash" : "pi-eye"}`}></i>
                            </button>
                        </div>
                        {confirmPasswordError && (
                            <small className="p-error block mb-3">{confirmPasswordError}</small>
                        )}
                        <div className="flex flex-wrap gap-2 justify-content-between">
                            <Button
                                label={t("common.cancel")}
                                outlined
                                className="flex-auto"
                                onClick={() => router.push("/auth/login")}
                                disabled={loading}
                            ></Button>
                            <Button
                                label={loading ? t("auth.resetting") : t("auth.resetPasswordTitle")}
                                className="flex-auto"
                                onClick={handleSubmit}
                                loading={loading}
                                disabled={loading}
                            ></Button>
                        </div>
                    </div>
                </div>
            </AuthSplitLayout>
        </>
    );
};

const ResetPassword: Page = () => {
    const { t } = useLanguage();
    return (
        <Suspense fallback={
            <div className="min-h-screen flex justify-content-center align-items-center">
                <div className="text-center">
                    <i className="pi pi-spinner pi-spin text-4xl mb-3"></i>
                    <p>{t("common.loading")}</p>
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
};

export default ResetPassword; 