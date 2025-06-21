"use client";

import { useConnectionStatus } from '@/lib/context/ConnectionStatusContext';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OfflineOverlay() {
  const isOnline = useConnectionStatus();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render anything during SSR
  if (!isClient) {
    return null;
  }

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          // This div covers the entire screen and blocks interaction with the app
          className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-background bg-opacity-95 backdrop-blur-sm"
        >
          <div className="text-center p-8">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-text/10">
              <WifiOff className="h-10 w-10 text-brand-text/60" />
            </div>

            <h1 className="font-serif text-3xl font-bold text-brand-text">
              You Appear to Be Offline
            </h1>
            
            <p className="mt-4 text-lg text-brand-text/70">
              Please reconnect to the internet to continue using RestoreClick.
            </p>
            
            <p className="mt-2 text-sm text-brand-text/60">
              RestoreClick requires an internet connection to restore your precious memories.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
