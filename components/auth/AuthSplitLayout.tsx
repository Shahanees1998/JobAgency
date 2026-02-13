"use client";

import React from "react";
import Image from "next/image";

// Professional job agency / recruitment style image (team, workspace, hiring)
const AUTH_IMAGE_URL =
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80";

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="auth-split-root flex min-h-screen w-full">
            <div
                className="auth-split-form flex flex-1 flex-column align-items-center justify-content-center py-6 px-4 md:px-8 text-white"
                style={{ backgroundColor: "#111827" }}
            >
                <div className="w-full max-w-md">
                    <div className="auth-logo-wrap flex justify-content-center mb-5">
                        <Image
                            src="/images/logo.png"
                            alt="NextJob"
                            width={320}
                            height={128}
                            priority
                            className="auth-form-logo"
                        />
                    </div>
                    {children}
                </div>
            </div>
            <div
                className="auth-split-image hidden lg:flex flex-1 relative overflow-hidden"
                style={{
                    backgroundImage: `url(${AUTH_IMAGE_URL})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    minHeight: "100vh",
                }}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(17,24,39,0.75) 0%, rgba(17,24,39,0.4) 100%)",
                    }}
                />
                <div className="relative z-1 flex flex-column justify-content-end p-6 text-white auth-split-image-text">
                    <p className="auth-split-image-title font-semibold mb-2">
                        Job Agency Dashboard
                    </p>
                    <p className="text-white-alpha-90 auth-split-image-desc line-height-3 m-0">
                        Manage candidates, employers, and placements in one
                        place.
                    </p>
                </div>
            </div>
        </div>
    );
}
