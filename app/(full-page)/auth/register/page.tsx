"use client";
import type { Page } from "@/types/index";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Toast } from "primereact/toast";
import { useState, useRef } from "react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { useLanguage } from "@/context/LanguageContext";

const Register: Page = () => {
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: ''
    });
    const router = useRouter();
    const toast = useRef<Toast>(null);
    const { t } = useLanguage();

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const showToast = (severity: "success" | "error" | "warn" | "info", summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const handleRegister = async () => {
        if (!confirmed) {
            showToast("warn", t("common.warning"), t("auth.acceptTerms"));
            return;
        }

        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
            showToast("error", t("common.error"), t("profile.fillAllFields"));
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                showToast("success", "Success", data.message);
                setTimeout(() => {
                    router.push('/auth/login');
                }, 2000);
            } else {
                showToast("error", "Error", data.error);
            }
        } catch (error) {
            showToast("error", t("common.error"), t("auth.unexpectedError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <AuthSplitLayout>
                <div className="border-1 surface-border surface-card border-round py-7 px-4 md:px-7 shadow-2">
                    <div className="mb-4">
                        <div className="text-900 text-xl font-bold mb-2">
                            {t("auth.registerTitle")}
                        </div>
                        <span className="text-600 font-medium">
                            {t("auth.letsGetStarted")}
                        </span>
                    </div>
                    <div className="flex flex-column">
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-user"></i>
                            <InputText
                                id="firstName"
                                type="text"
                                className="w-full"
                                placeholder={t("auth.firstName")}
                                value={formData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                            />
                        </span>
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-user"></i>
                            <InputText
                                id="lastName"
                                type="text"
                                className="w-full"
                                placeholder={t("auth.lastName")}
                                value={formData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                            />
                        </span>
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-envelope"></i>
                            <InputText
                                id="email"
                                type="email"
                                className="w-full"
                                placeholder={t("auth.emailPlaceholder")}
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                            />
                        </span>
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-phone"></i>
                            <InputText
                                id="phone"
                                type="tel"
                                className="w-full"
                                placeholder={t("auth.phoneOptional")}
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                            />
                        </span>
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-lock z-2"></i>
                            <Password
                                id="password"
                                type="password"
                                className="w-full"
                                inputClassName="w-full"
                                placeholder={t("auth.passwordPlaceholder")}
                                toggleMask
                                inputStyle={{ paddingLeft: "2.5rem" }}
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                            />
                        </span>
                        <div className="mb-4 flex flex-wrap">
                            <Checkbox
                                name="checkbox"
                                checked={confirmed}
                                onChange={(e) =>
                                    setConfirmed(e.checked ?? false)
                                }
                                className="mr-2"
                            ></Checkbox>
                            <label
                                htmlFor="checkbox"
                                className="text-900 font-medium mr-2"
                            >
                                {t("auth.readTerms")}
                            </label>
                            <a className="text-600 cursor-pointer hover:text-primary cursor-pointer">
                                {t("auth.termsAndConditions")}
                            </a>
                        </div>
                        <Button
                            label={t("auth.signUp")}
                            className="w-full mb-4"
                            onClick={handleRegister}
                            loading={loading}
                            disabled={loading}
                        ></Button>
                        <span className="font-medium text-600">
                            {t("auth.alreadyHaveAccount")}{" "}
                            <a 
                                className="font-semibold cursor-pointer text-900 hover:text-primary transition-colors transition-duration-300"
                                onClick={() => router.push('/auth/login')}
                            >
                                {t("auth.signIn")}
                            </a>
                        </span>
                    </div>
                </div>
            </AuthSplitLayout>
            <Toast ref={toast} />
        </>
    );
};

export default Register;
