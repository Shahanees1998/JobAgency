import { Kanit } from "next/font/google";
import { ClientProviders } from "./ClientProviders";

import "primeflex/primeflex.css";
import "primeicons/primeicons.css";
import "primereact/resources/primereact.css";
import "../styles/demo/Demos.scss";
import "../styles/globals.scss";
import "../styles/layout/layout.scss";
import "../styles/theme.css";
import "../styles/font-kanit.css";

const kanit = Kanit({
    weight: ["300", "400", "500"],
    subsets: ["latin", "thai"],
    display: "swap",
    variable: "--font-kanit",
});

export const metadata = {
    title: "JobPortal Admin - Community Management System",
    description: "Administrative dashboard for JobPortal community management",
};

interface RootLayoutProps {
    children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${kanit.variable} ${kanit.className}`}
        >
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" href="/images/logo.png" type="image/png" sizes="32x32" />
                <link rel="apple-touch-icon" href="/images/logo.png" />
                {/* Fallback so "Kanit" loads if next/font variable is not set */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <ClientProviders>{children}</ClientProviders>
            </body>
        </html>
    );
}
