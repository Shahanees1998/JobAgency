"use client";

import { AuthProvider } from "@/hooks/useAuth";
import { ReactNode } from "react";
import { ToastProvider } from "@/store/toast.context";
import ClientOnly from "@/components/ClientOnly";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ClientOnly>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ClientOnly>
    </AuthProvider>
  );
} 