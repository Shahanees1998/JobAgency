'use client';

import ClientOnly from '@/components/ClientOnly';
import { PrimeReactProvider } from 'primereact/api';
import React from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import { LayoutProvider } from '../layout/context/layoutcontext';
import { Providers } from './providers';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <PrimeReactProvider>
        <ClientOnly>
          <LanguageProvider>
            <LayoutProvider>{children}</LayoutProvider>
          </LanguageProvider>
        </ClientOnly>
      </PrimeReactProvider>
    </Providers>
  );
}

