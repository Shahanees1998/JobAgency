"use client";
import type { Page } from "@/types/index";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Password } from "primereact/password";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";

const NewPassword: Page = () => {
    const router = useRouter();

    return (
        <>
            <AuthSplitLayout>
                <div className="border-1 surface-border surface-card border-round py-7 px-4 md:px-7 shadow-2">
                    <div className="mb-4">
                        <div className="text-900 text-xl font-bold mb-2">
                            New Password
                        </div>
                        <span className="text-600 font-medium">
                            Enter your new password
                        </span>
                    </div>
                    <div className="flex flex-column">
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-lock z-2"></i>
                            <Password
                                id="password"
                                className="w-full"
                                type="text"
                                inputClassName="w-full"
                                placeholder="Password"
                                toggleMask
                                inputStyle={{ paddingLeft: "2.5rem" }}
                            />
                        </span>
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-lock z-2"></i>
                            <Password
                                id="password2"
                                className="w-full"
                                type="text"
                                inputClassName="w-full"
                                placeholder="Repeat Password"
                                toggleMask
                                feedback={false}
                                inputStyle={{ paddingLeft: "2.5rem" }}
                            />
                        </span>
                        <div className="flex flex-wrap gap-2 justify-content-between">
                            <Button
                                label="Cancel"
                                outlined
                                className="flex-auto"
                                onClick={() => router.push("/")}
                            ></Button>
                            <Button
                                label="Submit"
                                className="flex-auto"
                                onClick={() => router.push("/")}
                            ></Button>
                        </div>
                    </div>
                </div>
            </AuthSplitLayout>
        </>
    );
};

export default NewPassword;
