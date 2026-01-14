import { Metadata } from "next";

interface MainLayoutProps {
    children: React.ReactNode;
}

export const metadata: Metadata = {
    title: "JobPortal Admin",
    description:
        "Administrative dashboard for JobPortal community management",
    robots: { index: false, follow: false },
    openGraph: {
        type: "website",
        title: "JobPortal Admin",
        url: "https://www.jobportal.com",
        description:
            "Administrative dashboard for JobPortal community management",
        images: ["https://www.jobportal.com/images/logo.png"],
        ttl: 604800,
    },
    icons: {
        icon: "/favicon.ico",
    },
};

export default function MainLayout({ children }: MainLayoutProps) {
    return <div>{children}</div>;
}
