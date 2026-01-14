'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

declare global {
  interface Window {
    OneSignal?: any;
  }
}

export default function OneSignalInit() {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) {
      console.warn('NEXT_PUBLIC_ONESIGNAL_APP_ID is not set');
      return;
    }

    // Dynamically load OneSignal SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.OneSignal = window.OneSignal || [];
      window.OneSignal.push(function () {
        window.OneSignal.isPushNotificationsEnabled(function (isEnabled: boolean) {
          if (!isEnabled) {
            // Request permission if not already granted
            window.OneSignal.showNativePrompt?.();
          }
        });
      });

      window.OneSignal.push(function () {
        window.OneSignal.init({
          appId: appId,
          allowLocalhostAsSecureOrigin: true,
        });

        // Relay foreground notifications to app UI
        window.OneSignal.Notifications?.addEventListener('foregroundWillDisplay', (event: any) => {
          const detail = {
            title: event?.notification?.title,
            body: event?.notification?.body,
            heading: event?.notification?.title,
            content: event?.notification?.body,
            data: event?.notification?.additionalData,
          };
          window.dispatchEvent(new CustomEvent('push-notification', { detail }));
        });

        // Fallback for other SDK versions
        window.OneSignal.Notifications?.addEventListener('notificationDisplay', (event: any) => {
          const n = event?.notification;
          const detail = {
            title: n?.title,
            body: n?.body,
            heading: n?.title,
            content: n?.body,
            data: n?.additionalData,
          };
          window.dispatchEvent(new CustomEvent('push-notification', { detail }));
        });
      });
    };

    return () => {
      try {
        document.head.removeChild(script);
      } catch {}
    };
  }, []);

  // Keep external user id in sync
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.OneSignal && user?.id) {
        window.OneSignal.setExternalUserId(user.id);
      }
    } catch (e) {
      console.warn('OneSignal setExternalUserId failed:', e);
    }
  }, [user?.id]);

  return null;
}

