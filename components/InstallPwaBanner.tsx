"use client";

import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt';
import { Button } from '@/components/ui/button';
import { Download, Smartphone } from 'lucide-react';

export default function InstallPwaBanner() {
  const { installPromptEvent, handleInstallClick } = usePwaInstallPrompt();

  // If the install prompt event isn't available, this component renders nothing.
  if (!installPromptEvent) {
    return null;
  }

  // If the prompt is available, we render the banner.
  return (
    <div className="w-full max-w-2xl mx-auto rounded-xl bg-brand-secondary/10 p-6 sm:p-8 border-2 border-dashed border-brand-cta/30 mt-12">
      <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-6">
        
        <div className="flex-shrink-0 flex h-16 w-16 items-center justify-center rounded-full bg-brand-cta/10">
          <Smartphone className="h-8 w-8 text-brand-cta" />
        </div>

        <div className="flex-1">
          <h2 className="font-serif text-2xl font-bold text-brand-text">
            A Tip for Next Time
          </h2>
          <p className="mt-2 text-brand-text/70">
            For easy one-tap access, you can add RestoreClick to your Home Screen. It works just like a regular app!
          </p>
        </div>

        <div className="w-full sm:w-auto mt-4 sm:mt-0 sm:ml-auto">
          <Button
            onClick={handleInstallClick}
            className="w-full bg-brand-cta hover:bg-brand-cta/90 text-white text-base font-bold py-3 px-6"
          >
            <Download className="h-5 w-5 mr-2" />
            Add to Home Screen
          </Button>
        </div>
      </div>
    </div>
  );
}
