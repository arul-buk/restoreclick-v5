'use client';

import { useEffect } from 'react';

// Extend the Window interface to include service worker types
declare global {
  interface Window {
    workbox: any; // You can define a more specific type if needed
  }
}

// This component registers the service worker for PWA functionality
const PWAServiceWorkerRegister = () => {
  useEffect(() => {
    // Only run on the client side and in production
    if (
      typeof window !== 'undefined' && 
      'serviceWorker' in navigator && 
      process.env.NODE_ENV === 'production'
    ) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          
          // Check for updates
          if (registration.waiting) {
            console.log('Service Worker already installed');
            return;
          }

          // Check for updates when a new service worker is installing
          if (registration.installing) {
            console.log('Service Worker installing');
            return;
          }

          // Check for updates when a new service worker is waiting
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New content is available; please refresh.');
                  // You could show a notification to the user here
                }
              });
            }
          });

          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        } catch (error) {
          console.error('ServiceWorker registration failed: ', error);
        }
      };

      // Register service worker after the page has loaded
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker);
      }
    }
  }, []);

  return null; // This component doesn't render anything
};

export default PWAServiceWorkerRegister;
