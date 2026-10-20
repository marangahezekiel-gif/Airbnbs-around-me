'use client';

import { useEffect } from 'react';

/** Registers /sw.js in production so the app is installable and works offline. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('Service worker registration failed', err);
    });
  }, []);

  return null;
}
