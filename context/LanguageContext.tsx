'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';

const STORAGE_KEY = 'admin-locale';

export type Locale = 'en' | 'es';

type Messages = Record<string, unknown>;

function getNested(obj: Messages, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const messagesMap: Record<Locale, Messages> = {
  en: enMessages as Messages,
  es: esMessages as Messages,
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === 'en' || stored === 'es') setLocaleState(stored);
    } catch (_) {}
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = next === 'es' ? 'es' : 'en';
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = locale === 'es' ? 'es' : 'en';
    }
  }, [locale, mounted]);

  const t = useCallback(
    (key: string): string => {
      const messages = messagesMap[locale];
      if (!messages) return key;
      const value = getNested(messages, key);
      return value ?? key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
