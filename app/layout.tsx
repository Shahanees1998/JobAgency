import { ClientProviders } from './ClientProviders';

import "primeflex/primeflex.css";
import "primeicons/primeicons.css";
import "primereact/resources/primereact.css";
import "../styles/demo/Demos.scss";
import "../styles/globals.scss";
import "../styles/layout/layout.scss";
import "../styles/theme.css";
interface RootLayoutProps {
    children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <title>JobPortal Admin - Community Management System</title>
                <meta name="description" content="Administrative dashboard for JobPortal community management" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/images/logo.png" type="image/png" />
                <link rel="apple-touch-icon" href="/images/logo.png" />
            </head>
            <body>
                <ClientProviders>{children}</ClientProviders>
            </body>
        </html>
    );
}
