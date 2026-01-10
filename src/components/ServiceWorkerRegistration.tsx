'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register service worker in production
    if (
      process.env.NODE_ENV === 'production' &&
      typeof window !== 'undefined' && 
      'serviceWorker' in navigator
    ) {
      window.addEventListener('load', () => {
        // basePath is handled by Next.js for all assets
        const basePath = '/cardgames';
        navigator.serviceWorker.register(`${basePath}/sw.js`).then(
          (registration) => {
            console.log('ServiceWorker registration successful');
          },
          (err) => {
            console.log('ServiceWorker registration failed: ', err);
          }
        );
      });
    } else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Unregister service workers in development
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  return null;
}
