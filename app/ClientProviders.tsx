'use client';

import ClientOnly from '@/components/ClientOnly';
import { PrimeReactProvider } from 'primereact/api';
import React from 'react';
import { LayoutProvider } from '../layout/context/layoutcontext';
import { Providers } from './providers';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <PrimeReactProvider>
        <ClientOnly>
          <LayoutProvider>{children}</LayoutProvider>
        </ClientOnly>
      </PrimeReactProvider>
    </Providers>
  );
}

