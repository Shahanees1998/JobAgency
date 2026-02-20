"use client";
import type { Page } from "@/types/index";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { useState, useRef } from "react";
import { Toast } from "primereact/toast";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { useLanguage } from "@/context/LanguageContext";

const ForgotPassword: Page = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [emailError, setEmailError] = useState("");
    const router = useRouter();
    const toast = useRef<Toast>(null);
    const { t } = useLanguage();

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async () => {
        // Clear previous errors
        setEmailError("");

        // Validate email
        if (!email) {
            setEmailError(t("auth.emailRequired"));
            toast.current?.show({
                severity: 'error',
                summary: t("common.error"),
                detail: t("auth.enterYourEmail"),
                life: 3000
            });
            return;
        }

        if (!validateEmail(email)) {
            setEmailError(t("auth.validEmail"));
            toast.current?.show({
                severity: 'error',
                summary: t("common.error"),
                detail: t("auth.validEmail"),
                life: 3000
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitted(true);
                toast.current?.show({
                    severity: 'success',
                    summary: t("common.success"),
                    detail: data.message || t("auth.resetEmailSent"),
                    life: 5000
                });
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: t("common.error"),
                    detail: data.error || t("auth.failedToSendReset"),
                    life: 4000
                });
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            toast.current?.show({
                severity: 'error',
                summary: t("common.error"),
                detail: t("auth.unexpectedError"),
                life: 4000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);
        if (emailError) setEmailError("");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleSubmit();
        }
    };

    return (
        <>
            <Toast ref={toast} />
            <AuthSplitLayout>
                <div className="auth-form-content">
                    <div className="mb-4">
                        <h1 className="text-2xl font-bold mb-2 text-white m-0">
                            {t("auth.forgotPasswordTitle")}
                        </h1>
                        <span className="text-white-alpha-90 font-medium">
                            {submitted
                                ? t("auth.checkEmailForReset")
                                : t("auth.enterEmailToReset")
                            }
                        </span>
                    </div>
                    {!submitted ? (
                        <div className="flex flex-column">
                            <span className="p-input-icon-left w-full mb-4 auth-input-wrap">
                                <i className="pi pi-envelope"></i>
                                <InputText
                                    id="email"
                                    type="email"
                                    className={`w-full ${emailError ? "p-invalid" : ""}`}
                                    placeholder={t("auth.enterYourEmail")}
                                    value={email}
                                    onChange={handleEmailChange}
                                    onKeyPress={handleKeyPress}
                                    disabled={loading}
                                    autoFocus
                                />
                            </span>
                            {emailError && (
                                <small className="p-error block mb-3">{emailError}</small>
                            )}
                            <div className="flex flex-column gap-2 mb-2">
                                <Button
                                    label={loading ? "..." : t("auth.sendResetLink")}
                                    className="w-full mb-2"
                                    onClick={handleSubmit}
                                    loading={loading}
                                    disabled={loading}
                                ></Button>
                                <Button
                                    label={t("auth.backToLogin")}
                                    outlined
                                    className="w-full auth-btn-outlined"
                                    onClick={() => router.push("/auth/login")}
                                    disabled={loading}
                                ></Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-column">
                            <div className="text-center mb-4">
                                <i className="pi pi-check-circle text-6xl text-green-400 mb-3"></i>
                                <p className="text-white-alpha-90 mb-2">
                                    {t("auth.checkEmailForReset")} <strong className="text-white">{email}</strong>
                                </p>
                                <p className="text-white-alpha-70 text-sm mt-2">
                                    The link will expire in 1 hour for security reasons.
                                </p>
                            </div>
                            <div className="flex flex-column gap-2">
                                <Button
                                    label={t("auth.backToLogin")}
                                    className="w-full mb-2"
                                    onClick={() => router.push("/auth/login")}
                                ></Button>
                                <Button
                                    label={t("auth.resendEmail")}
                                    outlined
                                    className="w-full auth-btn-outlined"
                                    onClick={() => {
                                        setSubmitted(false);
                                        setEmail("");
                                    }}
                                ></Button>
                            </div>
                        </div>
                    )}
                </div>
            </AuthSplitLayout>
        </>
    );
};

export default ForgotPassword;
