'use client';

import React, { createContext, useContext, useRef, useEffect } from 'react';
import { Toast } from 'primereact/toast';

interface ToastContextType {
  showToast: (severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = useRef<Toast>(null);

  const showToast = (severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  // Listen for global API errors
  useEffect(() => {
    const handleApiError = (event: CustomEvent) => {
      const { error, type } = event.detail;
      
      if (type === 'auth') {
        // Authentication errors - show brief message before redirect
        showToast('error', 'Session Expired', 'Please log in again to continue.');
      } else {
        // General errors
        showToast('error', 'Error', error);
      }
    };

    // Listen for API error events
    window.addEventListener('api-error', handleApiError as EventListener);
    
    return () => {
      window.removeEventListener('api-error', handleApiError as EventListener);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Toast ref={toast} />
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
