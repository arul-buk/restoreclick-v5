"use client";

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// Create the context with a default value
const ConnectionStatusContext = createContext<boolean>(true);

// Create a custom hook for easy access to the context value
export const useConnectionStatus = () => {
  return useContext(ConnectionStatusContext);
};

// Create the Provider component that will wrap our app
export const ConnectionStatusProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side after hydration
    setIsClient(true);
    
    // Set the initial state from the navigator object
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // During SSR or before client hydration, assume online
  const connectionStatus = isClient ? isOnline : true;

  return (
    <ConnectionStatusContext.Provider value={connectionStatus}>
      {children}
    </ConnectionStatusContext.Provider>
  );
};
