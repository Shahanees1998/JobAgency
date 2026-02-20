"use client";
import type { Page } from "@/types/index";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { useLanguage } from "@/context/LanguageContext";

const LockScreen: Page = () => {
    const router = useRouter();
    const { t } = useLanguage();

    return (
        <>
            <AuthSplitLayout>
                <div className="border-1 surface-border surface-card border-round py-7 px-4 md:px-7 shadow-2">
                    <div className="mb-6 flex flex-column align-items-center">
                        <div className="text-900 text-xl font-bold mb-2">
                            {t("auth.screenLocked")}
                        </div>
                        <span className="text-600 font-medium mb-5">
                            {t("auth.pleaseEnterPassword")}
                        </span>
                        <img
                            src="/layout/images/avatar/avatar.png"
                            className="w-3rem h-3rem mb-2"
                            alt="Avatar"
                        />
                        <span className="font-medium text-900 font-medium">
                            Isabella Andolini
                        </span>
                    </div>
                    <div className="flex flex-column">
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-lock"></i>
                            <InputText
                                id="password"
                                type="password"
                                className="w-full"
                                placeholder={t("auth.passwordPlaceholder")}
                            />
                        </span>
                        <Button
                            icon="pi pi-lock-open"
                            label={t("auth.unlock")}
                            className="w-full"
                            onClick={() => router.push("/")}
                        ></Button>
                    </div>
                </div>
            </AuthSplitLayout>
        </>
    );
};

export default LockScreen;
